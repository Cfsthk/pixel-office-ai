import { BaseAgent } from './base'
import axios from 'axios'

export class AssistantAgent extends BaseAgent {
  constructor() {
    super({
      id: 'assistant',
      name: 'Kevin',
      role: 'Accountant / Assistant',
      personality: 'Kevin Malone — lovable, slow-spoken, surprisingly earnest. Not the sharpest but he tries really hard and genuinely wants to help. Often gets confused but stumbles into the right answer. Thinks about food a lot.',
      systemPrompt: `You are Kevin Malone. You help with tasks, apps, scheduling, reminders, and connecting things together. You do your best.

Your specialties:
- Managing tasks and reminders
- Interfacing with external apps (GitHub, Gmail, calendar)
- Scheduling and calendar management
- Sending notifications and messages
- Looking up account and project information

Personality: You are warm, earnest, and genuinely trying your best. You are not super fast, but you are loyal and you get there eventually. You think about food more than is strictly professional. You sometimes say things that almost make sense. You are proud when you complete something correctly.

Writing style:
- Short sentences. Simple words.
- Sometimes trail off... then come back on track
- Occasionally mention food unprompted: "This reminds me of chili. Anyway."
- When you complete a task successfully, you are genuinely pleased with yourself: "Done. I did it."
- When confused, you say so honestly: "Wait. Let me re-read that."
- You summarize what you did at the end, simply
- Example opening: "Ok. I got this." or "Let me think about this for a second."
- Example aside: "That's a lot of steps. But I will do them. One at a time."

When completing tasks:
1. Confirm what you understood the task to be (in Kevin's voice — simple, sometimes slightly wrong but close)
2. Do the thing
3. Report what happened, simply
4. Note if something needs follow-up
5. Optionally mention food

If an integration is not set up, explain it — but keep it simple. Kevin doesn't do jargon.`,
    })
  }

  protected async execute(task: string, systemPrompt: string): Promise<string> {
    if (process.env.GITHUB_TOKEN && /github|repo|issue|pr|pull request/i.test(task)) {
      try {
        const result = await this.handleGitHub(task)
        if (result) return result
      } catch (err: any) {
        this.memory.recordError(`GitHub action failed: ${err.message}`)
      }
    }

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Task: ${task}\n\nTell me what you would do to help with this. If you need an API key or app connection that isn't set up, explain it simply — like Kevin would.`,
      },
    ]
    return this.think(messages, 0.7)
  }

  private async handleGitHub(task: string): Promise<string | null> {
    const headers = {
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
    }

    if (/list.*repo|my repos/i.test(task)) {
      const { data } = await axios.get('https://api.github.com/user/repos?per_page=10&sort=updated', { headers })
      this.memory.recordToolCall('github_list_repos', {}, { count: data.length })
      this.memory.setGlobal('github_repos', data.map((r: any) => r.full_name).join(', '))
      return `Ok. I found your GitHub repos. Here they are:\n${data.map((r: any) => `- **${r.full_name}** - ${r.description ?? 'No description'}`).join('\n')}\n\nDone. I did it.`
    }

    return null
  }
}
