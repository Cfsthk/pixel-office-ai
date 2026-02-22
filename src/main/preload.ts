import { contextBridge, ipcRenderer } from 'electron'

// Expose safe IPC API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Submit a job to the Boss agent
  submitJob: (message: string) =>
    ipcRenderer.invoke('job:submit', { message }),

  // Get memory for a specific agent
  getMemory: (agentId: string) =>
    ipcRenderer.invoke('memory:get', agentId),

  // Get full job history
  getJobHistory: () =>
    ipcRenderer.invoke('jobs:history'),

  // Listen for real-time agent status updates pushed from main process
  onAgentStatus: (callback: (data: AgentStatusEvent) => void) => {
    ipcRenderer.on('agent:status', (_event, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('agent:status')
  },

  // Listen for streaming output chunks
  onJobChunk: (callback: (data: JobChunkEvent) => void) => {
    ipcRenderer.on('job:chunk', (_event, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('job:chunk')
  },
})

export interface AgentStatusEvent {
  agentId: string
  status: 'idle' | 'thinking' | 'working' | 'done' | 'error'
  message?: string
}

export interface JobChunkEvent {
  jobId: string
  agentId: string
  chunk: string
  done: boolean
}