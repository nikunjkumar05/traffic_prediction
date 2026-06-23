import { useState } from 'react'
import { useApi } from '../utils/api'
import { Shield, Truck, MapPin, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react'
import ErrorState from '../components/ErrorState'
import GlassCard from '../components/GlassCard'
import ScrollReveal from '../components/ScrollReveal'
import AnimatedCounter from '../components/AnimatedCounter'
import PageHeader from '../components/PageHeader'

export default function Dispatch() {
  const [numTrucks, setNumTrucks] = useState(2)
  const { data, loading, error, refetch } = useApi(`/dispatch?num_trucks=${numTrucks}`, [numTrucks])

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const routes = data?.routes || []
  const responses = data?.responses || []
  const summary = data?.summary || {}

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Shield}
        title="Dispatch Plan"
        subtitle="VRP-optimized tow truck routes for maximum congestion clearance"
        accent="text-neon-blue"
        actions={
          <div className="flex items-center gap-2 bg-elevated/40 border border-border rounded-lg px-3 py-1.5">
            <label className="text-xs text-muted font-medium">Trucks:</label>
            <select 
              value={numTrucks} 
              onChange={(e) => setNumTrucks(Number(e.target.value))} 
              className="bg-transparent text-xs text-chalk font-semibold focus:outline-none cursor-pointer"
            >
              {[1,2,3,4].map(n => <option key={n} value={n} className="bg-surface text-chalk">{n} truck{n > 1 ? 's' : ''}</option>)}
            </select>
          </div>
        }
      />

      <ScrollReveal delay={100}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <GlassCard className="p-4 text-center"><p className="metric-label mb-1 text-xs text-muted uppercase tracking-wider">Method</p><p className="text-lg font-mono font-bold text-chalk">{summary.routing_method || 'N/A'}</p></GlassCard>
          <GlassCard className="p-4 text-center"><p className="metric-label mb-1 text-xs text-muted uppercase tracking-wider">Total Stops</p><AnimatedCounter value={summary.total_stops || 0} className="text-3xl font-bold font-mono text-chalk" /></GlassCard>
          <GlassCard className="p-4 text-center"><p className="metric-label mb-1 text-xs text-muted uppercase tracking-wider">Distance</p><p className="text-lg font-mono font-bold text-chalk">{summary.total_distance_km || 0} km</p></GlassCard>
          <GlassCard className="p-4 text-center"><p className="metric-label mb-1 text-xs text-muted uppercase tracking-wider">Top Hotspot</p><p className="text-sm font-mono font-bold text-chalk truncate">{summary.top_hotspot || 'N/A'}</p></GlassCard>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={200}>
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-neon-amber" />
            <h2 className="font-heading font-semibold text-lg text-chalk">Tiered Response Queue</h2>
          </div>
          <div className="space-y-2">
            {responses.map((resp, i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-elevated/10 rounded-xl border border-border hover:border-neon-blue/20 transition-all duration-300">
                <div className={`p-2 rounded-xl ${resp.action === 'PRE_POSITION_TOW_TRUCK' ? 'bg-neon-red/10 text-neon-red' : resp.action === 'COMMUNITY_MARSHAL' ? 'bg-neon-amber/10 text-neon-amber' : 'bg-neon-green/10 text-neon-green'}`}>
                  {resp.action === 'PRE_POSITION_TOW_TRUCK' ? <Truck className="w-4 h-4" /> : resp.action === 'COMMUNITY_MARSHAL' ? <MapPin className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-chalk text-sm truncate">{resp.junction}</p>
                  <p className="text-xs text-muted">{resp.reason}</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-elevated/30 border border-border text-muted whitespace-nowrap uppercase tracking-widest">{resp?.action?.replace(/_/g, ' ') || 'UNKNOWN'}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </ScrollReveal>

      {routes.length > 0 && (
        <ScrollReveal delay={300}>
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Truck className="w-5 h-5 text-neon-blue" />
              <h2 className="font-heading font-semibold text-lg text-chalk">Truck Routes</h2>
            </div>
            <div className="space-y-4">
              {routes.map((route, i) => (
                <div key={i} className="p-4 bg-elevated/10 rounded-xl border border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-neon-blue rounded-xl flex items-center justify-center font-mono font-bold text-white text-sm">T{route?.truck_id ?? '?'}</div>
                    <div><p className="font-medium text-chalk text-sm">Truck {route?.truck_id ?? '?'}</p><p className="text-xs text-muted">{(route?.stops?.length ?? 0)} stops · {route?.total_distance_km ?? 0} km</p></div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(route?.stops ?? []).map((stop, j) => {
                      const hasCoords = typeof stop?.lat === 'number' && typeof stop?.lon === 'number' && !isNaN(stop.lat) && !isNaN(stop.lon);
                      return (
                      <span key={j} className="flex items-center gap-2">
                        {hasCoords ? (
                          <a href={`https://www.google.com/maps?q=${stop.lat},${stop.lon}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 bg-neon-blue/10 text-neon-blue rounded-lg font-mono text-xs hover:bg-neon-blue/20 transition-colors">Stop {j + 1}<ExternalLink className="w-3.5 h-3.5" /></a>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-elevated/60 text-muted rounded-lg font-mono text-xs">Stop {j + 1}</span>
                        )}
                        {j < (route?.stops?.length ?? 0) - 1 && <span className="text-muted">→</span>}
                      </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </ScrollReveal>
      )}
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-elevated animate-pulse" /><div><div className="h-7 w-48 bg-elevated rounded-lg animate-pulse" /></div></div>
      <div className="grid grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="glass-card-static h-20 bg-elevated/50 animate-pulse" />)}</div>
      <div className="glass-card-static h-48 bg-elevated/50 animate-pulse" />
    </div>
  )
}
