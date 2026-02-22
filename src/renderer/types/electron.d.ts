import { AgentStatusEvent, JobChunkEvent } from '../../main/preload'

declare global {
  interface Window {
    electronAPI: {
      submitJob: (message: string) => Promise<{ success: boolean; result?: any; error?: string }>
      getMemory: (agentId: string) => Promise<any>
      getJobHistory: () => Promise<any[]>
      onAgentStatus: (callback: (data: AgentStatusEvent) => void) => () => void
      onJobChunk: (callback: (data: JobChunkEvent) => void) => () => void
    }
  }
}