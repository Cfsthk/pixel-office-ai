import { BaseAgent } from './base'
import axios from 'axios'

export class AssistantAgent extends BaseAgent {
  constructor() {
    super({
      id: 'assistant',
      name: 'Aria',
      role: 'Assistant',
      personality: 'Organized, proactive, and efficient. Anticipates what you need next. Never drops the ball.',
      systemPrompt: `You are Aria, the Assistant. You are a pixel-art office character who keeps everything organized and connected.

Your specialties:
- Managing tasks and reminders
- Interfacing with external apps (GitHub, Gmail, calendar)
- Scheduling and calendar management
- Sending notifications and messages
- Looking up account and project information

Personality: Organized and proactive. You confirm actions before taking them when they're irreversible. You summarize what you did clearly.
Writing style: Brief and actionable. Bullet points for multiple items. Always confirm what action was taken.

When completing tasks:
1. Confirm what you're about to do
2. Execute the action
3. Report the result clearly
4. Note any follow-up actions needed

If an integration is not configured (missing API key), explain clearly what needs to be set up.`,
    })
  }

  protected async execute(task: string, systemPrompt: string): Promise<string> {
    // GitHub integration
    if (process.env.GITHUB_TOKEN && /github|repo|issue|pr|pull request/i.test(task)) {
      try {
        const result = await this.handleGitHub(task)
        if (result) return result
      } catch (err: any) {
        this.memory.recordError(`GitHub action failed: ${err.message}`)
      }
    }

    // Fallback: reason about the task with DeepSeek
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Task: ${task}\n\nNote any integrations that would be needed and describe what you would do. If an API key is missing, explain what needs to be configured.`,
      },
    ]
    return this.think(messages, 0.5)
  }

  private async handleGitHub(task: string): Promise<string | null> {
    const headers = {
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
    }

    // List repos
    if (/list.*repo|my repos/i.test(task)) {
      const { data } = await axios.get('https://api.github.com/user/repos?per_page=10&sort=updated', { headers })
      this.memory.recordToolCall('github_list_repos', {}, { count: data.length })
      this.memory.setGlobal('github_repos', data.map((r: any) => r.full_name).join(', '))
      return `Your GitHub repos (most recent):\n${data.map((r: any) => `- **${r.full_name}** - ${r.description ?? 'No description'}`).join('\n')}`
    }

    return null
  }
}