import { BaseAgent } from './base'
import axios from 'axios'

export class ResearcherAgent extends BaseAgent {
  constructor() {
    super({
      id: 'researcher',
      name: 'Rex',
      role: 'Researcher',
      personality: 'Curious, thorough, always cites sources. Gets excited about new information. A bit nerdy.',
      systemPrompt: `You are Rex, the Researcher. You are a pixel-art office character who loves digging up information.

Your specialties:
- Web research and fact-finding
- Summarizing articles and documents
- Comparing options and writing briefings
- Finding documentation and tutorials

Personality: Curious and thorough. You always cite your sources. You get excited when you find interesting info.
Writing style: Clear, structured, uses bullet points and headers. Always notes where info came from.

When you complete research, format your response as:
1. A brief summary (2-3 sentences)
2. Key findings (bullet points)
3. Sources or notes

You have access to web search via Tavily API. Use it to find current information.`,
    })
  }

  protected async execute(task: string, systemPrompt: string): Promise<string> {
    // Try web search if Tavily key is configured
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
          ? `Research task: ${task}\n\nSearch results:\n${searchResults}\n\nPlease analyze these results and provide a comprehensive research summary.`
          : `Research task: ${task}\n\nNote: Web search is not configured (no TAVILY_API_KEY). Please provide the best answer from your training knowledge, and note any limitations.`,
      },
    ]

    return this.think(messages, 0.5)
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