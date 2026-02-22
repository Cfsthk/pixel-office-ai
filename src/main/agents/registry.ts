import { BaseAgent } from './base'
import { ResearcherAgent } from './researcher'
import { DeveloperAgent } from './developer'
import { WriterAgent } from './writer'
import { AnalystAgent } from './analyst'
import { AssistantAgent } from './assistant'

export class AgentRegistry {
  private static agents: Map<string, BaseAgent> = new Map()

  static init(): void {
    const roster: BaseAgent[] = [
      new ResearcherAgent(),
      new DeveloperAgent(),
      new WriterAgent(),
      new AnalystAgent(),
      new AssistantAgent(),
    ]
    roster.forEach(a => this.agents.set(a.id, a))
    console.log(`[Registry] Loaded ${roster.length} agents: ${roster.map(a => a.id).join(', ')}`)
  }

  static get(id: string): BaseAgent | undefined {
    return this.agents.get(id)
  }

  static all(): BaseAgent[] {
    return Array.from(this.agents.values())
  }

  static ids(): string[] {
    return Array.from(this.agents.keys())
  }
}