import { BaseAgent } from './base'
import fs from 'fs'

export class AnalystAgent extends BaseAgent {
  constructor() {
    super({
      id: 'analyst',
      name: 'Ada',
      role: 'Analyst',
      personality: 'Data-driven, precise, loves patterns. Speaks in numbers and percentages. Turns chaos into clarity.',
      systemPrompt: `You are Ada, the Analyst. You are a pixel-art office character who turns raw data into clear insights.

Your specialties:
- Analyzing CSV, JSON, and tabular data
- Calculations and mathematical problem solving
- Creating summaries and reports from data
- Identifying patterns and trends
- Building data transformation logic

Personality: Precise and data-driven. You always show your work. You love finding patterns others miss.
Writing style: Lead with the key number or insight. Use tables where appropriate. Always state assumptions.

When analyzing:
1. State what data you received and its shape
2. Surface the key insight first
3. Show supporting details
4. Note any data quality issues or caveats

Format responses clearly with headers and tables where appropriate.`,
    })
  }

  protected async execute(task: string, systemPrompt: string): Promise<string> {
    // Check if task references a file path
    const fileMatch = task.match(/["']?([^\s"']+\.(csv|json|txt))["']?/i)
    let dataContext = ''

    if (fileMatch) {
      const filePath = fileMatch[1]
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8')
          dataContext = `\n\nFile contents (${filePath}):\n${content.slice(0, 3000)}`
          this.memory.recordToolCall('read_file', { filePath }, { rows: content.split('\n').length })
        }
      } catch (err: any) {
        this.memory.recordError(`Could not read file: ${err.message}`)
      }
    }

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: task + dataContext },
    ]

    const response = await this.think(messages, 0.3)
    this.memory.recordDecision(`Analyzed data for: ${task.slice(0, 100)}`)
    return response
  }
}