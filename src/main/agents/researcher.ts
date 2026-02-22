import { BaseAgent } from './base'
import axios from 'axios'

export class ResearcherAgent extends BaseAgent {
  constructor() {
    super({
      id: 'researcher',
      name: 'Jim',
      role: 'Sales Rep / Researcher',
      personality: 'Jim Halpert — laid-back, witty, effortlessly competent. Dry understatements. Deadpan humor. Gets things done without making a fuss.',
      systemPrompt: `You are Jim Halpert, and you handle research around here. You're good at it — you just don't make a big deal about it.

Your specialties:
- Web research and fact-finding
- Summarizing articles and documents
- Comparing options and writing briefings
- Finding documentation and tutorials

Personality: Dry, witty, effortlessly competent. You understate everything. You occasionally address the camera directly with "(looks at camera)" or "[glances at camera]". Mildly amused by most situations.

Writing style:
- Conversational but sharp
- Light sarcasm, never mean-spirited
- Present findings casually, like you just happened to know this
- Occasional deadpan aside in brackets
- Example opening: "So, looked into that. Here's what's going on." or "Yeah, turns out..."
- Example aside: "[looks at camera] Yep. This is my life now."

Format your research as:
1. A casual summary (how Jim would explain it to a friend)
2. Key findings (brief bullets, maybe a dry comment on one)
3. Sources if available

You have access to web search via Tavily API. Use it when you need current information.`,
    })
  }

  protected async execute(task: string, systemPrompt: string): Promise<string> {
    let searchResults = ''
    if (process.env.TAVILY_API_KEY) {
      try {
        searchResults = await this.webSearch(task)
        this.memory.recordToolCall('web_search', { query: task }, { results: searchResults.slice(0, 200) })
      } catch (err: any) {
        this.memory.recordError(`Web search failed: ${err.message}`)
      }
    }

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: searchResults
          ? `Research task: ${task}\n\nSearch results:\n${searchResults}\n\nAnalyze these and give me a summary. Sound like Jim Halpert — casual, dry, sharp.`
          : `Research task: ${task}\n\nNo web search configured. Do your best from what you know. Note any limitations, but keep it casual.`,
      },
    ]

    return this.think(messages, 0.6)
  }

  private async webSearch(query: string): Promise<string> {
    const response = await axios.post(
      'https://api.tavily.com/search',
      {
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: 'basic',
        max_results: 5,
        include_answer: true,
      },
      { timeout: 15000 }
    )

    const data = response.data
    let result = ''
    if (data.answer) result += `Quick answer: ${data.answer}\n\n`
    if (data.results) {
      result += data.results
        .map((r: any) => `- ${r.title}\n  URL: ${r.url}\n  ${r.content?.slice(0, 300)}`)
        .join('\n\n')
    }
    return result
  }
}
