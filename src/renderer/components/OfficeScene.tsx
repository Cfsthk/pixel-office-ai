import React from 'react'
import { AgentDesk } from './AgentDesk'
import { AgentState } from '../App'

interface Props {
  agents: AgentState[]
  onAgentClick: (agentId: string) => void
  isLoading: boolean
}

// Positions tuned to sit characters at real bullpen desks in the background image
const DESK_POSITIONS: Record<string, { x: number; y: number }> = {
  boss:       { x: 50, y: 18 },  // Michael's glass office, back centre
  researcher: { x: 18, y: 48 },  // Jim's desk, left row
  developer:  { x: 38, y: 48 },  // Dwight's desk, left-centre
  writer:     { x: 18, y: 30 },  // Pam's reception desk, front-left
  analyst:    { x: 62, y: 48 },  // Oscar's desk, right row
  assistant:  { x: 80, y: 48 },  // Kevin's desk, far right
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
    <div
      className="relative flex-1 overflow-hidden"
      style={{
        backgroundImage: 'url("office-bullpen-bg.jpeg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        imageRendering: 'pixelated',
      }}
    >
      {/* Dark overlay to keep sprites readable */}
      <div className="absolute inset-0 bg-[#0f0f1a] opacity-30 pointer-events-none" />

      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #000 2px, #000 4px)',
        }}
      />

      {/* Dunder Mifflin sign */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#0f0f1acc] border border-[#ffd70044] rounded">
        <span className="text-[#ffd700] text-[10px] font-bold tracking-widest uppercase">[ Dunder Mifflin — Scranton ]</span>
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
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#0f0f1acc] border border-[#4488ff44] rounded">
          <span className="text-[#4488ff] text-xs animate-pulse tracking-widest">[ MICHAEL IS DELEGATING... ]</span>
        </div>
      )}
    </div>
  )
}
