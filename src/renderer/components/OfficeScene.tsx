import React from 'react'
import { AgentDesk } from './AgentDesk'
import { AgentState } from '../App'

interface Props {
  agents: AgentState[]
  onAgentClick: (agentId: string) => void
  isLoading: boolean
}

// Desk layout positions in the pixel office (percentage-based)
const DESK_POSITIONS: Record<string, { x: number; y: number }> = {
  boss:       { x: 38, y: 15 },
  researcher: { x: 8,  y: 42 },
  developer:  { x: 33, y: 42 },
  writer:     { x: 58, y: 42 },
  analyst:    { x: 8,  y: 68 },
  assistant:  { x: 58, y: 68 },
}

const AGENT_COLORS: Record<string, string> = {
  boss:       '#ffd700',
  researcher: '#4488ff',
  developer:  '#00ff88',
  writer:     '#ff88cc',
  analyst:    '#ff8800',
  assistant:  '#aa88ff',
}

export function OfficeScene({ agents, onAgentClick, isLoading }: Props) {
  return (
    <div className="relative flex-1 overflow-hidden" style={{ background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 60%, #16213e 100%)' }}>

      {/* Floor grid (pixel art floor tiles) */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'linear-gradient(#2d4a7a 1px, transparent 1px), linear-gradient(90deg, #2d4a7a 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        top: '55%',
      }} />

      {/* Office label */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[#4488ff44] text-xs tracking-widest uppercase">
        [ The Office ]
      </div>

      {/* Agent desks */}
      {agents.map(agent => {
        const pos = DESK_POSITIONS[agent.id]
        if (!pos) return null
        return (
          <AgentDesk
            key={agent.id}
            agent={agent}
            color={AGENT_COLORS[agent.id] ?? '#ffffff'}
            position={pos}
            onClick={() => onAgentClick(agent.id)}
          />
        )
      })}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[#4488ff] text-xs animate-pulse tracking-widest">
          [ PROCESSING... ]
        </div>
      )}
    </div>
  )
}
