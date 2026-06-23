import { useState } from 'react'
import { useApi, formatDelay, tierColor } from '../utils/api'
import { AlertTriangle, Clock, Car, MapPin, ExternalLink, Send, CheckCircle, FileText, Gauge, Activity } from 'lucide-react'
import ErrorState from '../components/ErrorState'
import TierBadge from '../components/TierBadge'
import GlassCard from '../components/GlassCard'
import ScrollReveal from '../components/ScrollReveal'
import PageHeader from '../components/PageHeader'

function GPIGauge({ score }) {
  const pct = Math.min(100, Math.max(0, score))
  const color = pct >= 80 ? 'stroke-signal-red' : pct >= 50 ? 'stroke-signal-amber' : 'stroke-neon-green'
  return (
    <div className="flex items-center gap-2">
      <Gauge className="w-4 h-4 text-muted" />
      <div className="flex-1 h-2 bg-elevated/60 rounded-full overflow-hidden w-20">
        <div className={`h-full rounded-full transition-all duration-700 ${
          pct >= 80 ? 'bg-signal-red' : pct >= 50 ? 'bg-signal-amber' : 'bg-neon-green'
        }`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-mono font-bold ${
        pct >= 80 ? 'text-signal-red' : pct >= 50 ? 'text-signal-amber' : 'text-neon-green'
      }`}>{Math.round(pct)}</span>
    </div>
  )
}

function PresenceBar({ pct }) {
  const color = pct >= 70 ? 'bg-signal-red' : pct >= 40 ? 'bg-signal-amber' : 'bg-neon-green'
  return (
    <div className="flex items-center gap-2">
      <Activity className="w-4 h-4 text-muted" />
      <div className="flex-1 h-2 bg-elevated/60 rounded-full overflow-hidden w-16">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-mono ${pct >= 70 ? 'text-signal-red' : 'text-muted'}`}>{pct}%</span>
    </div>
  )
}

export default function PriorityQueue({ role }) {
  const [station, setStation] = useState('ALL')
  const [actionFeedback, setActionFeedback] = useState({})
  const { data: stations } = useApi('/stations')
  const { data, loading, error, refetch } = useApi(`/priority-queue/${station}`, [station])
  const stationList = stations?.stations || []

  const handleAction = (junction, action) => {
    setActionFeedback(prev => ({ ...prev, [junction]: action }))
    setTimeout(() => {
      setActionFeedback(prev => ({ ...prev, [junction]: null }))
    }, 2000)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={AlertTriangle}
        title="Priority Queue"
        subtitle={role === 'constable' ? 'Your top 5 clearance targets — sorted by actionability' : 'Station-wide enforcement priorities'}
        accent="text-neon-red"
        actions={
          <div className="flex items-center gap-2 bg-elevated/40 border border-border rounded-lg px-3 py-1.5">
            <select 
              value={station} 
              onChange={(e) => setStation(e.target.value)} 
              className="bg-transparent text-xs text-chalk font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-surface text-chalk">All Stations</option>
              {stationList.map(s => <option key={s.station} value={s.station} className="bg-surface text-chalk">{s.station}</option>)}
            </select>
          </div>
        }
      />

      {loading ? (
        <div className="space-y-4">{[1,2,3,4,5].map(i => <div key={i} className="glass-card-static h-36 bg-elevated/50 animate-pulse" />)}</div>
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <div className="space-y-4">
          {data?.cards?.map((card, i) => (
            <ScrollReveal key={card.junction} delay={i * 80}>
              <div className={`priority-card ${card.tier.toLowerCase()} border border-border`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="font-mono font-extrabold text-3xl shrink-0" style={{ color: tierColor(card.tier) }}>#{card.rank}</span>
                      <div className="min-w-0">
                        <h3 className="font-heading font-semibold text-base text-chalk truncate">{card.junction}</h3>
                        <p className="text-xs text-muted truncate font-medium">{card.station}</p>
                      </div>
                      <TierBadge tier={card.tier} />
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                      <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-muted" /><span className="font-mono font-semibold text-chalk">{formatDelay(card.total_delay)}</span><span className="text-muted">delay</span></div>
                      <div className="flex items-center gap-1.5"><Car className="w-3.5 h-3.5 text-muted" /><span className="font-mono font-semibold text-chalk">{card.violation_count}</span><span className="text-muted">violations</span></div>
                      <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-muted" /><span className="text-chalk text-xs font-semibold">{card.top_vehicle}</span></div>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2 text-xs">
                      <GPIGauge score={card.gridlock_score} />
                      <PresenceBar pct={card.presence_probability_pct} />
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted">Actionability:</span>
                        <span className="font-mono font-bold text-chalk">{card.actionability_score?.toFixed(1) || card.gridlock_score}</span>
                      </div>
                    </div>
                    {card.explanation && <p className="text-xs text-muted mt-2 leading-relaxed">{card.explanation}</p>}
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => handleAction(card.junction, 'dispatched')}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                          actionFeedback[card.junction] === 'dispatched'
                            ? 'bg-neon-blue/20 border-neon-blue/40 text-neon-blue'
                            : 'border-border text-muted hover:border-neon-blue/30 hover:text-neon-blue hover:bg-neon-blue/5'
                        }`}
                      >
                        <Send className="w-3 h-3" />
                        {actionFeedback[card.junction] === 'dispatched' ? 'Dispatched!' : 'Dispatch'}
                      </button>
                      <button
                        onClick={() => handleAction(card.junction, 'cleared')}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                          actionFeedback[card.junction] === 'cleared'
                            ? 'bg-signal-emerald/20 border-signal-emerald/40 text-signal-emerald'
                            : 'border-border text-muted hover:border-signal-emerald/30 hover:text-signal-emerald hover:bg-signal-emerald/5'
                        }`}
                      >
                        <CheckCircle className="w-3 h-3" />
                        {actionFeedback[card.junction] === 'cleared' ? 'Cleared!' : 'Mark Cleared'}
                      </button>
                      <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-muted hover:border-neon-blue/30 hover:text-neon-blue hover:bg-neon-blue/5 transition-all duration-200">
                        <FileText className="w-3 h-3" />
                        Evidence
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <a href={`https://www.google.com/maps?q=${card.lat},${card.lon}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-elevated/40 border border-transparent hover:border-border transition-all duration-300" title="Open in Maps"><ExternalLink className="w-4 h-4 text-muted hover:text-neon-blue" /></a>
                    <div className="text-right">
                      <p className="text-[10px] text-muted uppercase tracking-wider">GPI</p>
                      <p className={`text-lg font-bold font-mono ${
                        card.gridlock_score >= 80 ? 'text-signal-red' : card.gridlock_score >= 50 ? 'text-signal-amber' : 'text-neon-green'
                      }`}>{Math.round(card.gridlock_score)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
          {data?.cards?.length === 0 && (
            <GlassCard className="text-center py-12">
              <MapPin className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="text-muted font-medium">No violations found for this station</p>
            </GlassCard>
          )}
        </div>
      )}
    </div>
  )
}
