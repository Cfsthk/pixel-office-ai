import React from 'react'
import { Job } from '../App'

interface Props {
  job: Job | null
  jobs: Job[]
  onSelectJob: (job: Job) => void
}

export function ResultsPanel({ job, jobs, onSelectJob }: Props) {
  return (
    <div className="flex flex-col h-full bg-[#0f0f1a]">
      {/* Header */}
      <div className="px-4 py-2 border-b border-[#2d4a7a] flex items-center">
        <span className="text-[#4488ff] text-xs font-bold tracking-widest">OUTPUT</span>
        {job && (
          <span className="ml-auto text-[10px] text-gray-600">
            {job.results.length} agent{job.results.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Active job results */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {!job ? (
          <div className="text-center text-gray-600 text-xs mt-8 font-mono">
            <div className="text-2xl mb-2">{'[ ]'}</div>
            No job yet. Give the Boss a task.
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
              <div className="bg-[#1e2a1e] border border-[#ffd70044] rounded p-2">
                <div className="text-[10px] text-[#ffd700] font-bold mb-1 tracking-widest">BOSS PLAN</div>
                <div className="text-xs text-gray-400 font-mono">{job.plan}</div>
              </div>
            )}

            {/* Clarification */}
            {job.needsClarification && job.clarificationQuestion && (
              <div className="bg-[#1e1e2e] border border-[#ffd700] rounded p-3">
                <div className="text-[10px] text-[#ffd700] font-bold mb-1">BOSS ASKS</div>
                <div className="text-sm text-gray-300">{job.clarificationQuestion}</div>
              </div>
            )}

            {/* Agent results */}
            {job.results.map((result, i) => (
              <div
                key={i}
                className={`border rounded p-3 ${result.success ? 'bg-[#0f1a0f] border-[#00ff8844]' : 'bg-[#1a0f0f] border-[#ff444444]'}`}
              >
                <div className={`text-[10px] font-bold mb-2 tracking-widest ${result.success ? 'text-[#00ff88]' : 'text-[#ff4444]'}`}>
                  {result.agentName.toUpperCase()} {result.success ? '✓' : '✗'}
                </div>
                <div className="text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
                  {result.output || result.error}
                </div>
              </div>
            ))}
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
