import { useState, useEffect } from 'react'
import { useApi } from '../utils/api'
import { Shield, AlertTriangle, TrendingDown, Users, Zap, Activity, RefreshCw, Radio, Car, CheckCircle, ChevronRight } from 'lucide-react'
import ErrorState from '../components/ErrorState'
import GlassCard from '../components/GlassCard'
import AnimatedCounter from '../components/AnimatedCounter'
import ScrollReveal from '../components/ScrollReveal'
import PageHeader from '../components/PageHeader'

export default function CommandCenter() {
  const { data, loading, error, refetch } = useApi('/capacity-status')
  const { data: causalData } = useApi('/causal-impact')
  const [tickerItems, setTickerItems] = useState([])
  const [tickerPaused, setTickerPaused] = useState(false)
  const { data: recentEventsData } = useApi('/recent-events', [], { enabled: !tickerPaused })

  useEffect(() => {
    if (recentEventsData?.events) {
      setTickerItems(recentEventsData.events)
    }
  }, [recentEventsData])

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const summary = data?.summary || {}
  const junctions = data?.junctions || []
  const model = causalData?.model || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Shield}
        title="Command Center"
        subtitle="ACP/DCP view — Top 5 enforcement zones"
        accent="text-neon-blue"
        actions={
          <button onClick={refetch} className="btn-ghost flex items-center gap-2 hover:bg-elevated/50 px-3 py-1.5 rounded-lg border border-border transition-all">
            <RefreshCw className="w-4 h-4 text-neon-blue" /> <span className="text-chalk">Refresh</span>
          </button>
        }
      />

      {/* Live Operations Ticker */}
      <ScrollReveal delay={100}>
        <GlassCard className="overflow-hidden border-neon-blue/10" padding={false}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="glow-dot bg-neon-green shadow-[0_0_8px_var(--color-accent-green)]" />
              <span className="text-[10px] font-bold text-neon-blue uppercase tracking-widest">
                Live Operations
              </span>
            </div>
            <button
              onClick={() => setTickerPaused(!tickerPaused)}
              className="text-[10px] text-muted hover:text-chalk transition-colors uppercase tracking-wider font-semibold"
            >
              {tickerPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
          </div>
          <div className="max-h-44 overflow-y-auto divide-y divide-border">
            {tickerItems.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted">No active operational logs.</div>
            ) : (
              tickerItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-elevated/40 transition-colors"
                >
                  {item.type === 'cleared' && <CheckCircle className="w-4 h-4 text-neon-green shrink-0" />}
                  {item.type === 'dispatched' && <Car className="w-4 h-4 text-neon-blue shrink-0" />}
                  {item.type === 'alert' && <AlertTriangle className="w-4 h-4 text-neon-amber shrink-0" />}
                  {item.type === 'predicted' && <Zap className="w-4 h-4 text-neon-red shrink-0" />}
                  <p className="text-xs text-chalk truncate flex-1">
                    {item.type === 'cleared' && `${item.junction} cleared — ${item.vehicles} vehicles towed by ${item.officer}`}
                    {item.type === 'dispatched' && `${item.officer} dispatched to ${item.junction}`}
                    {item.type === 'alert' && `${item.junction}: ${item.message}`}
                    {item.type === 'predicted' && `${item.junction}: ${item.message}`}
                  </p>
                  <span className="text-[10px] text-muted/60 shrink-0 font-mono">{item.time}</span>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </ScrollReveal>

      {/* City Capacity Status */}
      <ScrollReveal delay={200}>
        <GlassCard className="p-6">
          <p className="text-[10px] uppercase tracking-widest text-muted/60 font-semibold mb-5">
            City Road Capacity Status
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <CapacityStat label="RED (Bottleneck)" value={summary.red_junctions || 0} color="neon-red" />
            <CapacityStat label="YELLOW (Degraded)" value={summary.yellow_junctions || 0} color="neon-amber" />
            <CapacityStat label="GREEN (Normal)" value={summary.green_junctions || 0} color="neon-green" />
            <CapacityStat label="Avg Capacity Loss" value={summary.avg_capacity_loss_pct || 0} suffix="%" color="neon-blue" />
          </div>
        </GlassCard>
      </ScrollReveal>

      {/* Causal Proof */}
      {model.status === 'success' && (
        <ScrollReveal delay={300}>
          <GlassCard className="p-6 border-neon-green/10">
            <div className="flex items-center gap-2 mb-5">
              <div className="glow-dot bg-neon-green shadow-[0_0_8px_var(--color-accent-green)]" />
              <p className="text-[10px] uppercase tracking-widest text-neon-green font-semibold">
                Causal Proof — Validated
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-elevated/20 rounded-xl border border-border">
                <p className="font-mono text-3xl font-bold text-chalk mb-1">R² = {model.r2_score}</p>
                <p className="text-xs text-muted">Regression Accuracy</p>
              </div>
              <div className="p-4 bg-elevated/20 rounded-xl border border-border">
                <p className="font-mono text-3xl font-bold text-chalk mb-1">
                  {model.speed_drop_per_1pct_capacity_loss_kmh} km/h
                </p>
                <p className="text-xs text-muted">Speed Drop per 1% Capacity Loss</p>
              </div>
              <div className="p-4 bg-elevated/20 rounded-xl border border-border">
                <p className="font-mono text-3xl font-bold text-chalk mb-1">
                  {'>'} {model.threshold_for_12kph_drop_pct}%
                </p>
                <p className="text-xs text-muted">Capacity Loss → 12 km/h Drop</p>
              </div>
            </div>
          </GlassCard>
        </ScrollReveal>
      )}

      {/* Top 5 Clear Now */}
      <ScrollReveal delay={400}>
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-red to-neon-amber flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-lg text-chalk">
                Top 5 — Clear Now
              </h2>
              <p className="text-muted text-xs">Highest capacity loss junctions</p>
            </div>
          </div>
          <div className="space-y-2">
            {junctions.slice(0, 5).map((j, i) => (
              <div key={i} className="flex items-center gap-4 p-3.5 bg-elevated/10 rounded-xl border border-border hover:border-neon-blue/20 transition-all duration-300 group">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-sm shrink-0 ${
                  j.status === 'RED' ? 'bg-neon-red text-white' :
                  j.status === 'YELLOW' ? 'bg-neon-amber text-black dark:text-white' :
                  'bg-neon-green text-white'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-chalk text-sm truncate">{j.junction}</p>
                  <p className="text-xs text-muted font-mono">{j.violation_count} violations · {j.footpath_violations} footpath</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-mono font-bold text-lg ${
                    j.capacity_loss_pct > 50 ? 'text-neon-red' :
                    j.capacity_loss_pct > 30 ? 'text-neon-amber' : 'text-neon-green'
                  }`}>
                    {j.capacity_loss_pct}%
                  </p>
                  <p className="text-[10px] text-muted uppercase tracking-wider">capacity loss</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted/0 group-hover:text-neon-blue transition-all shrink-0" />
              </div>
            ))}
          </div>
        </GlassCard>
      </ScrollReveal>

      {/* Bottom Metrics */}
      <ScrollReveal delay={500}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MiniMetric icon={Users} label="Footpath Violations" value={summary.total_footpath_violations || 0} color="neon-amber" />
          <MiniMetric icon={TrendingDown} label="Pedestrian Spillover" value={`${summary.total_pedestrian_spillover_m || 0}m`} color="neon-amber" />
          <MiniMetric icon={Activity} label="Junctions Analyzed" value={summary.total_junctions || 0} color="neon-blue" />
          <MiniMetric icon={Zap} label="Worst Junction" value={summary.worst_capacity_loss_pct ? `${summary.worst_capacity_loss_pct}%` : 'N/A'} color="neon-red" />
        </div>
      </ScrollReveal>
    </div>
  )
}

const COLOR_MAP = {
  'neon-red': 'text-neon-red',
  'neon-amber': 'text-neon-amber',
  'neon-green': 'text-neon-green',
  'neon-blue': 'text-neon-blue',
}

function CapacityStat({ label, value, suffix = '', color }) {
  const textClass = COLOR_MAP[color] || 'text-chalk'
  return (
    <div className="p-4 bg-elevated/15 rounded-xl border border-border text-center">
      <AnimatedCounter
        value={value}
        suffix={suffix}
        className={`text-3xl font-bold font-mono ${textClass}`}
      />
      <p className="text-[10px] text-muted uppercase tracking-widest mt-2 font-semibold">{label}</p>
    </div>
  )
}

function MiniMetric({ icon: Icon, label, value, color }) {
  const textClass = COLOR_MAP[color] || 'text-chalk'
  return (
    <div className="glass-card-static p-4 text-center">
      <Icon className={`w-4 h-4 ${textClass} mx-auto mb-2`} />
      <p className="font-mono font-bold text-lg text-chalk">{value}</p>
      <p className="text-[10px] text-muted uppercase tracking-wider mt-1">{label}</p>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-elevated animate-pulse" />
        <div>
          <div className="h-7 w-48 bg-elevated rounded-lg animate-pulse" />
          <div className="h-4 w-32 bg-elevated rounded mt-2 animate-pulse" />
        </div>
      </div>
      <div className="glass-card-static h-36 bg-elevated/50 animate-pulse" />
      <div className="glass-card-static h-40 bg-elevated/50 animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="glass-card-static h-24 bg-elevated/50 animate-pulse" />)}
      </div>
    </div>
  )
}
