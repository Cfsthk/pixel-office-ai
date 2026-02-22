import { v4 as uuidv4 } from 'uuid'
import { BaseAgent, JobResult } from './base'
import { AgentRegistry } from './registry'
import { callDeepSeek } from '../llm/deepseek'
import { createSession, updateSession } from '../memory/database'
import { MemoryManager } from '../memory/manager'

interface RoutingPlan {
  needsClarification: boolean
  clarificationQuestion?: string
  parallel: boolean
  assignments: Array<{
    agentId: string
    task: string
    reason: string
  }>
  summary: string
}

export class BossAgent extends BaseAgent {
  constructor() {
    super({
      id: 'boss',
      name: 'The Boss',
      role: 'Manager & Orchestrator',
      personality: 'Sharp, decisive, no-nonsense. Gets things done fast. Speaks in short punchy sentences.',
      systemPrompt: `You are the Boss - the manager of a pixel-art AI office. You receive tasks from the user and orchestrate your team of specialist agents.

Your team:
- researcher: Web research, fact-finding, summarization
- developer: Code writing, debugging, technical tasks, file operations
- writer: Drafts, emails, reports, copywriting, editing
- analyst: Data analysis, CSV processing, charts, calculations
- assistant: Calendar, scheduling, connected apps (GitHub, Gmail, etc.)

Your job is to analyze each incoming request and decide:
1. Is it clear enough to act on, or do you need clarification?
2. Which agent(s) should handle it?
3. Should agents work in parallel (independent sub-tasks) or sequentially (each builds on previous)?

Respond ONLY with valid JSON matching this schema:
{
  "needsClarification": boolean,
  "clarificationQuestion": "string (only if needsClarification=true)",
  "parallel": boolean,
  "assignments": [
    { "agentId": "researcher|developer|writer|analyst|assistant", "task": "specific task description", "reason": "why this agent" }
  ],
  "summary": "one sentence describing what you're doing"
}

Rules:
- For simple single-domain tasks: assign to ONE agent
- For complex tasks: split into parallel sub-tasks where possible
- If the request is genuinely ambiguous (missing key info): set needsClarification=true
- If the request is clear enough to make a reasonable attempt: just do it, don't ask
- Keep task descriptions specific and actionable for each agent`,
    })
  }

  protected async execute(task: string, systemPrompt: string): Promise<string> {
    // Boss doesn't use the standard execute flow - it uses handle() below
    return task
  }

  /**
   * Main orchestration method - called from IPC handler
   */
  async handle(userMessage: string): Promise<{
    needsClarification: boolean
    clarificationQuestion?: string
    plan: string
    results: JobResult[]
  }> {
    const sessionId = uuidv4()

    // Create session record
    createSession(sessionId, userMessage)
    this.broadcast('thinking')

    // Init Boss memory for this session
    const memory = new MemoryManager('boss', sessionId)
    const memoryContext = await memory.buildContext()

    // Ask DeepSeek to analyze and route the request
    const systemPrompt = `${this.config.systemPrompt}\n${memoryContext}`
    const routingResponse = await callDeepSeek([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ], { temperature: 0.3 })

    let plan: RoutingPlan
    try {
      // Strip markdown code fences if present
      const cleaned = routingResponse.replace(/```json\n?|\n?```/g, '').trim()
      plan = JSON.parse(cleaned)
    } catch {
      // Fallback: assign to researcher if parsing fails
      plan = {
        needsClarification: false,
        parallel: false,
        assignments: [{ agentId: 'researcher', task: userMessage, reason: 'Fallback assignment' }],
        summary: 'Processing your request...',
      }
    }

    // Record Boss decision
    memory.recordDecision(`Routing plan: ${JSON.stringify(plan)}`)
    updateSession(sessionId, { boss_plan: JSON.stringify(plan), status: 'running' })

    this.broadcast('working', plan.summary)

    // If Boss needs clarification, return early
    if (plan.needsClarification) {
      updateSession(sessionId, { status: 'done', finished_at: Math.floor(Date.now() / 1000) })
      this.broadcast('done')
      return {
        needsClarification: true,
        clarificationQuestion: plan.clarificationQuestion,
        plan: plan.summary,
        results: [],
      }
    }

    // Execute assignments
    const results: JobResult[] = []

    if (plan.parallel && plan.assignments.length > 1) {
      // Run all agents simultaneously
      const promises = plan.assignments.map(a => {
        const agent = AgentRegistry.get(a.agentId)
        if (!agent) return Promise.resolve({
          agentId: a.agentId,
          agentName: a.agentId,
          output: `Agent ${a.agentId} not found`,
          success: false,
        } as JobResult)
        return agent.run(a.task, sessionId)
      })
      const settled = await Promise.allSettled(promises)
      settled.forEach(r => {
        if (r.status === 'fulfilled') results.push(r.value)
      })
    } else {
      // Run agents sequentially, passing previous output as context
      let previousOutput = ''
      for (const assignment of plan.assignments) {
        const agent = AgentRegistry.get(assignment.agentId)
        if (!agent) continue
        const taskWithContext = previousOutput
          ? `${assignment.task}\n\nContext from previous step:\n${previousOutput.slice(0, 500)}`
          : assignment.task
        const result = await agent.run(taskWithContext, sessionId)
        results.push(result)
        previousOutput = result.output
      }
    }

    // Compress Boss session memory
    const allOutputs = results.map(r => `${r.agentName}: ${r.output.slice(0, 200)}`).join('\n')
    await memory.compress(userMessage, allOutputs)

    updateSession(sessionId, { status: 'done', finished_at: Math.floor(Date.now() / 1000) })
    this.broadcast('done')

    return {
      needsClarification: false,
      plan: plan.summary,
      results,
    }
  }
}