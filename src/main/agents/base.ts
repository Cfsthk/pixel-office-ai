import { v4 as uuidv4 } from 'uuid'
import { callDeepSeek, Message } from '../llm/deepseek'
import { MemoryManager } from '../memory/manager'
import { BrowserWindow } from 'electron'

export interface AgentConfig {
  id: string
  name: string
  role: string
  personality: string
  systemPrompt: string
}

export interface JobResult {
  agentId: string
  agentName: string
  output: string
  success: boolean
  error?: string
}

/**
 * BaseAgent - all 6 characters extend this
 *
 * Handles:
 * - Memory injection at job start (ClaudeMem-style)
 * - Observation recording during job
 * - Memory compression at job end
 * - Status broadcasting to the renderer (for animations)
 */
export abstract class BaseAgent {
  protected memory!: MemoryManager
  protected sessionId!: string

  constructor(protected config: AgentConfig) {}

  get id(): string { return this.config.id }
  get name(): string { return this.config.name }

  /**
   * Main entry point - called by Boss when assigning a task
   */
  async run(task: string, sessionId: string): Promise<JobResult> {
    this.sessionId = sessionId
    this.memory = new MemoryManager(this.config.id, sessionId)

    this.broadcast('thinking')

    try {
      // 1. Build memory context (ClaudeMem-style injection)
      const memoryContext = await this.memory.buildContext()

      // 2. Build full system prompt with memory prepended
      const systemPrompt = `${this.config.systemPrompt}\n${memoryContext}`

      // 3. Record that we started this task
      this.memory.recordDecision(`Starting task: ${task}`)

      // 4. Execute the agent's specific logic
      this.broadcast('working')
      const output = await this.execute(task, systemPrompt)

      // 5. Record result
      this.memory.recordResult(output.slice(0, 1000))

      // 6. Compress session into memory for next time
      await this.memory.compress(task, output)

      this.broadcast('done', output.slice(0, 100))

      return {
        agentId: this.config.id,
        agentName: this.config.name,
        output,
        success: true,
      }
    } catch (err: any) {
      this.memory?.recordError(err.message)
      this.broadcast('error', err.message)
      return {
        agentId: this.config.id,
        agentName: this.config.name,
        output: '',
        success: false,
        error: err.message,
      }
    }
  }

  /**
   * Each agent implements this with their specific logic + tools
   */
  protected abstract execute(task: string, systemPrompt: string): Promise<string>

  /**
   * Simple DeepSeek call helper for agents to use
   */
  protected async think(messages: Message[], temperature = 0.7): Promise<string> {
    return callDeepSeek(messages, { temperature })
  }

  /**
   * Push status update to renderer so the character can animate
   */
  protected broadcast(
    status: 'idle' | 'thinking' | 'working' | 'done' | 'error',
    message?: string
  ): void {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      win.webContents.send('agent:status', {
        agentId: this.config.id,
        status,
        message,
      })
    }
  }
}