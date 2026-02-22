import React, { useState, useEffect, useCallback } from 'react'
import { OfficeScene } from './components/OfficeScene'
import { InputPanel } from './components/InputPanel'
import { ResultsPanel } from './components/ResultsPanel'
import { MemoryViewer } from './components/MemoryViewer'

export type AgentStatus = 'idle' | 'thinking' | 'working' | 'done' | 'error'

export interface AgentState {
  id: string
  name: string
  status: AgentStatus
  message?: string
}

export interface JobResult {
  agentId: string
  agentName: string
  output: string
  success: boolean
  error?: string
}

export interface Job {
  id: string
  input: string
  plan?: string
  results: JobResult[]
  timestamp: Date
  needsClarification?: boolean
  clarificationQuestion?: string
}

const AGENTS: AgentState[] = [
  { id: 'boss',       name: 'Boss',  status: 'idle' },
  { id: 'researcher', name: 'Rex',   status: 'idle' },
  { id: 'developer',  name: 'Dev',   status: 'idle' },
  { id: 'writer',     name: 'Wren',  status: 'idle' },
  { id: 'analyst',    name: 'Ada',   status: 'idle' },
  { id: 'assistant',  name: 'Aria',  status: 'idle' },
]

export default function App() {
  const [agents, setAgents] = useState<AgentState[]>(AGENTS)
  const [jobs, setJobs] = useState<Job[]>([])
  const [activeJob, setActiveJob] = useState<Job | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [showMemory, setShowMemory] = useState(false)
  const [pendingClarification, setPendingClarification] = useState<string | null>(null)

  // Listen for real-time agent status updates
  useEffect(() => {
    const cleanup = window.electronAPI.onAgentStatus((data) => {
      setAgents(prev => prev.map(a =>
        a.id === data.agentId
          ? { ...a, status: data.status, message: data.message }
          : a
      ))
      // Auto-reset to idle after done/error
      if (data.status === 'done' || data.status === 'error') {
        setTimeout(() => {
          setAgents(prev => prev.map(a =>
            a.id === data.agentId ? { ...a, status: 'idle', message: undefined } : a
          ))
        }, 3000)
      }
    })
    return cleanup
  }, [])

  const submitJob = useCallback(async (message: string) => {
    setIsLoading(true)
    setPendingClarification(null)

    const jobId = Date.now().toString()
    const newJob: Job = {
      id: jobId,
      input: message,
      results: [],
      timestamp: new Date(),
    }
    setActiveJob(newJob)

    try {
      const response = await window.electronAPI.submitJob(message)

      if (response.success) {
        const { result } = response
        const completedJob: Job = {
          ...newJob,
          plan: result.plan,
          results: result.results ?? [],
          needsClarification: result.needsClarification,
          clarificationQuestion: result.clarificationQuestion,
        }
        if (result.needsClarification) {
          setPendingClarification(result.clarificationQuestion)
        }
        setActiveJob(completedJob)
        setJobs(prev => [completedJob, ...prev])
      } else {
        const failedJob: Job = {
          ...newJob,
          results: [{ agentId: 'boss', agentName: 'Boss', output: response.error, success: false }],
        }
        setActiveJob(failedJob)
        setJobs(prev => [failedJob, ...prev])
      }
    } catch (err: any) {
      console.error('Job failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleAgentClick = (agentId: string) => {
    setSelectedAgent(agentId)
    setShowMemory(true)
  }

  return (
    <div className="flex flex-col h-screen bg-[#1a1a2e] scanlines relative">
      {/* Title bar */}
      <div className="flex items-center px-4 py-2 bg-[#0f0f1a] border-b border-[#2d4a7a] drag-region">
        <span className="text-[#4488ff] font-bold text-sm tracking-widest">PIXEL OFFICE AI</span>
        <span className="ml-auto text-[#4488ff33] text-xs">v0.1.0</span>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: office scene */}
        <div className="flex-1 flex flex-col">
          <OfficeScene
            agents={agents}
            onAgentClick={handleAgentClick}
            isLoading={isLoading}
          />
          <InputPanel
            onSubmit={submitJob}
            isLoading={isLoading}
            pendingClarification={pendingClarification}
          />
        </div>

        {/* Right: results + memory */}
        <div className="w-96 border-l border-[#2d4a7a] flex flex-col">
          {showMemory && selectedAgent ? (
            <MemoryViewer
              agentId={selectedAgent}
              agentName={agents.find(a => a.id === selectedAgent)?.name ?? selectedAgent}
              onClose={() => setShowMemory(false)}
            />
          ) : (
            <ResultsPanel job={activeJob} jobs={jobs} onSelectJob={setActiveJob} />
          )}
        </div>
      </div>
    </div>
  )
}