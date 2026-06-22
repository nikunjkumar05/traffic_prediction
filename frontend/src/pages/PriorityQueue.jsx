import { useState } from 'react'
import { useApi, formatDelay, tierColor } from '../utils/api'
import { AlertTriangle, Clock, Car, MapPin, ExternalLink } from 'lucide-react'
import ErrorState from '../components/ErrorState'
import TierBadge from '../components/TierBadge'
import GlassCard from '../components/GlassCard'
import ScrollReveal from '../components/ScrollReveal'
import PageHeader from '../components/PageHeader'

export default function PriorityQueue({ role }) {
  const [station, setStation] = useState('ALL')
  const { data: stations } = useApi('/stations')
  const { data, loading, error, refetch } = useApi(`/priority-queue/${station}`, [station])
  const stationList = stations?.stations || []

  return (
    <div className="space-y-6">
      <PageHeader
        icon={AlertTriangle}
        title="Priority Queue"
        subtitle={role === 'constable' ? 'Your top 5 clearance targets — sorted by congestion damage' : 'Station-wide enforcement priorities'}
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
        <div className="space-y-4">{[1,2,3,4,5].map(i => <div key={i} className="glass-card-static h-28 bg-elevated/50 animate-pulse" />)}</div>
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
                    {card.explanation && <p className="text-xs text-muted mt-3 leading-relaxed">{card.explanation}</p>}
                  </div>
                  <a href={`https://www.google.com/maps?q=${card.lat},${card.lon}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-elevated/40 border border-transparent hover:border-border transition-all duration-300 shrink-0" title="Open in Maps"><ExternalLink className="w-4 h-4 text-muted hover:text-neon-blue" /></a>
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
