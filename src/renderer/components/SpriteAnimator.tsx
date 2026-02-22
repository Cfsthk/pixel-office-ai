import React, { useEffect, useRef, useState } from 'react'

// Sprite sheet layout: 4 cols x 3 rows, each frame 48x48
// Row 0 = idle (4 frames)
// Row 1 = working (4 frames)
// Row 2 = walking (4 frames)

export type AnimState = 'idle' | 'working' | 'walking'

interface Props {
  src: string
  state: AnimState
  direction?: 'left' | 'right' | 'down' // walking direction for flip
  scale?: number
  color?: string   // glow color
  frameSize?: number
  fps?: number
}

const ROW: Record<AnimState, number> = {
  idle:    0,
  working: 1,
  walking: 2,
}

const FPS: Record<AnimState, number> = {
  idle:    2,
  working: 4,
  walking: 8,
}

const FRAME_COUNT = 4

export function SpriteAnimator({
  src,
  state,
  direction = 'down',
  scale = 2,
  color = '#ffffff',
  frameSize = 48,
  fps,
}: Props) {
  const [frame, setFrame] = useState(0)
  const frameRef = useRef(0)
  const rafRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const effectiveFps = fps ?? FPS[state]
  const interval = 1000 / effectiveFps

  useEffect(() => {
    frameRef.current = 0
    setFrame(0)

    const tick = () => {
      frameRef.current = (frameRef.current + 1) % FRAME_COUNT
      setFrame(frameRef.current)
      rafRef.current = setTimeout(tick, interval)
    }

    rafRef.current = setTimeout(tick, interval)
    return () => {
      if (rafRef.current) clearTimeout(rafRef.current)
    }
  }, [state, effectiveFps])

  const row = ROW[state]
  const frameX = frame * frameSize
  const frameY = row * frameSize

  const displayW = frameSize * scale
  const displayH = frameSize * scale

  const flipX = direction === 'left' ? -1 : 1

  const glowIntensity = state === 'working' ? 8 : state === 'idle' ? 2 : 4

  return (
    <div
      style={{
        width: displayW,
        height: displayH,
        overflow: 'hidden',
        imageRendering: 'pixelated',
        flexShrink: 0,
        transform: `scaleX(${flipX})`,
        filter: `drop-shadow(0 0 ${glowIntensity}px ${color}${state === 'working' ? 'cc' : '66'})`,
        transition: 'filter 0.3s ease',
      }}
    >
      <img
        src={src}
        alt=""
        style={{
          imageRendering: 'pixelated',
          // The sheet is 4 frames wide x 3 rows tall
          // We need to position so only the current frame is visible
          width: frameSize * FRAME_COUNT * scale,
          height: frameSize * 3 * scale,
          objectFit: 'none',
          objectPosition: `-${frameX * scale}px -${frameY * scale}px`,
          display: 'block',
        }}
      />
    </div>
  )
}

// Fallback colored block when no sprite image available
export function FallbackSprite({
  state,
  color,
  scale = 2,
}: {
  state: AnimState
  color: string
  scale?: number
}) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), state === 'walking' ? 120 : state === 'working' ? 200 : 600)
    return () => clearInterval(id)
  }, [state])

  const bobY = state !== 'idle' ? Math.sin(tick * 0.8) * 2 : Math.sin(tick * 0.3) * 1
  const size = 14 * scale

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        transform: `translateY(${bobY}px)`,
        transition: 'transform 0.1s linear',
        filter: `drop-shadow(0 0 ${state === 'working' ? 8 : 3}px ${color}88)`,
      }}
    >
      {/* Head */}
      <div style={{ width: size * 0.6, height: size * 0.6, background: color, borderRadius: 2 }} />
      {/* Body */}
      <div style={{ width: size * 0.7, height: size * 0.8, background: color, opacity: 0.85, borderRadius: 2 }} />
      {/* Legs */}
      <div style={{ display: 'flex', gap: 2 }}>
        <div style={{
          width: size * 0.3,
          height: size * 0.5,
          background: color,
          opacity: 0.7,
          borderRadius: 2,
          transform: state === 'walking' ? `rotate(${tick % 2 === 0 ? 15 : -15}deg)` : 'none',
          transformOrigin: 'top center',
        }} />
        <div style={{
          width: size * 0.3,
          height: size * 0.5,
          background: color,
          opacity: 0.7,
          borderRadius: 2,
          transform: state === 'walking' ? `rotate(${tick % 2 === 0 ? -15 : 15}deg)` : 'none',
          transformOrigin: 'top center',
        }} />
      </div>
    </div>
  )
}
