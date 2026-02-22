import React, { useEffect, useRef, useState, useCallback } from 'react'
import { AgentDesk } from './AgentDesk'
import { AgentState } from '../App'
import { SpriteAnimator, FallbackSprite, AnimState } from './SpriteAnimator'

interface Props {
  agents: AgentState[]
  onAgentClick: (agentId: string) => void
  isLoading: boolean
}

// Fixed desk positions (percentage of container) — tuned to bullpen background
const DESK_POSITIONS: Record<string, { x: number; y: number }> = {
  boss:       { x: 50, y: 16 },  // Michael — glass office centre-back
  writer:     { x: 22, y: 35 },  // Pam — reception desk front-left
  researcher: { x: 22, y: 55 },  // Jim — bullpen left row
  developer:  { x: 40, y: 55 },  // Dwight — bullpen left-centre
  analyst:    { x: 60, y: 55 },  // Oscar — bullpen right-centre
  assistant:  { x: 78, y: 55 },  // Kevin — bullpen far right
}

const AGENT_COLORS: Record<string, string> = {
  boss:       '#ffd700',
  researcher: '#4488ff',
  developer:  '#00ff88',
  writer:     '#ff88cc',
  analyst:    '#ff8800',
  assistant:  '#aa88ff',
}

const SPRITE_SHEETS: Record<string, string> = {
  boss:       'sprites/michael-sheet.png',
  researcher: 'sprites/jim-sheet.png',
  developer:  'sprites/dwight-sheet.png',
  writer:     'sprites/pam-sheet.png',
  analyst:    'sprites/oscar-sheet.png',
  assistant:  'sprites/kevin-sheet.png',
}

// Idle stroll waypoints characters can wander to (% coords)
const STROLL_WAYPOINTS = [
  { x: 30, y: 42 }, { x: 50, y: 42 }, { x: 70, y: 42 },
  { x: 25, y: 60 }, { x: 45, y: 60 }, { x: 65, y: 60 },
  { x: 35, y: 48 }, { x: 55, y: 48 },
  { x: 20, y: 52 }, { x: 80, y: 52 },
]

// Idle quips per character
const IDLE_QUIPS: Record<string, string[]> = {
  boss:       ["That's what she said.", "I'm kind of a big deal.", "Would I rather be feared or loved? Both.", "I'm not superstitious, but I am a little stitious."],
  researcher: ["[looks at camera]", "[raises eyebrow]", "I'm just gonna... yeah.", "That's what she... never mind."],
  developer:  ["Fact: I am always prepared.", "Identity theft is not a joke, Jim!", "Bears. Beets. Battlestar Galactica.", "Through concentration I can raise my body temperature."],
  writer:     ["Dunder Mifflin, this is Pam.", "I'm not going to be one of those people who says I don't have regrets.", "I sold paper here for six years.", "Jim is my best friend."],
  analyst:    ["Actually, let me clarify that.", "I'm an accountant. I handle numbers.", "That doesn't make financial sense.", "I need to verify that figure."],
  assistant:  ["I like turtles.", "I did it. Done.", "Chili is ready.", "I'm going to take a nap under my desk."],
}

// Working quips
const WORKING_QUIPS: Record<string, string> = {
  boss:       "I am the fun guy AND the work guy.",
  researcher: "On it. Probably.",
  developer:  "Executing with maximum efficiency.",
  writer:     "I'll handle this professionally.",
  analyst:    "Running the numbers now.",
  assistant:  "...computing...",
}

interface CharacterPos {
  x: number
  y: number
  targetX: number
  targetY: number
  direction: 'left' | 'right' | 'down'
  strolling: boolean
  quipIndex: number
  quipTimer: number
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function OfficeScene({ agents, onAgentClick, isLoading }: Props) {
  const [spriteLoaded, setSpriteLoaded] = useState<Record<string, boolean>>({})
  const [hovered, setHovered] = useState<string | null>(null)

  // Per-character animated position state
  const [charPos, setCharPos] = useState<Record<string, CharacterPos>>(() => {
    const init: Record<string, CharacterPos> = {}
    for (const [id, pos] of Object.entries(DESK_POSITIONS)) {
      init[id] = {
        x: pos.x, y: pos.y,
        targetX: pos.x, targetY: pos.y,
        direction: 'down',
        strolling: false,
        quipIndex: 0,
        quipTimer: 0,
      }
    }
    return init
  })

  const charPosRef = useRef(charPos)
  charPosRef.current = charPos

  const agentsRef = useRef(agents)
  agentsRef.current = agents

  // Preload sprite sheets
  useEffect(() => {
    for (const [id, src] of Object.entries(SPRITE_SHEETS)) {
      const img = new Image()
      img.onload = () => setSpriteLoaded(prev => ({ ...prev, [id]: true }))
      img.onerror = () => setSpriteLoaded(prev => ({ ...prev, [id]: false }))
      img.src = src
    }
  }, [])

  // Animation loop: move characters toward targets, trigger strolls when idle
  useEffect(() => {
    let lastTime = performance.now()
    let rafId: number

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now

      setCharPos(prev => {
        const next = { ...prev }
        const currentAgents = agentsRef.current

        for (const id of Object.keys(DESK_POSITIONS)) {
          const cp = { ...next[id] }
          const agent = currentAgents.find(a => a.id === id)
          const isIdle = !agent || agent.status === 'idle'
          const deskPos = DESK_POSITIONS[id]

          // Quip timer
          cp.quipTimer -= dt
          if (cp.quipTimer <= 0) {
            const quips = IDLE_QUIPS[id] ?? ['...']
            cp.quipIndex = (cp.quipIndex + 1) % quips.length
            cp.quipTimer = 8 + Math.random() * 12
          }

          if (!isIdle) {
            // Working: snap back to desk
            cp.targetX = deskPos.x
            cp.targetY = deskPos.y
            cp.strolling = false
          } else {
            // Idle: maybe start a stroll
            const dx = cp.x - cp.targetX
            const dy = cp.y - cp.targetY
            const dist = Math.sqrt(dx * dx + dy * dy)

            if (dist < 0.5) {
              // Reached target
              if (cp.strolling && Math.random() < 0.3) {
                // Return to desk with 30% chance, else pick new waypoint
                cp.targetX = deskPos.x
                cp.targetY = deskPos.y
                cp.strolling = false
              } else if (!cp.strolling && Math.random() < 0.008) {
                // 0.8% chance per frame to start strolling (~every 8s at 60fps)
                const wp = STROLL_WAYPOINTS[Math.floor(Math.random() * STROLL_WAYPOINTS.length)]
                cp.targetX = wp.x
                cp.targetY = wp.y
                cp.strolling = true
              }
            }
          }

          // Move toward target
          const speed = cp.strolling ? 6 : 20  // % per second
          const tdx = cp.targetX - cp.x
          const tdy = cp.targetY - cp.y
          const tdist = Math.sqrt(tdx * tdx + tdy * tdy)

          if (tdist > 0.1) {
            const step = Math.min(speed * dt, tdist)
            cp.x += (tdx / tdist) * step
            cp.y += (tdy / tdist) * step
            cp.direction = tdx < 0 ? 'left' : 'right'
          } else {
            cp.x = cp.targetX
            cp.y = cp.targetY
            cp.direction = 'down'
          }

          next[id] = cp
        }
        return next
      })

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <div
      className="relative flex-1 overflow-hidden"
      style={{
        backgroundImage: 'url("backgrounds/bullpen.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        imageRendering: 'pixelated',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-[#0f0f1a] opacity-25 pointer-events-none" />

      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-8"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #000 2px, #000 4px)',
        }}
      />

      {/* Dunder Mifflin sign */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#0f0f1acc] border border-[#ffd70044] rounded z-20">
        <span className="text-[#ffd700] text-[10px] font-bold tracking-widest uppercase">[ Dunder Mifflin — Scranton ]</span>
      </div>

      {/* Characters */}
      {agents.map(agent => {
        const cp = charPos[agent.id]
        if (!cp) return null

        const color = AGENT_COLORS[agent.id] ?? '#ffffff'
        const isWorking = agent.status === 'working' || agent.status === 'thinking'
        const isIdle = agent.status === 'idle'
        const isStrolling = cp.strolling && isIdle

        const animState: AnimState = isWorking ? 'working' : isStrolling ? 'walking' : 'idle'
        const spriteSrc = SPRITE_SHEETS[agent.id]
        const hasSprite = spriteLoaded[agent.id] === true
        const quips = IDLE_QUIPS[agent.id] ?? ['...']
        const currentQuip = isWorking
          ? (WORKING_QUIPS[agent.id] ?? 'Working...')
          : quips[cp.quipIndex % quips.length]

        const isHovered = hovered === agent.id
        const showBubble = isHovered || isWorking

        return (
          <div
            key={agent.id}
            className="absolute cursor-pointer select-none z-10"
            style={{
              left: `${cp.x}%`,
              top: `${cp.y}%`,
              transform: 'translate(-50%, -100%)',
              transition: 'filter 0.2s ease',
              filter: isHovered ? 'brightness(1.2)' : 'brightness(1)',
            }}
            onClick={() => onAgentClick(agent.id)}
            onMouseEnter={() => setHovered(agent.id)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Speech bubble */}
            {showBubble && (
              <div
                className="absolute pointer-events-none"
                style={{
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginBottom: 4,
                  minWidth: 100,
                  maxWidth: 160,
                  background: '#0f0f1aee',
                  border: `1px solid ${color}88`,
                  borderRadius: 4,
                  padding: '4px 6px',
                  zIndex: 30,
                }}
              >
                <div className="text-[9px] font-bold mb-0.5" style={{ color }}>
                  {agent.name}
                </div>
                <div className="text-[9px] text-gray-300 leading-tight">
                  {currentQuip}
                </div>
                {/* Bubble tail */}
                <div style={{
                  position: 'absolute',
                  bottom: -5,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: `5px solid ${color}88`,
                }} />
              </div>
            )}

            {/* Sprite or fallback */}
            {hasSprite ? (
              <SpriteAnimator
                src={spriteSrc}
                state={animState}
                direction={cp.direction}
                color={color}
                scale={2}
                frameSize={48}
              />
            ) : (
              <FallbackSprite
                state={animState}
                color={color}
                scale={2}
              />
            )}

            {/* Name tag */}
            <div
              className="text-center text-[8px] font-bold tracking-wider mt-0.5 whitespace-nowrap"
              style={{ color }}
            >
              {agent.name.toUpperCase()}
            </div>

            {/* Working pulse ring */}
            {isWorking && (
              <div
                className="absolute inset-0 rounded-full animate-ping opacity-20 pointer-events-none"
                style={{ background: color, animationDuration: '1.2s' }}
              />
            )}
          </div>
        )
      })}

      {/* Loading bar */}
      {isLoading && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#0f0f1acc] border border-[#4488ff44] rounded z-20">
          <span className="text-[#4488ff] text-xs animate-pulse tracking-widest">[ MICHAEL IS DELEGATING... ]</span>
        </div>
      )}
    </div>
  )
}
