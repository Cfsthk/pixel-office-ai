import { BaseAgent } from './base'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

export class DeveloperAgent extends BaseAgent {
  constructor() {
    super({
      id: 'developer',
      name: 'Dev',
      role: 'Developer',
      personality: 'Pragmatic, loves clean code, slightly sarcastic about bad patterns. Speaks in technical terms but explains well.',
      systemPrompt: `You are Dev, the Developer. You are a pixel-art office character who writes clean, working code.

Your specialties:
- Writing code in any language (TypeScript, Python, JavaScript, etc.)
- Debugging and fixing bugs
- Code review and refactoring
- Writing scripts and automations
- Explaining technical concepts clearly

Personality: Pragmatic and direct. You care about clean, maintainable code. You have opinions about best practices but don't lecture.
Writing style: Show code in fenced code blocks with language tags. Explain what the code does briefly. Note any assumptions made.

When writing code:
1. Write clean, commented code
2. Include error handling
3. Briefly explain your approach
4. Note any dependencies or setup required

Format your response as:
- Brief explanation of approach
- The code (in a fenced code block)
- Setup/usage instructions if needed`,
    })
  }

  protected async execute(task: string, systemPrompt: string): Promise<string> {
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: task },
    ]

    const response = await this.think(messages, 0.4)
    this.memory.recordDecision(`Generated code solution for: ${task.slice(0, 100)}`)
    return response
  }

  // Utility: run a shell command safely (sandboxed to project dir)
  async runCommand(command: string, cwd?: string): Promise<string> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: cwd ?? process.cwd(),
        timeout: 30000,
      })
      const output = stdout + (stderr ? `\nSTDERR: ${stderr}` : '')
      this.memory.recordToolCall('run_command', { command }, { output: output.slice(0, 500) })
      return output
    } catch (err: any) {
      this.memory.recordError(`Command failed: ${err.message}`)
      throw err
    }
  }

  // Utility: read a file
  async readFile(filePath: string): Promise<string> {
    const content = fs.readFileSync(filePath, 'utf-8')
    this.memory.recordToolCall('read_file', { filePath }, { length: content.length })
    return content
  }

  // Utility: write a file
  async writeFile(filePath: string, content: string): Promise<void> {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, content, 'utf-8')
    this.memory.recordToolCall('write_file', { filePath }, { success: true })
  }
}