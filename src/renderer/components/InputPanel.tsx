import React, { useState, useRef, useEffect } from 'react'

interface Props {
  onSubmit: (message: string) => void
  isLoading: boolean
  pendingClarification?: string | null
}

export function InputPanel({ onSubmit, isLoading, pendingClarification }: Props) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isLoading) textareaRef.current?.focus()
  }, [isLoading])

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return
    onSubmit(trimmed)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t border-[#2d4a7a] bg-[#0f0f1a] p-3">
      {pendingClarification && (
        <div className="mb-2 px-3 py-2 bg-[#1e3a5f] border border-[#ffd700] rounded text-xs text-[#ffd700]">
          <span className="font-bold">Boss asks:</span> {pendingClarification}
        </div>
      )}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-3 text-[#4488ff] text-sm font-bold">{'>'}</span>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? 'Working on it...' : 'Give the Boss a task... (Enter to send, Shift+Enter for newline)'}
            disabled={isLoading}
            rows={2}
            className="w-full bg-[#1a1a2e] border border-[#2d4a7a] rounded pl-8 pr-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#4488ff] resize-none font-mono disabled:opacity-50"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-[#4488ff] hover:bg-[#5599ff] disabled:bg-[#2d4a7a] disabled:opacity-50 text-white text-sm font-bold rounded transition-colors font-mono"
        >
          {isLoading ? '...' : 'SEND'}
        </button>
      </div>
      <div className="mt-1 text-[10px] text-[#4488ff44] font-mono">
        Click any character to view their memory
      </div>
    </div>
  )
}
