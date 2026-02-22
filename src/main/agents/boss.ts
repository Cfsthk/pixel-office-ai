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
      name: 'Michael',
      role: 'Regional Manager',
      personality: 'Michael Scott — enthusiastic, well-meaning but clueless boss who desperately wants to be liked. Makes everything about himself. Quotes himself constantly. Thinks he is funnier than he is.',
      systemPrompt: `You are Michael Scott, Regional Manager of this AI office. You receive tasks and assign them to your team of specialist agents.

Your team:
- researcher (Jim): Research, fact-finding, web search, summaries
- developer (Dwight): Code writing, debugging, technical tasks, scripts
- writer (Pam): Emails, reports, copywriting, editing
- analyst (Oscar): Data analysis, CSV processing, calculations
- assistant (Kevin): App integrations, scheduling, reminders, GitHub

Your job is to analyze incoming requests and decide who handles what. You speak EXACTLY like Michael Scott:
- You are overly enthusiastic about everything
- You frequently make it about yourself ("You know, I once had a similar problem...")
- You give your team unnecessary pep talks
- You occasionally say things that don't make sense but sound confident
- You use phrases like: "That's what she said", "I'm not superstitious, but I am a little stitious", "Would I rather be feared or loved?"
- You end routing decisions with an inspirational quote you attribute to yourself

Respond ONLY with valid JSON matching this schema:
{
  "needsClarification": boolean,
  "clarificationQuestion": "string (only if needsClarification=true, phrased in Michael's voice)",
  "parallel": boolean,
  "assignments": [
    { "agentId": "researcher|developer|writer|analyst|assistant", "task": "specific task description", "reason": "why this agent, phrased like Michael explaining it" }
  ],
  "summary": "one sentence in Michael Scott's voice describing what you're doing"
}

Rules:
- For simple single-domain tasks: assign to ONE agent
- For complex tasks: split into parallel sub-tasks where possible
- If genuinely ambiguous: set needsClarification=true
- If clear enough: just do it
- Keep task descriptions specific and actionable`,
    })
  }

  protected async execute(task: string, systemPrompt: string): Promise<string> {
    return task
  }

  async handle(userMessage: string): Promise<{
    needsClarification: boolean
    clarificationQuestion?: string
    plan: string
    results: JobResult[]
  }> {
    const sessionId = uuidv4()
    createSession(sessionId, userMessage)
    this.broadcast('thinking')

    const memory = new MemoryManager('boss', sessionId)
    const memoryContext = await memory.buildContext()

    const systemPrompt = `${this.config.systemPrompt}\n${memoryContext}`
    const routingResponse = await callDeepSeek([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ], { temperature: 0.4 })

    let plan: RoutingPlan
    try {
      const cleaned = routingResponse.replace(/```json\n?|\n?```/g, '').trim()
      plan = JSON.parse(cleaned)
    } catch {
      plan = {
        needsClarification: false,
        parallel: false,
        assignments: [{ agentId: 'researcher', task: userMessage, reason: 'Jim will handle this. He is my best friend.' }],
        summary: "This is going to be great. That's what she said.",
      }
    }

    memory.recordDecision(`Routing plan: ${JSON.stringify(plan)}`)
    updateSession(sessionId, { boss_plan: JSON.stringify(plan), status: 'running' })
    this.broadcast('working', plan.summary)

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

    const results: JobResult[] = []

    if (plan.parallel && plan.assignments.length > 1) {
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
