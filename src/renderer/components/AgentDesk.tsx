import React, { useState } from 'react'
import { AgentState } from '../App'

interface Props {
  agent: AgentState
  color: string
  position: { x: number; y: number }
  onClick: () => void
}

const STATUS_LABELS: Record<string, string> = {
  idle:     '...',
  thinking: 'Thinking...',
  working:  'Working...',
  done:     'Done!',
  error:    'Error!',
}

// Simple pixel character rendered with divs (replace with sprite sheets later)
function PixelCharacter({ color, status }: { color: string; status: string }) {
  const isActive = status === 'thinking' || status === 'working'
  return (
    <div className="flex flex-col items-center gap-0.5" style={{ imageRendering: 'pixelated' }}>
      {/* Head */}
      <div className="w-4 h-4 rounded-sm" style={{ background: color, boxShadow: isActive ? `0 0 8px ${color}` : 'none' }} />
      {/* Body */}
      <div className="w-5 h-5 rounded-sm opacity-80" style={{ background: color }} />
      {/* Legs - animate when working */}
      <div className={`flex gap-0.5 ${isActive ? 'animate-bounce' : ''}`}>
        <div className="w-2 h-3 rounded-sm opacity-60" style={{ background: color }} />
        <div className="w-2 h-3 rounded-sm opacity-60" style={{ background: color }} />
      </div>
    </div>
  )
}

export function AgentDesk({ agent, color, position, onClick }: Props) {
  const [hovered, setHovered] = useState(false)
  const statusClass = `agent-${agent.status}`

  return (
    <div
      className="absolute cursor-pointer select-none"
      style={{ left: `${position.x}%`, top: `${position.y}%`, transform: 'translate(-50%, -50%)' }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Speech bubble */}
      {(hovered || agent.status !== 'idle') && (
        <div className="speech-bubble" style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8 }}>
          <div className="text-[#4488ff] font-bold text-xs mb-0.5">{agent.name}</div>
          <div className="text-[10px] text-gray-300">
            {agent.message ?? STATUS_LABELS[agent.status]}
          </div>
        </div>
      )}

      <div className={`flex flex-col items-center gap-1 ${statusClass}`}>
        {/* Character */}
        <PixelCharacter color={color} status={agent.status} />

        {/* Desk */}
        <div
          className="w-20 h-10 rounded-sm flex items-center justify-center relative"
          style={{
            background: `linear-gradient(180deg, #2d4a7a, #1e3a5f)`,
            border: `2px solid ${agent.status !== 'idle' ? color : '#2d4a7a'}`,
            boxShadow: agent.status !== 'idle' ? `0 0 12px ${color}44` : 'none',
          }}
        >
          {/* Monitor on desk */}
          <div className="w-8 h-6 rounded-sm flex items-center justify-center"
            style={{ background: '#0f0f1a', border: `1px solid ${color}44` }}>
            {agent.status === 'working' && (
              <div className="w-1 h-1 rounded-full animate-ping" style={{ background: color }} />
            )}
            {agent.status === 'idle' && (
              <div className="text-[6px]" style={{ color: `${color}88` }}>{'> _'}</div>
            )}
          </div>

          {/* Name tag */}
          <div className="absolute -bottom-4 text-[9px] tracking-widest font-bold"
            style={{ color }}>
            {agent.name.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  )
}
