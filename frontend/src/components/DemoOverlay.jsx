import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Play, Pause, ChevronRight, ChevronLeft, X, Monitor } from 'lucide-react'
import { subscribe, startDemo, stopDemo, nextStep, prevStep, getState, goToStep } from '../utils/demoMode'

export default function DemoOverlay({ role }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [expanded, setExpanded] = useState(false)
  const [demoState, setDemoState] = useState(getState())

  useEffect(() => {
    return subscribe(setDemoState)
  }, [])

  const handleNavigate = useCallback((path) => {
    const allowedRoles = {
      '/': ['constable', 'si', 'acp'],
      '/priority': ['si', 'acp'],
      '/cascade': ['constable', 'si', 'acp'],
      '/map': ['constable', 'si', 'acp'],
      '/flipkart-impact': ['acp'],
    }
    if (allowedRoles[path]?.includes(role)) {
      navigate(path)
    }
  }, [navigate, role])

  useEffect(() => {
    if (demoState.isActive && demoState.current) {
      handleNavigate(demoState.current.path)
    }
  }, [demoState.current?.path, demoState.isActive, handleNavigate])

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl border shadow-xl transition-all duration-300 hover:scale-105 ${
          demoState.isActive
            ? 'bg-neon-green/20 border-neon-green/40 text-neon-green'
            : 'bg-elevated/90 border-border/50 text-chalk backdrop-blur-xl'
        }`}
      >
        <Monitor className="w-4 h-4" />
        <span className="text-xs font-semibold">{demoState.isActive ? 'Demo Running' : 'Demo Mode'}</span>
      </button>
    )
  }

  const step = demoState.current
  const progress = demoState.total > 0 ? ((demoState.step + 1) / demoState.total) * 100 : 0

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-elevated/95 backdrop-blur-2xl border border-border/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-neon-blue" />
            <span className="text-sm font-bold text-chalk">Guided Demo</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => demoState.isActive ? stopDemo() : startDemo()}
              className={`p-1.5 rounded-lg transition ${
                demoState.isActive ? 'bg-neon-green/20 text-neon-green' : 'text-muted hover:text-chalk hover:bg-elevated'
              }`}
              title={demoState.isActive ? 'Pause' : 'Auto-Play'}
            >
              {demoState.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => setExpanded(false)} className="p-1.5 rounded-lg text-muted hover:text-chalk hover:bg-elevated transition">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-elevated/60">
          <div className="h-full bg-neon-blue transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        {/* Content */}
        <div className="px-4 py-4">
          <p className="text-xs text-muted mb-1">
            Step {demoState.step + 1} of {demoState.total}
          </p>
          <p className="text-sm font-bold text-chalk mb-1">{step?.label}</p>
          <p className="text-xs text-muted/80 leading-relaxed mb-4">{step?.description}</p>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 mb-4">
            {Array.from({ length: demoState.total }, (_, i) => (
              <button
                key={i}
                onClick={() => { goToStep(i); handleNavigate(getState().current.path) }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === demoState.step ? 'bg-neon-blue w-4' : 'bg-elevated/60 hover:bg-muted/40'
                }`}
              />
            ))}
          </div>

          {/* Nav buttons */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => { prevStep(); handleNavigate(getState().current.path) }}
              disabled={demoState.step === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs text-muted hover:text-chalk hover:bg-elevated disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-3 h-3" /> Prev
            </button>
            <span className="text-[10px] text-muted/60 font-mono">{step?.path}</span>
            <button
              onClick={() => { nextStep(); handleNavigate(getState().current.path) }}
              disabled={demoState.step === demoState.total - 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs text-muted hover:text-chalk hover:bg-elevated disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              Next <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
