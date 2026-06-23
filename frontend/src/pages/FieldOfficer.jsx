import { useState, useEffect } from 'react'
import { useApi, apiFetch } from '../utils/api'
import { MapPin, Truck, CheckCircle, AlertTriangle, Navigation, Volume2, VolumeX } from 'lucide-react'
import ErrorState from '../components/ErrorState'
import GlassCard from '../components/GlassCard'
import ScrollReveal from '../components/ScrollReveal'
import PageHeader from '../components/PageHeader'

export default function FieldOfficer() {
  const [selectedViolation, setSelectedViolation] = useState(null)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [lastSpoken, setLastSpoken] = useState(null)
  const [actioning, setActioning] = useState(false)
  const [toast, setToast] = useState(null)
  const { data, loading, error, refetch } = useApi('/priority-queue/ALL?top_n=5')

  useEffect(() => {
    if (!voiceEnabled || !data?.cards?.length) return
    const topCard = data.cards[0]
    if (!topCard) return
    const message = `Attention. Priority ${topCard.tier || 'unknown'}. ${topCard.junction || 'unknown'}. ${topCard.violation_count || 0} violations. ${topCard.total_delay || 0} vehicle minutes delay.`
    if (lastSpoken !== message) { speakAlert(message); setLastSpoken(message) }
  }, [data, voiceEnabled, lastSpoken])

  const speakAlert = (text) => { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); const utt = new SpeechSynthesisUtterance(text); utt.rate = 0.9; window.speechSynthesis.speak(utt) } }
  const speakViolation = (card) => speakAlert(`${card.junction}. Priority ${card.tier}. Gridlock score ${card.gridlock_score}. ${card.violation_count} violations.`)

  const handleAction = async (junction, action) => {
    setActioning(true)
    setToast(null)
    try {
      const response = await apiFetch('/api/junctions/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ junction, action, officer: 'Constable Kumar' })
      })
      const result = await response.json()
      if (response.ok) {
        setToast(`Success: ${junction} marked as ${action}!`)
        setSelectedViolation(null)
        refetch()
      } else {
        setToast(`Error: ${result.detail || 'Failed to update'}`)
      }
    } catch (err) {
      setToast(`Error: ${err.message}`)
    } finally {
      setActioning(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const cards = data?.cards || []

  return (
    <div className="space-y-4">
      <PageHeader
        icon={MapPin}
        title="Field Dispatch"
        subtitle="Tap a violation → Go to location → Tow → Done"
        accent="emerald"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setVoiceEnabled(!voiceEnabled)} className={`p-2 rounded-xl transition-all ${voiceEnabled ? 'bg-neon-green text-black font-semibold shadow-sm' : 'bg-surface/50 border border-border text-muted hover:text-chalk'}`} title={voiceEnabled ? 'Disable voice' : 'Enable voice'}>
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button onClick={refetch} className="btn-ghost text-xs">Refresh</button>
          </div>
        }
      />

      {voiceEnabled && (
        <ScrollReveal>
          <div className="flex items-center gap-2 p-3 bg-neon-green/10 border border-neon-green/20 rounded-xl text-xs text-neon-green">
            <Volume2 className="w-4 h-4 animate-pulse" /> Voice alerts enabled — Hands-free operation mode active
          </div>
        </ScrollReveal>
      )}

      {toast && (
        <ScrollReveal>
          <div className="flex items-center gap-2 p-3 bg-neon-green text-black font-medium rounded-xl text-xs shadow-lg animate-in slide-in-from-top-4 duration-300">
            {toast}
          </div>
        </ScrollReveal>
      )}

      <div className="space-y-3">
        {cards.map((card, i) => (
          <ScrollReveal key={i} delay={i * 80}>
            <div onClick={() => setSelectedViolation(selectedViolation === i ? null : i)} className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedViolation === i ? 'bg-neon-green/10 border-neon-green/30' : 'bg-surface/40 border-border hover:bg-surface/70 hover:border-muted/20'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-lg ${i === 0 ? 'bg-signal-red text-white shadow-sm' : i === 1 ? 'bg-tier-high text-white shadow-sm' : 'bg-signal-amber text-black shadow-sm'}`}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-chalk text-sm truncate">{card.junction}</p>
                  <p className="text-xs text-muted font-mono">{card.tier} · {card.top_vehicle}</p>
                </div>
                <div className="text-right"><p className="font-mono font-bold text-lg text-signal-red">{card.total_delay}</p><p className="text-[10px] text-muted font-mono">veh-min</p></div>
              </div>

              {selectedViolation === i && (
                <div className="space-y-3 pt-3 border-t border-border">
                  {voiceEnabled && <button onClick={(e) => { e.stopPropagation(); speakViolation(card) }} className="flex items-center justify-center gap-2 w-full py-2 bg-neon-green/20 text-neon-green rounded-xl text-sm font-medium"><Volume2 className="w-4 h-4" /> Read Aloud</button>}
                  <a href={`https://www.google.com/maps?q=${card.lat},${card.lon}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-signal-emerald rounded-xl text-white font-semibold text-sm active:bg-signal-emerald/80" onClick={(e) => e.stopPropagation()}><Navigation className="w-4 h-4" /> Navigate to Location</a>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-elevated/40 border border-border rounded-lg"><p className="text-muted font-medium">Gridlock Score</p><p className="font-mono font-bold text-chalk">{card.gridlock_score}</p></div>
                    <div className="p-2 bg-elevated/40 border border-border rounded-lg"><p className="text-muted font-medium">Violations</p><p className="font-mono font-bold text-chalk">{card.violation_count}</p></div>
                    <div className="p-2 bg-elevated/40 border border-border rounded-lg"><p className="text-muted font-medium">Coordinates</p><p className="font-mono text-chalk">{card.lat}, {card.lon}</p></div>
                    <div className="p-2 bg-elevated/40 border border-border rounded-lg"><p className="text-muted font-medium">Station</p><p className="font-mono text-chalk">{card.station}</p></div>
                  </div>
                  <p className="text-xs text-muted p-2 bg-elevated/40 border border-border rounded-lg leading-relaxed">{card.explanation}</p>
                  <div className="flex gap-2">
                    <button 
                      disabled={actioning}
                      onClick={(e) => { e.stopPropagation(); handleAction(card.junction, 'towed') }}
                      className="flex-1 py-2 bg-signal-emerald/20 hover:bg-signal-emerald/30 text-signal-emerald rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors"
                    >
                      Towed
                    </button>
                    <button 
                      disabled={actioning}
                      onClick={(e) => { e.stopPropagation(); handleAction(card.junction, 'warned') }}
                      className="flex-1 py-2 bg-signal-amber/20 hover:bg-signal-amber/30 text-signal-amber rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors"
                    >
                      Warned
                    </button>
                    <button 
                      disabled={actioning}
                      onClick={(e) => { e.stopPropagation(); handleAction(card.junction, 'not_found') }}
                      className="flex-1 py-2 bg-signal-red/20 hover:bg-signal-red/30 text-signal-red rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors"
                    >
                      Not Found
                    </button>
                  </div>
                </div>
              )}
            </div>
          </ScrollReveal>
        ))}
      </div>

      {cards.length === 0 && (
        <GlassCard className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-signal-emerald mx-auto mb-3" />
          <p className="text-chalk font-semibold">All Clear</p>
          <p className="text-muted text-sm">No priority violations at this time</p>
        </GlassCard>
      )}
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-elevated animate-pulse" /><div><div className="h-7 w-48 bg-elevated rounded-lg animate-pulse" /></div></div>
      {[1,2,3].map(i => <div key={i} className="glass-card-static h-32 bg-elevated/50 animate-pulse" />)}
    </div>
  )
}
