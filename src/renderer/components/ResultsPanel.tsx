import React from 'react'
import { Job, AgentState } from '../App'

interface Props {
  job: Job | null
  jobs: Job[]
  onSelectJob: (job: Job) => void
  agents: AgentState[]
}

const AGENT_COLORS: Record<string, string> = {
  boss:       '#ffd700',
  researcher: '#4488ff',
  developer:  '#00ff88',
  writer:     '#ff88cc',
  analyst:    '#ff8800',
  assistant:  '#aa88ff',
}

const SPRITES: Record<string, string> = {
  boss:       'sprites/michael.png',
  researcher: 'sprites/jim.png',
  developer:  'sprites/dwight.png',
  writer:     'sprites/pam.png',
  analyst:    'sprites/oscar.png',
  assistant:  'sprites/kevin.png',
}

// Map agent name back to id for color/sprite lookup
function agentIdFromName(name: string): string {
  const map: Record<string, string> = {
    michael: 'boss',
    jim:     'researcher',
    dwight:  'developer',
    pam:     'writer',
    oscar:   'analyst',
    kevin:   'assistant',
    boss:    'boss',
  }
  return map[name.toLowerCase()] ?? 'boss'
}

function AgentAvatar({ agentId, size = 28 }: { agentId: string; size?: number }) {
  const color = AGENT_COLORS[agentId] ?? '#ffffff'
  const sprite = SPRITES[agentId]
  return (
    <div
      className="rounded-sm flex-shrink-0 overflow-hidden flex items-center justify-center"
      style={{
        width: size,
        height: size,
        border: `1.5px solid ${color}`,
        background: '#0f0f1a',
        imageRendering: 'pixelated',
      }}
    >
      {sprite ? (
        <img src={sprite} alt={agentId} style={{ width: size - 4, height: size - 4, objectFit: 'contain', imageRendering: 'pixelated' }} />
      ) : (
        <div style={{ width: 8, height: 8, background: color, borderRadius: 2 }} />
      )}
    </div>
  )
}

export function ResultsPanel({ job, jobs, onSelectJob, agents }: Props) {
  return (
    <div className="flex flex-col h-full bg-[#0f0f1a]">
      {/* Header */}
      <div className="px-4 py-2 border-b border-[#2d4a7a] flex items-center gap-2">
        <span className="text-[#ffd700] text-xs font-bold tracking-widest">THE OFFICE</span>
        <span className="text-[#4488ff44] text-xs">— Output</span>
        {job && (
          <span className="ml-auto text-[10px] text-gray-600">
            {job.results.length} agent{job.results.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Active job results */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {!job ? (
          <div className="text-center text-gray-600 text-xs mt-8 font-mono space-y-2">
            <div className="text-3xl">🏢</div>
            <div className="text-[#ffd70044]">Welcome to Dunder Mifflin.</div>
            <div className="text-[10px] text-gray-700">Give Michael a task to get started.</div>
          </div>
        ) : (
          <>
            {/* User input */}
            <div className="bg-[#1a1a2e] border border-[#2d4a7a] rounded p-3">
              <div className="text-[10px] text-[#4488ff] font-bold mb-1 tracking-widest">YOU</div>
              <div className="text-sm text-gray-300 font-mono">{job.input}</div>
            </div>

            {/* Boss plan */}
            {job.plan && (
              <div className="bg-[#1e1a0e] border border-[#ffd70033] rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AgentAvatar agentId="boss" size={24} />
                  <div>
                    <div className="text-[10px] text-[#ffd700] font-bold tracking-widest">MICHAEL</div>
                    <div className="text-[9px] text-[#ffd70066]">Regional Manager</div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 font-mono leading-relaxed">{job.plan}</div>
              </div>
            )}

            {/* Clarification */}
            {job.needsClarification && job.clarificationQuestion && (
              <div className="bg-[#1e1a0e] border border-[#ffd700] rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AgentAvatar agentId="boss" size={24} />
                  <div className="text-[10px] text-[#ffd700] font-bold">MICHAEL ASKS</div>
                </div>
                <div className="text-sm text-gray-300">{job.clarificationQuestion}</div>
              </div>
            )}

            {/* Agent results */}
            {job.results.map((result, i) => {
              const agentId = agentIdFromName(result.agentName)
              const color = AGENT_COLORS[agentId] ?? '#ffffff'
              const agent = agents.find(a => a.id === agentId)
              return (
                <div
                  key={i}
                  className="rounded p-3"
                  style={{
                    background: result.success ? '#0a150a' : '#150a0a',
                    border: `1px solid ${result.success ? color + '44' : '#ff444444'}`,
                  }}
                >
                  {/* Agent header with avatar */}
                  <div className="flex items-center gap-2 mb-2">
                    <AgentAvatar agentId={agentId} size={28} />
                    <div>
                      <div className="text-[10px] font-bold tracking-widest" style={{ color }}>
                        {result.agentName.toUpperCase()}
                        <span className="ml-1 text-[10px]">{result.success ? '✓' : '✗'}</span>
                      </div>
                      {agent && (
                        <div className="text-[9px]" style={{ color: color + '88' }}>{agent.role}</div>
                      )}
                    </div>
                  </div>

                  {/* Output */}
                  <div className="text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed border-t border-[#ffffff11] pt-2 mt-1">
                    {result.output || result.error}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Job history */}
      {jobs.length > 1 && (
        <div className="border-t border-[#2d4a7a] p-2">
          <div className="text-[10px] text-[#4488ff44] mb-1 tracking-widest">HISTORY</div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {jobs.slice(1, 6).map(j => (
              <button
                key={j.id}
                onClick={() => onSelectJob(j)}
                className="w-full text-left text-[10px] text-gray-500 hover:text-gray-300 truncate font-mono py-0.5"
              >
                {'>'} {j.input.slice(0, 50)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
