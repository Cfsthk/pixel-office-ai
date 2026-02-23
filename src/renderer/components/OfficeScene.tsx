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

// Per-character task pools — rotate through these as they "complete" work
const TASK_POOLS: Record<string, string[]> = {
  boss:       ["Write inspirational memo", "Schedule mandatory fun", "Call corporate", "Review branch numbers", "Plan Pretzel Day", "Motivational speech prep"],
  researcher: ["Update client database", "Answer phone calls", "File TPS reports", "Coordinate with vendors", "Proof quarterly report", "Book conference room"],
  developer:  ["Audit beet inventory", "Update threat assessment", "Run security drill", "Surveil parking lot", "Prepare bear attack protocol", "Train new recruits"],
  writer:     ["Design new letterhead", "Update company website", "Sketch reception mural", "Compile newsletter", "Organise supply closet", "Update employee photos"],
  analyst:    ["Reconcile Q3 accounts", "Audit expense reports", "Prepare tax estimates", "Model budget scenarios", "Review vendor invoices", "Compliance checklist"],
  assistant:  ["Count paper reams", "Refill break room snacks", "Fix printer jam", "Update contact list", "Sort mail", "Water the plant"],
}

type Mood = 'happy' | 'focused' | 'bored' | 'stressed'
const MOOD_EMOJI: Record<Mood, string> = {
  happy:   '😄',
  focused: '🎯',
  bored:   '😑',
  stressed:'😰',
}

const DISPLAY_NAMES: Record<string, string> = {
  boss:       'Michael Scott',
  researcher: 'Jim Halpert',
  developer:  'Dwight Schrute',
  writer:     'Pam Beesly',
  analyst:    'Oscar Martinez',
  assistant:  'Kevin Malone',
}

interface CharacterPos {
  x: number
  y: number
  targetX: number
  targetY: number
  path: Array<{ x: number; y: number }>  // A* waypoints remaining
  direction: 'left' | 'right' | 'down'
  strolling: boolean
  quipIndex: number
  quipTimer: number
  // Task system
  taskIndex: number          // which task in their pool they're on
  taskProgress: number       // 0–100 %
  taskTimer: number          // seconds until next progress tick
  completedTasks: string[]   // last 3 finished tasks (for sidebar)
  // Mood
  mood: Mood
  moodTimer: number          // seconds until mood re-rolls
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

// ---------------------------------------------------------------------------
// A* Pathfinding on a 20×20 nav-grid (each cell = 5% of the canvas)
// ---------------------------------------------------------------------------
const GRID_COLS = 20
const GRID_ROWS = 20
const CELL_W = 100 / GRID_COLS  // 5% per cell
const CELL_H = 100 / GRID_ROWS

// Obstacle rectangles characters cannot walk through (% coords, {x,y,w,h})
const OBSTACLES = [
  { x: 38, y:  4, w: 26, h: 20 },  // Michael's glass office
  { x:  8, y: 28, w: 16, h: 16 },  // Pam's reception desk
  { x:  0, y:  0, w:  5, h: 100 }, // Left wall
  { x: 95, y:  0, w:  5, h: 100 }, // Right wall
  { x:  0, y:  0, w: 100, h:  8 }, // Top wall
  { x:  0, y: 88, w: 100, h: 12 }, // Bottom wall / floor edge
]

const COLLISION_RADIUS = 5   // % units — how close two characters can get
const SEPARATION_FORCE = 18  // push strength (% / sec)
const OBSTACLE_MARGIN = 3    // % units from obstacle edge to bounce

function clampToWalkable(x: number, y: number): { x: number; y: number } {
  let cx = x
  let cy = y
  for (const obs of OBSTACLES) {
    const left   = obs.x - OBSTACLE_MARGIN
    const right  = obs.x + obs.w + OBSTACLE_MARGIN
    const top    = obs.y - OBSTACLE_MARGIN
    const bottom = obs.y + obs.h + OBSTACLE_MARGIN
    if (cx > left && cx < right && cy > top && cy < bottom) {
      // Push out through nearest edge
      const dLeft   = cx - left
      const dRight  = right - cx
      const dTop    = cy - top
      const dBottom = bottom - cy
      const min = Math.min(dLeft, dRight, dTop, dBottom)
      if (min === dLeft)   cx = left
      else if (min === dRight)  cx = right
      else if (min === dTop)    cy = top
      else                      cy = bottom
    }
  }
  return { x: Math.max(5, Math.min(95, cx)), y: Math.max(10, Math.min(85, cy)) }
}

function isInsideObstacle(x: number, y: number): boolean {
  for (const obs of OBSTACLES) {
    if (
      x > obs.x - OBSTACLE_MARGIN && x < obs.x + obs.w + OBSTACLE_MARGIN &&
      y > obs.y - OBSTACLE_MARGIN && y < obs.y + obs.h + OBSTACLE_MARGIN
    ) return true
  }
  return false
}

function pickSafeWaypoint(): { x: number; y: number } {
  let wp = STROLL_WAYPOINTS[Math.floor(Math.random() * STROLL_WAYPOINTS.length)]
  for (let i = 0; i < STROLL_WAYPOINTS.length; i++) {
    const candidate = STROLL_WAYPOINTS[i]
    if (!isInsideObstacle(candidate.x, candidate.y)) { wp = candidate; break }
  }
  return wp
}

// ---------------------------------------------------------------------------
// Nav-grid: build once, mark obstacle cells as blocked
// ---------------------------------------------------------------------------
type Cell = { col: number; row: number }

function worldToCell(x: number, y: number): Cell {
  return {
    col: Math.max(0, Math.min(GRID_COLS - 1, Math.floor(x / CELL_W))),
    row: Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(y / CELL_H))),
  }
}

function cellToWorld(col: number, row: number): { x: number; y: number } {
  return { x: (col + 0.5) * CELL_W, y: (row + 0.5) * CELL_H }
}

function buildNavGrid(): boolean[][] {
  const grid: boolean[][] = Array.from({ length: GRID_ROWS }, () =>
    Array(GRID_COLS).fill(false)
  )
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const wx = (c + 0.5) * CELL_W
      const wy = (r + 0.5) * CELL_H
      grid[r][c] = isInsideObstacle(wx, wy)
    }
  }
  return grid
}

const NAV_GRID = buildNavGrid()

function cellKey(c: number, r: number) { return `${c},${r}` }

// A* — returns list of world-space waypoints (centre of each cell), or [] if blocked
function astar(
  startX: number, startY: number,
  goalX: number,  goalY: number
): Array<{ x: number; y: number }> {
  const start = worldToCell(startX, startY)
  const goal  = worldToCell(goalX,  goalY)

  if (start.col === goal.col && start.row === goal.row) return []

  // If goal cell is blocked, find nearest open neighbour
  const resolvedGoal = { ...goal }
  if (NAV_GRID[goal.row]?.[goal.col]) {
    let found = false
    outer:
    for (let radius = 1; radius <= 3; radius++) {
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          const nr = goal.row + dr
          const nc = goal.col + dc
          if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS && !NAV_GRID[nr][nc]) {
            resolvedGoal.row = nr
            resolvedGoal.col = nc
            found = true
            break outer
          }
        }
      }
    }
    if (!found) return []
  }

  type Node = { col: number; row: number; g: number; f: number; parent: string | null }
  const open = new Map<string, Node>()
  const closed = new Set<string>()

  const heuristic = (c: number, r: number) =>
    Math.abs(c - resolvedGoal.col) + Math.abs(r - resolvedGoal.row)

  const startKey = cellKey(start.col, start.row)
  open.set(startKey, { col: start.col, row: start.row, g: 0, f: heuristic(start.col, start.row), parent: null })

  const cameFrom = new Map<string, string>()

  while (open.size > 0) {
    // Pop node with lowest f
    let bestKey = ''
    let bestF = Infinity
    for (const [k, n] of open) {
      if (n.f < bestF) { bestF = n.f; bestKey = k }
    }
    const current = open.get(bestKey)!
    open.delete(bestKey)
    closed.add(bestKey)

    if (current.col === resolvedGoal.col && current.row === resolvedGoal.row) {
      // Reconstruct path
      const path: Array<{ x: number; y: number }> = []
      let key: string | null = bestKey
      while (key) {
        const [c, r] = key.split(',').map(Number)
        path.unshift(cellToWorld(c, r))
        key = cameFrom.get(key) ?? null
      }
      path.shift() // remove start cell (character is already there)
      return path
    }

    // 8-directional neighbours
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const nc = current.col + dc
        const nr = current.row + dr
        if (nc < 0 || nc >= GRID_COLS || nr < 0 || nr >= GRID_ROWS) continue
        if (NAV_GRID[nr][nc]) continue  // blocked
        const nk = cellKey(nc, nr)
        if (closed.has(nk)) continue

        const moveCost = Math.abs(dc) + Math.abs(dr) === 2 ? 1.414 : 1
        const g = current.g + moveCost
        const existing = open.get(nk)
        if (!existing || g < existing.g) {
          open.set(nk, { col: nc, row: nr, g, f: g + heuristic(nc, nr), parent: bestKey })
          cameFrom.set(nk, bestKey)
        }
      }
    }

    if (closed.size > 400) break // safety cap
  }

  return [] // no path found
}

export function OfficeScene({ agents, onAgentClick, isLoading }: Props) {
  const [spriteLoaded, setSpriteLoaded] = useState<Record<string, boolean>>({})
  const [showDebug, setShowDebug] = useState(false)
  const [selectedChar, setSelectedChar] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'g' || e.key === 'G') setShowDebug(v => !v)
      if (e.key === 'Escape') setSelectedChar(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const [hovered, setHovered] = useState<string | null>(null)

  const MOODS: Mood[] = ['happy', 'focused', 'bored', 'stressed']
  const randomMood = (): Mood => MOODS[Math.floor(Math.random() * MOODS.length)]

  // Per-character animated position state
  const [charPos, setCharPos] = useState<Record<string, CharacterPos>>(() => {
    const init: Record<string, CharacterPos> = {}
    for (const [id, pos] of Object.entries(DESK_POSITIONS)) {
      init[id] = {
        x: pos.x, y: pos.y,
        targetX: pos.x, targetY: pos.y,
        path: [],
        direction: 'down',
        strolling: false,
        quipIndex: 0,
        quipTimer: 0,
        taskIndex: 0,
        taskProgress: 0,
        taskTimer: 4 + Math.random() * 4,
        completedTasks: [],
        mood: MOODS[Math.floor(Math.random() * MOODS.length)],
        moodTimer: 20 + Math.random() * 20,
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
        const ids = Object.keys(DESK_POSITIONS)

        // --- Phase 1: intention + primary movement ---
        for (const id of ids) {
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

          // Mood timer — re-roll mood every 20-40s
          cp.moodTimer -= dt
          if (cp.moodTimer <= 0) {
            const moods: Mood[] = ['happy', 'focused', 'bored', 'stressed']
            cp.mood = moods[Math.floor(Math.random() * moods.length)]
            cp.moodTimer = 20 + Math.random() * 20
          }

          // Task progress — only ticks when agent is working and at desk
          const atDesk = Math.abs(cp.x - deskPos.x) < 3 && Math.abs(cp.y - deskPos.y) < 3
          if (!isIdle && atDesk) {
            cp.taskTimer -= dt
            if (cp.taskTimer <= 0) {
              cp.taskProgress = Math.min(100, cp.taskProgress + 10 + Math.random() * 15)
              cp.taskTimer = 3 + Math.random() * 4
              if (cp.taskProgress >= 100) {
                const pool = TASK_POOLS[id] ?? ['Work']
                const done = pool[cp.taskIndex % pool.length]
                cp.completedTasks = [done, ...cp.completedTasks].slice(0, 5)
                cp.taskIndex = (cp.taskIndex + 1) % pool.length
                cp.taskProgress = 0
                cp.mood = 'happy'
                cp.moodTimer = 15
              }
            }
          }

          const setDestination = (gx: number, gy: number) => {
            cp.targetX = gx
            cp.targetY = gy
            cp.path = astar(cp.x, cp.y, gx, gy)
          }

          if (!isIdle) {
            // Snap to desk via A* whenever destination changes
            if (cp.strolling || Math.abs(cp.targetX - deskPos.x) > 0.1 || Math.abs(cp.targetY - deskPos.y) > 0.1) {
              cp.strolling = false
              setDestination(deskPos.x, deskPos.y)
            }
          } else {
            // Check if arrived at current waypoint (within 1 cell)
            const atWp = cp.path.length === 0
            const globalDist = Math.sqrt((cp.x - cp.targetX) ** 2 + (cp.y - cp.targetY) ** 2)

            if (atWp && globalDist < 1.5) {
              if (cp.strolling && Math.random() < 0.003) {
                setDestination(deskPos.x, deskPos.y)
                cp.strolling = false
              } else if (!cp.strolling && Math.random() < 0.008) {
                const wp = pickSafeWaypoint()
                cp.strolling = true
                setDestination(wp.x, wp.y)
              }
            }
          }

          // Advance along A* path: step toward next waypoint
          // If path has waypoints, use the next one; otherwise head directly to target
          const nextWp = cp.path.length > 0 ? cp.path[0] : { x: cp.targetX, y: cp.targetY }
          const speed = cp.strolling ? 6 : 20
          const tdx = nextWp.x - cp.x
          const tdy = nextWp.y - cp.y
          const tdist = Math.sqrt(tdx * tdx + tdy * tdy)

          if (tdist > 0.3) {
            const step = Math.min(speed * dt, tdist)
            cp.x += (tdx / tdist) * step
            cp.y += (tdy / tdist) * step
            cp.direction = tdx < -0.1 ? 'left' : tdx > 0.1 ? 'right' : cp.direction
          } else {
            // Arrived at this waypoint — pop it and move to next
            if (cp.path.length > 0) cp.path = cp.path.slice(1)
            if (cp.path.length === 0) {
              cp.x = cp.targetX
              cp.y = cp.targetY
              cp.direction = 'down'
            }
          }

          next[id] = cp
        }

        // --- Phase 2: character–character separation steering ---
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            const a = next[ids[i]]
            const b = next[ids[j]]
            const dx = a.x - b.x
            const dy = a.y - b.y
            const dist = Math.sqrt(dx * dx + dy * dy)

            if (dist < COLLISION_RADIUS && dist > 0.01) {
              // How much overlap (0 = just touching, 1 = fully overlapping)
              const overlap = 1 - dist / COLLISION_RADIUS
              const pushX = (dx / dist) * SEPARATION_FORCE * overlap * dt
              const pushY = (dy / dist) * SEPARATION_FORCE * overlap * dt

              const na = { ...next[ids[i]], x: a.x + pushX, y: a.y + pushY }
              const nb = { ...next[ids[j]], x: b.x - pushX, y: b.y - pushY }
              next[ids[i]] = na
              next[ids[j]] = nb
            }
          }
        }

        // --- Phase 3: clamp everyone to walkable area (obstacle bounce) ---
        for (const id of ids) {
          const cp = next[id]
          const clamped = clampToWalkable(cp.x, cp.y)
          if (clamped.x !== cp.x || clamped.y !== cp.y) {
            // Knocked into an obstacle — recompute path back to desk
            const desk = DESK_POSITIONS[id]
            next[id] = {
              ...cp,
              x: clamped.x,
              y: clamped.y,
              targetX: desk.x,
              targetY: desk.y,
              path: astar(clamped.x, clamped.y, desk.x, desk.y),
              strolling: false,
            }
          }
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

        const pool = TASK_POOLS[agent.id] ?? ['Work']
        const currentTask = pool[cp.taskIndex % pool.length]
        const isSelected = selectedChar === agent.id

        return (
          <div
            key={agent.id}
            className="absolute cursor-pointer select-none z-10"
            style={{
              left: `${cp.x}%`,
              top: `${cp.y}%`,
              transform: 'translate(-50%, -100%)',
              transition: 'filter 0.2s ease',
              filter: isHovered ? 'brightness(1.3)' : 'brightness(1)',
            }}
            onClick={() => { onAgentClick(agent.id); setSelectedChar(id => id === agent.id ? null : agent.id) }}
            onMouseEnter={() => setHovered(agent.id)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Floating nameplate — always visible, pulses when selected */}
            <div
              className="absolute pointer-events-none whitespace-nowrap"
              style={{
                bottom: 'calc(100% + 2px)',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#0f0f1acc',
                border: `1px solid ${isSelected ? color : color + '55'}`,
                borderRadius: 3,
                padding: '2px 6px',
                zIndex: 25,
                boxShadow: isSelected ? `0 0 6px ${color}88` : 'none',
                transition: 'box-shadow 0.2s',
              }}
            >
              <span className="text-[8px] font-bold tracking-widest" style={{ color }}>
                {agent.name.toUpperCase()}
              </span>
              <span className="ml-1 text-[9px]">{MOOD_EMOJI[cp.mood]}</span>
            </div>

            {/* Speech bubble — below nameplate */}
            {showBubble && (
              <div
                className="absolute pointer-events-none"
                style={{
                  bottom: 'calc(100% + 22px)',
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

            {/* Drop shadow ellipse */}
            <div
              className="absolute pointer-events-none"
              style={{
                bottom: -4,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 28,
                height: 8,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.45)',
                filter: 'blur(3px)',
                zIndex: 1,
              }}
            />

            {/* Sprite or fallback */}
            <div style={{ position: 'relative', zIndex: 2 }}>
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
            </div>

            {/* Task progress bar — shown when working at desk */}
            {isWorking && cp.taskProgress > 0 && (
              <div
                className="absolute pointer-events-none"
                style={{ bottom: -10, left: '50%', transform: 'translateX(-50%)', width: 36, zIndex: 5 }}
              >
                <div style={{ height: 3, background: '#ffffff22', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${cp.taskProgress}%`, background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
                </div>
              </div>
            )}

            {/* Working pulse ring */}
            {isWorking && (
              <div
                className="absolute inset-0 rounded-full animate-ping opacity-20 pointer-events-none"
                style={{ background: color, animationDuration: '1.2s', zIndex: 1 }}
              />
            )}
          </div>
        )
      })}

      {/* Click-to-inspect sidebar */}
      {selectedChar && (() => {
        const cp = charPos[selectedChar]
        const agent = agents.find(a => a.id === selectedChar)
        if (!cp || !agent) return null
        const color = AGENT_COLORS[selectedChar] ?? '#ffffff'
        const pool = TASK_POOLS[selectedChar] ?? ['Work']
        const currentTask = pool[cp.taskIndex % pool.length]
        const isWorking = agent.status === 'working' || agent.status === 'thinking'
        const nextTasks = [1, 2, 3].map(i => pool[(cp.taskIndex + i) % pool.length])
        return (
          <div
            className="absolute top-10 right-2 z-50 pointer-events-auto"
            style={{
              width: 180,
              background: '#0d0d1aee',
              border: `1px solid ${color}55`,
              borderRadius: 6,
              boxShadow: `0 0 16px ${color}33`,
              padding: '10px 12px',
              fontFamily: 'monospace',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[10px] font-bold tracking-widest" style={{ color }}>{agent.name.toUpperCase()}</div>
                <div className="text-[8px] text-gray-400">{DISPLAY_NAMES[selectedChar] ?? ''}</div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-base">{MOOD_EMOJI[cp.mood]}</span>
                <button
                  className="text-gray-500 hover:text-white text-[10px] ml-1"
                  onClick={() => setSelectedChar(null)}
                >✕</button>
              </div>
            </div>

            {/* Mood */}
            <div className="mb-2 flex items-center gap-1">
              <span className="text-[8px] text-gray-400 uppercase tracking-wider">Mood</span>
              <span className="text-[8px] font-bold" style={{ color }}>{cp.mood}</span>
            </div>

            {/* Status */}
            <div className="mb-2">
              <span
                className="text-[8px] px-1.5 py-0.5 rounded font-bold tracking-wider"
                style={{
                  background: isWorking ? `${color}22` : '#ffffff11',
                  color: isWorking ? color : '#888',
                  border: `1px solid ${isWorking ? color + '44' : '#ffffff11'}`,
                }}
              >
                {agent.status?.toUpperCase() ?? 'IDLE'}
              </span>
            </div>

            {/* Current task + progress */}
            <div className="mb-2">
              <div className="text-[8px] text-gray-400 uppercase tracking-wider mb-1">Current Task</div>
              <div className="text-[9px] text-white leading-tight mb-1">{currentTask}</div>
              <div style={{ height: 4, background: '#ffffff15', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${cp.taskProgress}%`,
                  background: color,
                  borderRadius: 2,
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <div className="text-[7px] text-gray-500 mt-0.5 text-right">{Math.round(cp.taskProgress)}%</div>
            </div>

            {/* Up next */}
            <div className="mb-2">
              <div className="text-[8px] text-gray-400 uppercase tracking-wider mb-1">Up Next</div>
              {nextTasks.map((t, i) => (
                <div key={i} className="text-[8px] text-gray-500 leading-snug">· {t}</div>
              ))}
            </div>

            {/* Completed tasks */}
            {cp.completedTasks.length > 0 && (
              <div>
                <div className="text-[8px] text-gray-400 uppercase tracking-wider mb-1">Completed</div>
                {cp.completedTasks.map((t, i) => (
                  <div key={i} className="text-[8px] leading-snug" style={{ color: color + 'aa' }}>✓ {t}</div>
                ))}
              </div>
            )}

            {/* Last quip */}
            <div className="mt-2 pt-2 border-t border-white/10">
              <div className="text-[8px] text-gray-400 uppercase tracking-wider mb-1">Last Said</div>
              <div className="text-[8px] text-gray-300 italic leading-snug">
                "{(IDLE_QUIPS[selectedChar] ?? ['...'])[cp.quipIndex % (IDLE_QUIPS[selectedChar]?.length ?? 1)]}"
              </div>
            </div>
          </div>
        )
      })()}

      {/* Nav-grid debug overlay — toggle with G */}
      {showDebug && (
        <div className="absolute inset-0 pointer-events-none z-40">
          {/* Grid cells */}
          {NAV_GRID.map((row, r) =>
            row.map((blocked, c) => (
              <div
                key={`${c}-${r}`}
                className="absolute"
                style={{
                  left:   `${c * CELL_W}%`,
                  top:    `${r * CELL_H}%`,
                  width:  `${CELL_W}%`,
                  height: `${CELL_H}%`,
                  background: blocked ? 'rgba(255,60,60,0.35)' : 'rgba(60,255,120,0.08)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxSizing: 'border-box',
                }}
              />
            ))
          )}

          {/* Character A* paths */}
          <svg className="absolute inset-0 w-full h-full overflow-visible">
            {Object.entries(charPos).map(([id, cp]) => {
              const color = AGENT_COLORS[id] ?? '#ffffff'
              const pts = [{ x: cp.x, y: cp.y }, ...cp.path]
              if (pts.length < 2) return null
              return (
                <g key={id}>
                  <polyline
                    points={pts.map(p => `${p.x}%,${p.y}%`).join(' ')}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    opacity="0.75"
                  />
                  {cp.path.map((wp, i) => (
                    <circle key={i} cx={`${wp.x}%`} cy={`${wp.y}%`} r="3" fill={color} opacity="0.6" />
                  ))}
                </g>
              )
            })}
          </svg>

          {/* Legend */}
          <div className="absolute top-10 right-2 bg-[#0f0f1aee] border border-white/10 rounded px-2 py-1.5 text-[8px] leading-4">
            <div className="text-white/60 font-bold mb-1 tracking-widest">NAV GRID [G]</div>
            <div className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-red-500/50 border border-red-400/30" /> BLOCKED</div>
            <div className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-green-400/20 border border-green-400/20" /> WALKABLE</div>
            <div className="flex items-center gap-1 mt-1">
              <svg width="12" height="8"><line x1="0" y1="4" x2="12" y2="4" stroke="white" strokeWidth="1.5" strokeDasharray="3 2"/></svg>
              A* PATH
            </div>
          </div>
        </div>
      )}

      {/* Loading bar */}
      {isLoading && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#0f0f1acc] border border-[#4488ff44] rounded z-20">
          <span className="text-[#4488ff] text-xs animate-pulse tracking-widest">[ MICHAEL IS DELEGATING... ]</span>
        </div>
      )}
    </div>
  )
}
