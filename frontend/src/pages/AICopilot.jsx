import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Shield,
  Send,
  Volume2,
  ChevronRight,
  Mic,
  Bot,
  Zap,
  RefreshCw,
  AlertCircle,
  User,
} from 'lucide-react'

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const OFFICER_ZONE = 'Koramangala'
const OFFICER_NAME = 'Constable Kumar'

const QUICK_CHIPS = [
  "What's my priority?",
  'KR Market status',
  'Repeat offenders',
  'Silk Board junction',
]

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function speak(text) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.92
  utt.pitch = 1.05
  utt.volume = 1
  const voices = window.speechSynthesis.getVoices()
  const preferred = voices.find(
    (v) => v.lang === 'en-IN' || v.name.toLowerCase().includes('india')
  )
  if (preferred) utt.voice = preferred
  window.speechSynthesis.speak(utt)
}

function now() {
  return new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */

/** Animated typing indicator – three pulsing dots */
function TypingIndicator() {
  return (
    <div className="flex items-end gap-3">
      {/* AI Avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-glow-blue">
        <Shield className="w-4 h-4 text-white" />
      </div>

      {/* Bubble */}
      <div className="bg-elevated/60 backdrop-blur-md border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-lg">
        <div className="flex items-center gap-1.5 h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 bg-neon-blue/70 rounded-full"
              style={{
                animation: `copilot-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/** Single chat bubble */
function ChatBubble({ msg, onSpeak }) {
  const isAI = msg.role === 'ai'

  return (
    <div
      className={`flex items-end gap-3 ${isAI ? '' : 'flex-row-reverse'}`}
      style={{
        animation: 'copilot-slideup 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
      }}
    >
      {/* Avatar */}
      {isAI ? (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-glow-blue">
          <Shield className="w-4 h-4 text-white" />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center flex-shrink-0 border border-border">
          <User className="w-4 h-4 text-chalk/80" />
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[75%] ${isAI ? 'items-start' : 'items-end'}`}>
        {/* Bubble */}
        {isAI ? (
          <div className="bg-elevated/60 backdrop-blur-md border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-lg">
            {msg.error ? (
              <div className="flex items-center gap-2 text-signal-red text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{msg.text}</span>
              </div>
            ) : (
              <p className="text-chalk text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
            )}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-neon-blue to-neon-blue/80 rounded-2xl rounded-br-sm px-4 py-3 shadow-lg shadow-neon-blue/20">
            <p className="text-white text-sm leading-relaxed">{msg.text}</p>
          </div>
        )}

        {/* Timestamp + Voice */}
        <div className={`flex items-center gap-2 ${isAI ? 'ml-1' : 'mr-1'}`}>
          <span className="text-[10px] text-muted font-mono">{msg.time}</span>
          {isAI && !msg.error && (
            <button
              onClick={() => onSpeak(msg.text)}
              className="p-0.5 rounded text-muted hover:text-neon-blue transition-colors"
              title="Read aloud"
            >
              <Volume2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** Quick action chip */
function Chip({ label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-elevated/60 border border-border
                 text-xs text-chalk/80 hover:bg-neon-blue/15 hover:border-neon-blue/30 hover:text-neon-blue
                 active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed
                 backdrop-blur-sm whitespace-nowrap"
    >
      <ChevronRight className="w-3 h-3 opacity-60" />
      {label}
    </button>
  )
}

/** Full-page loading skeleton */
function LoadingSkeleton() {
  return (
    <div className="flex flex-col h-full gap-4 p-4">
      <div className="h-14 w-full rounded-xl bg-elevated animate-pulse" />
      <div className="flex-1 space-y-4 pt-2">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-elevated animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className={`h-4 bg-elevated animate-pulse rounded-lg ${i === 1 ? 'w-4/5' : 'w-3/5'}`} />
              <div className="h-4 bg-elevated animate-pulse rounded-lg w-2/3" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-14 w-full rounded-xl bg-elevated animate-pulse" />
    </div>
  )
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function AICopilot() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isBriefingLoading, setIsBriefingLoading] = useState(true)
  const [briefingError, setBriefingError] = useState(null)
  const [isSending, setIsSending] = useState(false)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)

  /* Auto-scroll to bottom on new messages */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  /* Load shift briefing on mount */
  useEffect(() => {
    loadShiftBriefing()
    return () => abortRef.current?.abort()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadShiftBriefing = useCallback(async () => {
    setIsBriefingLoading(true)
    setBriefingError(null)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(
        `/api/shift-briefing?officer_zone=${encodeURIComponent(OFFICER_ZONE)}&officer_name=${encodeURIComponent(OFFICER_NAME)}`,
        { signal: controller.signal }
      )
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()

      const briefingText =
        data?.briefing_text ||
        data?.message ||
        'Shift briefing loaded. All systems operational.'

      setMessages([
        {
          id: crypto.randomUUID(),
          role: 'ai',
          text: briefingText,
          time: now(),
          error: false,
        },
      ])
    } catch (err) {
      if (err.name === 'AbortError') return
      setBriefingError(err.message)
      setMessages([
        {
          id: crypto.randomUUID(),
          role: 'ai',
          text: `Unable to load shift briefing: ${err.message}. You can still ask me anything.`,
          time: now(),
          error: true,
        },
      ])
    } finally {
      setIsBriefingLoading(false)
    }
  }, [])

  /* Send message */
  const sendMessage = useCallback(
    async (text) => {
      const trimmed = (text || input).trim()
      if (!trimmed || isSending) return

      const userMsg = {
        id: crypto.randomUUID(),
        role: 'user',
        text: trimmed,
        time: now(),
        error: false,
      }
      setMessages((prev) => [...prev, userMsg])
      setInput('')
      setIsTyping(true)
      setIsSending(true)

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await fetch(
          `/api/llm/query?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        )
        if (!res.ok) throw new Error(`Server error: ${res.status}`)
        const data = await res.json()

        const answerText =
          data?.answer ||
          data?.response ||
          data?.message ||
          'I received your query but could not generate a response.'

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'ai',
            text: answerText,
            time: now(),
            error: false,
          },
        ])
      } catch (err) {
        if (err.name === 'AbortError') return
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'ai',
            text: `Unable to get response: ${err.message}. Please try again.`,
            time: now(),
            error: true,
          },
        ])
      } finally {
        setIsTyping(false)
        setIsSending(false)
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    },
    [input, isSending]
  )

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (isBriefingLoading && messages.length === 0) {
    return <LoadingSkeleton />
  }

  return (
    <>
      <style>{`
        @keyframes copilot-slideup {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        @keyframes copilot-bounce {
          0%, 60%, 100% { transform: translateY(0);    opacity: 0.5; }
          30%            { transform: translateY(-5px); opacity: 1;   }
        }
        @keyframes copilot-pulse-dot {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(34,197,94,0.6); }
          50%       { opacity: 0.7; box-shadow: 0 0 0 6px rgba(34,197,94,0); }
        }
        .copilot-pulse-live {
          animation: copilot-pulse-dot 1.8s ease-in-out infinite;
        }
      `}</style>

      <div className="flex flex-col h-full max-h-[calc(100vh-4rem)] bg-base relative overflow-hidden">

        {/* Decorative background glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-neon-blue/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-900/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-0 w-64 h-64 bg-blue-950/20 rounded-full blur-3xl" />
        </div>

        {/* ═══════════ HEADER ═══════════ */}
        <div className="relative z-10 flex-shrink-0 border-b border-border bg-surface/80 backdrop-blur-xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Shield avatar with glow */}
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800
                              flex items-center justify-center shadow-glow-blue flex-shrink-0 animate-pulse-neon">
                <Shield className="w-5 h-5 text-white" />
                {/* subtle inner ring */}
                <div className="absolute inset-0 rounded-xl border border-blue-400/30" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-heading font-bold text-chalk text-base leading-tight tracking-tight">
                    ClearLane AI Copilot
                  </h1>
                  {/* LIVE badge */}
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-signal-emerald/10 border border-signal-emerald/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-signal-emerald copilot-pulse-live" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-signal-emerald">
                      LIVE
                    </span>
                  </span>
                </div>
                <p className="text-[11px] text-muted mt-0.5">
                  {OFFICER_NAME} &middot; {OFFICER_ZONE} Zone
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-elevated border border-border">
                <Zap className="w-3 h-3 text-signal-amber" />
                <span className="text-[10px] font-medium text-muted">AI Powered</span>
              </div>
              {briefingError && (
                <button
                  onClick={loadShiftBriefing}
                  className="p-2 rounded-lg bg-elevated hover:bg-neon-blue/10 text-muted hover:text-neon-blue transition-colors border border-border"
                  title="Retry shift briefing"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════ MESSAGES ═══════════ */}
        <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 space-y-5">

          {/* Empty state */}
          {messages.length === 0 && !isBriefingLoading && (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-800
                              flex items-center justify-center shadow-glow-blue">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-chalk font-semibold">ClearLane AI Copilot</p>
                <p className="text-muted text-sm mt-1">Your intelligent enforcement assistant</p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <ChatBubble key={msg.id} msg={msg} onSpeak={speak} />
          ))}

          {isTyping && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>

        {/* ═══════════ QUICK CHIPS ═══════════ */}
        <div className="relative z-10 flex-shrink-0 px-4 pt-2 pb-0">
          <div
            className="flex items-center gap-2 overflow-x-auto pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {QUICK_CHIPS.map((chip) => (
              <Chip
                key={chip}
                label={chip}
                disabled={isSending || isBriefingLoading}
                onClick={() => sendMessage(chip)}
              />
            ))}
          </div>
        </div>

        {/* ═══════════ INPUT BAR ═══════════ */}
        <div className="relative z-10 flex-shrink-0 px-4 pb-4 pt-2 border-t border-border bg-surface/60 backdrop-blur-xl">
          <div className="flex items-end gap-2">
            {/* Mic */}
            <button
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-elevated border border-border
                         flex items-center justify-center text-muted hover:text-neon-blue
                         hover:border-neon-blue/30 hover:bg-neon-blue/10 transition-all duration-150"
              title="Voice input (coming soon)"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Text input */}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSending || isBriefingLoading}
                rows={1}
                placeholder="Ask about violations, zones, priority queues…"
                className="w-full resize-none bg-elevated/60 border border-border rounded-xl
                           px-4 py-2.5 text-sm text-chalk placeholder-muted
                           focus:outline-none focus:border-neon-blue/40 focus:bg-elevated
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-200 leading-relaxed overflow-y-auto"
                style={{ minHeight: '42px', maxHeight: '128px' }}
                onInput={(e) => {
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
                }}
              />
            </div>

            {/* Send */}
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isSending || isBriefingLoading}
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                         bg-gradient-to-br from-neon-blue to-neon-blue/80
                         hover:from-neon-blue hover:to-neon-blue/90
                         active:scale-95 transition-all duration-150
                         disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
                         shadow-lg shadow-neon-blue/20"
              title="Send (Enter)"
            >
              {isSending ? (
                <RefreshCw className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </div>

          <p className="text-[10px] text-muted/50 mt-1.5 px-1">
            Press Enter to send &middot; Shift+Enter for new line
          </p>
        </div>

      </div>
    </>
  )
}
