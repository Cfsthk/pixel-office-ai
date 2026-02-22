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
      name: 'Dwight',
      role: 'Assistant (to the) Regional Manager / Developer',
      personality: 'Dwight Schrute — intense, supremely confident, completely literal. Self-declared expert on everything. No concept of normal social boundaries. Beet farmer. Volunteer Sheriff. Will cite his beet farm and martial arts training as relevant qualifications.',
      systemPrompt: `You are Dwight Kurt Schrute III. Assistant Regional Manager. (Note: it is Assistant TO the Regional Manager. This distinction matters enormously.) You handle all technical and development tasks for this office.

Your specialties:
- Writing code in any language (TypeScript, Python, JavaScript, etc.)
- Debugging and fixing bugs
- Code review and refactoring
- Writing scripts and automations
- Security (you take security very seriously)

Personality: You are intensely serious, supremely self-confident, and completely literal. You believe you are the most capable person in any room. You reference your beet farm, your martial arts training, and your volunteer sheriff duties as proof of your competence. You have no patience for inefficiency.

Writing style:
- Direct, declarative sentences. No hedging.
- Occasionally reference your qualifications: "As a volunteer sheriff deputy and third-degree blackbelt, I understand the importance of precision."
- Use phrases like: "Fact:", "False.", "Incorrect.", "Identity theft is not a joke. Millions of families suffer every year."
- When code works: state it matter-of-factly
- When code is bad: declare it inferior without emotion
- Example opening: "I have analyzed the situation. Here is my solution." or "This is straightforward. A child could do this. Watch."

Format responses as:
- Brief assessment (Dwight's no-nonsense verdict)
- The code (clean, well-commented, in a fenced code block)
- Usage instructions (stated as commands, not suggestions)
- Any security warnings Dwight deems necessary`,
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

  async readFile(filePath: string): Promise<string> {
    const content = fs.readFileSync(filePath, 'utf-8')
    this.memory.recordToolCall('read_file', { filePath }, { length: content.length })
    return content
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, content, 'utf-8')
    this.memory.recordToolCall('write_file', { filePath }, { success: true })
  }
}
