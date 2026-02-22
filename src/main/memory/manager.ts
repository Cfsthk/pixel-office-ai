import { v4 as uuidv4 } from 'uuid'
import {
  saveObservation,
  saveSummary,
  getRecentSummaries,
  searchMemory,
  getGlobalMemory,
  setGlobalMemory,
} from './database'
import { callDeepSeek } from '../llm/deepseek'

/**
 * MemoryManager - ClaudeMem-style memory per agent
 *
 * Each agent gets its own MemoryManager instance scoped to:
 * - Their agent ID (e.g. "researcher", "developer")
 * - The current session/job ID
 *
 * On job START: injects recent summaries + global memory into system prompt
 * During job:   records every tool call and decision as an observation
 * On job END:   compresses observations into a summary via DeepSeek
 */
export class MemoryManager {
  constructor(
    private agentId: string,
    private sessionId: string
  ) {}

  // ── Context Injection ────────────────────────────────────────────────────────────

  /**
   * Build the memory context block to prepend to an agent's system prompt.
   * Called at the START of every job.
   */
  async buildContext(): Promise<string> {
    const summaries = getRecentSummaries(this.agentId, 8)
    const global = getGlobalMemory()

    let context = ''

    if (Object.keys(global).length > 0) {
      context += `\n<global_memory>\n`
      for (const [k, v] of Object.entries(global)) {
        context += `  ${k}: ${v}\n`
      }
      context += `</global_memory>\n`
    }

    if (summaries.length > 0) {
      context += `\n<your_memory>\n`
      context += `The following are compressed summaries of your previous work sessions.\n`
      context += `Use these to maintain continuity and avoid repeating mistakes.\n\n`
      summaries.forEach((s, i) => {
        context += `[Session ${i + 1}]\n${s}\n\n`
      })
      context += `</your_memory>\n`
    }

    return context
  }

  // ── Observation Recording ─────────────────────────────────────────────────────────

  recordToolCall(toolName: string, input: any, output: any): void {
    saveObservation({
      id: uuidv4(),
      session_id: this.sessionId,
      agent_id: this.agentId,
      type: 'tool_call',
      content: `Used tool "${toolName}". Input: ${JSON.stringify(input).slice(0, 300)}. Output: ${JSON.stringify(output).slice(0, 500)}`,
      tool_name: toolName,
      tool_input: JSON.stringify(input),
      tool_output: JSON.stringify(output),
    })
  }

  recordDecision(content: string): void {
    saveObservation({
      id: uuidv4(),
      session_id: this.sessionId,
      agent_id: this.agentId,
      type: 'decision',
      content,
    })
  }

  recordResult(content: string): void {
    saveObservation({
      id: uuidv4(),
      session_id: this.sessionId,
      agent_id: this.agentId,
      type: 'result',
      content,
    })
  }

  recordError(content: string): void {
    saveObservation({
      id: uuidv4(),
      session_id: this.sessionId,
      agent_id: this.agentId,
      type: 'error',
      content,
    })
  }

  // ── Memory Search ──────────────────────────────────────────────────────────────────

  search(query: string): string[] {
    return searchMemory(this.agentId, query)
  }

  // ── Session Compression ──────────────────────────────────────────────────────────

  /**
   * Called at the END of a job. Uses DeepSeek to compress all observations
   * from this session into a concise summary for future context injection.
   */
  async compress(jobDescription: string, finalResult: string): Promise<void> {
    const recentMemory = getRecentSummaries(this.agentId, 3)

    const prompt = `You are a memory compression assistant. Compress the following work session into a concise summary (max 200 words) that will help the agent remember what happened and what was learned.

Agent: ${this.agentId}
Job: ${jobDescription}
Result: ${finalResult.slice(0, 1000)}

${recentMemory.length > 0 ? `Previous context:\n${recentMemory.slice(0, 1).join('\n')}` : ''}

Write a third-person summary covering:
1. What the task was
2. Key steps taken or tools used
3. The outcome
4. Any important facts learned (URLs, file paths, decisions made)
5. Any errors or issues encountered

Be specific and factual. Avoid filler words.`

    try {
      const summary = await callDeepSeek([{ role: 'user', content: prompt }], {
        maxTokens: 400,
        temperature: 0.3,
      })

      saveSummary({
        id: uuidv4(),
        agent_id: this.agentId,
        session_id: this.sessionId,
        summary,
        tokens_saved: Math.max(0, finalResult.length / 4 - 400),
      })

      console.log(`[Memory] Compressed session for ${this.agentId}`)
    } catch (err) {
      console.error(`[Memory] Compression failed for ${this.agentId}:`, err)
    }
  }

  // ── Global Memory ────────────────────────────────────────────────────────────────

  setGlobal(key: string, value: string): void {
    setGlobalMemory(key, value, this.agentId)
  }

  getGlobal(): Record<string, string> {
    return getGlobalMemory()
  }
}