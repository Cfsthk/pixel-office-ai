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

// Map agent id to sprite image filename
const SPRITES: Record<string, string> = {
  boss:       'sprites/michael.png',
  researcher: 'sprites/jim.png',
  developer:  'sprites/dwight.png',
  writer:     'sprites/pam.png',
  analyst:    'sprites/oscar.png',
  assistant:  'sprites/kevin.png',
}

// Character-specific idle quips shown on hover
const IDLE_QUIPS: Record<string, string> = {
  boss:       "I'm kind of a big deal.",
  researcher: "[looks at camera]",
  developer:  "Fact: I am ready.",
  writer:     "Hi, Dunder Mifflin, this is Pam.",
  analyst:    "Actually, let me clarify that.",
  assistant:  "I did it. Done.",
}

function PixelSprite({ agentId, color, status }: { agentId: string; color: string; status: string }) {
  const isActive = status === 'thinking' || status === 'working'
  const spriteSrc = SPRITES[agentId]

  return (
    <div
      className="flex flex-col items-center"
      style={{ imageRendering: 'pixelated' }}
    >
      {spriteSrc ? (
        <div
          className={`relative ${isActive ? 'animate-bounce' : ''}`}
          style={{ animationDuration: '1.2s' }}
        >
          <img
            src={spriteSrc}
            alt={agentId}
            className="w-12 h-12 object-contain"
            style={{
              imageRendering: 'pixelated',
              filter: isActive ? `drop-shadow(0 0 6px ${color})` : `drop-shadow(0 0 2px ${color}44)`,
            }}
          />
          {/* Active pulse ring */}
          {isActive && (
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-30"
              style={{ background: color, animationDuration: '1s' }}
            />
          )}
        </div>
      ) : (
        // Fallback: colored block character
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-4 h-4 rounded-sm" style={{ background: color, boxShadow: isActive ? `0 0 8px ${color}` : 'none' }} />
          <div className="w-5 h-5 rounded-sm opacity-80" style={{ background: color }} />
          <div className={`flex gap-0.5 ${isActive ? 'animate-bounce' : ''}`}>
            <div className="w-2 h-3 rounded-sm opacity-60" style={{ background: color }} />
            <div className="w-2 h-3 rounded-sm opacity-60" style={{ background: color }} />
          </div>
        </div>
      )}
    </div>
  )
}

export function AgentDesk({ agent, color, position, onClick }: Props) {
  const [hovered, setHovered] = useState(false)
  const isActive = agent.status !== 'idle'
  const quip = IDLE_QUIPS[agent.id] ?? '...'

  return (
    <div
      className="absolute cursor-pointer select-none"
      style={{ left: `${position.x}%`, top: `${position.y}%`, transform: 'translate(-50%, -50%)' }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Speech bubble */}
      {(hovered || isActive) && (
        <div
          className="absolute speech-bubble"
          style={{
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 6,
            minWidth: 100,
            maxWidth: 160,
          }}
        >
          <div className="text-[10px] font-bold mb-0.5" style={{ color }}>
            {agent.name}
            <span className="ml-1 text-[#ffffff44] font-normal">— {agent.character ?? agent.name}</span>
          </div>
          <div className="text-[10px] text-gray-300 leading-tight">
            {isActive ? (agent.message ?? STATUS_LABELS[agent.status]) : quip}
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-1">
        {/* Sprite */}
        <PixelSprite agentId={agent.id} color={color} status={agent.status} />

        {/* Desk surface */}
        <div
          className="w-16 h-8 rounded-sm flex items-center justify-center relative"
          style={{
            background: `linear-gradient(180deg, #3a2e1e, #2a1e0e)`,
            border: `2px solid ${isActive ? color : '#5a4a2a'}`,
            boxShadow: isActive ? `0 0 10px ${color}44` : 'none',
          }}
        >
          {/* Monitor */}
          <div
            className="w-7 h-5 rounded-sm flex items-center justify-center"
            style={{ background: '#0f0f1a', border: `1px solid ${color}33` }}
          >
            {agent.status === 'working' && (
              <div className="w-1 h-1 rounded-full animate-ping" style={{ background: color }} />
            )}
            {agent.status === 'idle' && (
              <div className="text-[5px]" style={{ color: `${color}66` }}>{'> _'}</div>
            )}
            {agent.status === 'done' && (
              <div className="text-[5px] text-green-400">{'OK'}</div>
            )}
          </div>

          {/* Name tag below desk */}
          <div
            className="absolute -bottom-5 text-[8px] font-bold tracking-wider whitespace-nowrap"
            style={{ color }}
          >
            {agent.name.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  )
}
