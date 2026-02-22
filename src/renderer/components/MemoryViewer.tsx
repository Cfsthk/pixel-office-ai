import React, { useEffect, useState } from 'react'

interface MemoryData {
  summaries: Array<{ id: string; summary: string; created_at: number }>
  observations: Array<{ id: string; type: string; content: string; created_at: number }>
  global: Array<{ key: string; value: string; source: string }>
}

interface Props {
  agentId: string
  agentName: string
  onClose: () => void
}

export function MemoryViewer({ agentId, agentName, onClose }: Props) {
  const [memory, setMemory] = useState<MemoryData | null>(null)
  const [tab, setTab] = useState<'summaries' | 'observations' | 'global'>('summaries')

  useEffect(() => {
    window.electronAPI.getMemory(agentId).then(setMemory)
  }, [agentId])

  return (
    <div className="flex flex-col h-full bg-[#0f0f1a]">
      {/* Header */}
      <div className="px-4 py-2 border-b border-[#2d4a7a] flex items-center">
        <span className="text-[#4488ff] text-xs font-bold tracking-widest">{agentName.toUpperCase()} MEMORY</span>
        <button onClick={onClose} className="ml-auto text-gray-500 hover:text-gray-300 text-xs font-mono">
          [X]
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2d4a7a]">
        {(['summaries', 'observations', 'global'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[10px] font-bold tracking-widest transition-colors ${
              tab === t ? 'text-[#4488ff] border-b-2 border-[#4488ff]' : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {!memory ? (
          <div className="text-center text-gray-600 text-xs mt-8 font-mono">Loading memory...</div>
        ) : (
          <>
            {tab === 'summaries' && (
              memory.summaries.length === 0
                ? <div className="text-gray-600 text-xs font-mono text-center mt-8">No summaries yet.<br/>Complete a job first.</div>
                : memory.summaries.map(s => (
                    <div key={s.id} className="bg-[#1a1a2e] border border-[#2d4a7a] rounded p-2">
                      <div className="text-[10px] text-[#4488ff44] mb-1">
                        {new Date(s.created_at * 1000).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-300 font-mono leading-relaxed whitespace-pre-wrap">
                        {s.summary}
                      </div>
                    </div>
                  ))
            )}

            {tab === 'observations' && (
              memory.observations.length === 0
                ? <div className="text-gray-600 text-xs font-mono text-center mt-8">No observations yet.</div>
                : memory.observations.map(o => (
                    <div key={o.id} className="bg-[#1a1a2e] border border-[#2d4a7a] rounded p-2">
                      <div className="flex gap-2 mb-1">
                        <span className={`text-[10px] font-bold ${
                          o.type === 'error' ? 'text-[#ff4444]' :
                          o.type === 'tool_call' ? 'text-[#00ff88]' :
                          o.type === 'result' ? 'text-[#ffd700]' : 'text-[#4488ff]'
                        }`}>{o.type.toUpperCase()}</span>
                        <span className="text-[10px] text-gray-600 ml-auto">
                          {new Date(o.created_at * 1000).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono leading-relaxed">
                        {o.content.slice(0, 300)}
                      </div>
                    </div>
                  ))
            )}

            {tab === 'global' && (
              memory.global.length === 0
                ? <div className="text-gray-600 text-xs font-mono text-center mt-8">No global memory yet.</div>
                : memory.global.map(g => (
                    <div key={g.key} className="bg-[#1a1a2e] border border-[#2d4a7a] rounded p-2">
                      <div className="text-[10px] text-[#ffd700] font-bold mb-1">{g.key}</div>
                      <div className="text-xs text-gray-300 font-mono">{g.value}</div>
                      <div className="text-[10px] text-gray-600 mt-1">set by: {g.source}</div>
                    </div>
                  ))
            )}
          </>
        )}
      </div>
    </div>
  )
}
