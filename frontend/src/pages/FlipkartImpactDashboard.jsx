import { useState } from 'react'
import { useApi } from '../utils/api'
import { Truck, Clock, MapPin, TrendingDown, CheckCircle, AlertTriangle, ArrowRight, BarChart3, Gauge, Zap } from 'lucide-react'
import LoadingSkeleton from '../components/LoadingSkeleton'
import ErrorState from '../components/ErrorState'
import GlassCard from '../components/GlassCard'
import AnimatedCounter from '../components/AnimatedCounter'
import ScrollReveal from '../components/ScrollReveal'

const HOUR_LABELS = ['12a','1a','2a','3a','4a','5a','6a','7a','8a','9a','10a','11a','12p','1p','2p','3p','4p','5p','6p','7p','8p','9p','10p','11p']

function GaugeMeter({ value, max, label, color = 'neon-blue' }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const barColor = pct > 75 ? 'bg-signal-red' : pct > 50 ? 'bg-signal-amber' : `bg-${color}`
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted w-20 text-right">{label}</span>
      <div className="flex-1 h-2.5 bg-elevated/60 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-chalk w-12 text-right">{value}</span>
    </div>
  )
}

export default function FlipkartImpactDashboard() {
  const [expandedZone, setExpandedZone] = useState(null)
  const { data: logisticsData, loading: logisticsLoading, error: logisticsError, refetch: refetchLogistics } = useApi('/flipkart-logistics')
  const { data: impactData } = useApi('/impact-summary')

  if (logisticsLoading) return <LoadingSkeleton />
  if (logisticsError) return <ErrorState message={logisticsError} onRetry={refetchLogistics} />

  const recommendations = logisticsData?.recommendations || []
  const impact = logisticsData?.impact || {}
  const hourlyPatterns = logisticsData?.hourly_patterns || []
  const totalViolations = impactData?.total?.total_congestion_cost ? Math.round(impactData.total.total_congestion_cost) : 0
  const topJunctions = impactData?.top_junctions || []

  const avgDelayMin = impact.avg_delivery_time_saved_min || 0
  const annualCrores = impact.annual_savings_crores || 0
  const hotspots = impact.total_delivery_hotspots || 0
  const baysNeeded = impact.total_bays_needed || 0
  const violationsPerWeek = impact.total_violations_per_week || 0

  const highPriorityZones = recommendations.filter(r => r.priority === 'HIGH').length
  const medPriorityZones = recommendations.filter(r => r.priority === 'MEDIUM').length

  const hourMap = {}
  hourlyPatterns.forEach(h => { hourMap[h.hour] = h.violation_count })
  const maxHourly = Math.max(...Object.values(hourMap), 1)

  return (
    <div className="space-y-8">
      <ScrollReveal>
        <div className="bg-gradient-to-br from-[#2874F0] via-[#047BD5] to-[#F37A20]/30 rounded-3xl p-8 relative overflow-hidden border border-[#2874F0]/20">
          <div className="absolute top-[-30%] right-[-10%] w-72 h-72 bg-[#F37A20] opacity-10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#F37A20]/20 rounded-2xl flex items-center justify-center border border-[#F37A20]/30">
                <Truck className="w-6 h-6 text-[#F37A20]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold font-heading text-white">Flipkart Delivery Impact</h1>
                <p className="text-blue-200 text-sm">Last-mile gridlock analysis & green-zone planning</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <GlassCard className="p-4 text-center bg-white/5 border-white/10">
                <p className="text-xs text-blue-200 uppercase tracking-wider mb-1">Annual Savings</p>
                <p className="text-2xl font-bold font-mono text-[#F37A20]">
                  <AnimatedCounter value={annualCrores} decimals={1} /> Cr
                </p>
              </GlassCard>
              <GlassCard className="p-4 text-center bg-white/5 border-white/10">
                <p className="text-xs text-blue-200 uppercase tracking-wider mb-1">Avg Time Saved</p>
                <p className="text-2xl font-bold font-mono text-white">
                  <AnimatedCounter value={avgDelayMin} decimals={1} /> min
                </p>
              </GlassCard>
              <GlassCard className="p-4 text-center bg-white/5 border-white/10">
                <p className="text-xs text-blue-200 uppercase tracking-wider mb-1">Delivery Hotspots</p>
                <p className="text-2xl font-bold font-mono text-white">
                  <AnimatedCounter value={hotspots} />
                </p>
              </GlassCard>
              <GlassCard className="p-4 text-center bg-white/5 border-white/10">
                <p className="text-xs text-blue-200 uppercase tracking-wider mb-1">Loading Bays Needed</p>
                <p className="text-2xl font-bold font-mono text-white">
                  <AnimatedCounter value={baysNeeded} />
                </p>
              </GlassCard>
            </div>
          </div>
        </div>
      </ScrollReveal>

      <div className="grid lg:grid-cols-3 gap-6">
        <ScrollReveal delay={100} className="lg:col-span-2">
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-neon-amber/10 flex items-center justify-center border border-neon-amber/20">
                <BarChart3 className="w-5 h-5 text-neon-amber" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-chalk">Hourly Delivery Violations</h2>
                <p className="text-xs text-muted">Violation frequency by hour of day</p>
              </div>
            </div>
            <div className="flex items-end gap-1.5 h-32">
              {Array.from({ length: 24 }, (_, h) => {
                const count = hourMap[h] || 0
                const height = maxHourly > 0 ? (count / maxHourly) * 100 : 0
                const isPeak = (h >= 11 && h <= 13) || (h >= 17 && h <= 19)
                return (
                  <div key={h} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className={`w-full rounded-t transition-all duration-500 cursor-pointer ${
                        isPeak ? 'bg-signal-red/70 hover:bg-signal-red' : 'bg-neon-blue/40 hover:bg-neon-blue/60'
                      }`}
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[8px] text-muted -rotate-45 origin-left">{HOUR_LABELS[h]}</span>
                    {count > 0 && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-elevated border border-border rounded px-1.5 py-0.5 text-[10px] text-chalk font-mono opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10">
                        {count} violations
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </GlassCard>
        </ScrollReveal>
        <ScrollReveal delay={200}>
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-neon-green/10 flex items-center justify-center border border-neon-green/20">
                <Zap className="w-5 h-5 text-neon-green" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-chalk">Priority Breakdown</h2>
                <p className="text-xs text-muted">Delivery zones by urgency</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="glass-card-static p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-signal-red animate-pulse" />
                  <span className="text-sm text-chalk font-medium">HIGH</span>
                </div>
                <span className="text-lg font-bold font-mono text-signal-red">{highPriorityZones}</span>
              </div>
              <div className="glass-card-static p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-signal-amber" />
                  <span className="text-sm text-chalk font-medium">MEDIUM</span>
                </div>
                <span className="text-lg font-bold font-mono text-signal-amber">{medPriorityZones}</span>
              </div>
              <div className="glass-card-static p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-neon-green" />
                  <span className="text-sm text-chalk font-medium">LOW</span>
                </div>
                <span className="text-lg font-bold font-mono text-neon-green">{recommendations.length - highPriorityZones - medPriorityZones}</span>
              </div>
            </div>
          </GlassCard>
        </ScrollReveal>
      </div>

      {topJunctions.length > 0 && (
        <ScrollReveal delay={200}>
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-signal-red/10 flex items-center justify-center border border-signal-red/20">
                <MapPin className="w-5 h-5 text-signal-red" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-chalk">Top Congestion Hotspots</h2>
                <p className="text-xs text-muted">Junctions with highest delivery impact</p>
              </div>
            </div>
            <div className="space-y-2">
              {topJunctions.slice(0, 8).map((j, i) => (
                <div key={j.junction || i} className="glass-card-static p-3 flex items-center justify-between hover:bg-elevated/40 transition">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted font-mono w-5">{i + 1}</span>
                    <MapPin className="w-4 h-4 text-muted" />
                    <span className="text-sm text-chalk">{j.junction || `Junction ${i + 1}`}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted">
                      <span className="text-chalk font-mono">{j.congestion_cost ? Math.round(j.congestion_cost).toLocaleString() : 0}</span> delay
                    </span>
                    <span className={`text-xs font-bold ${j.operational_status === 'RED' ? 'text-signal-red' : j.operational_status === 'YELLOW' ? 'text-signal-amber' : 'text-neon-green'}`}>
                      {j.operational_status || 'GREEN'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </ScrollReveal>
      )}

      {recommendations.length > 0 && (
        <ScrollReveal delay={250}>
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#F37A20]/10 flex items-center justify-center border border-[#F37A20]/20">
                <CheckCircle className="w-5 h-5 text-[#F37A20]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-chalk">Green Zone Recommendations</h2>
                <p className="text-xs text-muted">Dynamic loading window proposals for Flipkart delivery bays</p>
              </div>
            </div>
            <div className="space-y-3">
              {recommendations.slice(0, 6).map((r, i) => {
                const isExpanded = expandedZone === i
                return (
                  <div
                    key={i}
                    className="glass-card-static border border-border/50 rounded-xl overflow-hidden transition-all duration-300 hover:border-neon-blue/20 cursor-pointer"
                    onClick={() => setExpandedZone(isExpanded ? null : i)}
                  >
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          r.priority === 'HIGH' ? 'bg-signal-red' : r.priority === 'MEDIUM' ? 'bg-signal-amber' : 'bg-neon-green'
                        }`} />
                        <div>
                          <p className="text-sm text-chalk font-medium">{r.zone_name}</p>
                          <p className="text-xs text-muted">
                            {r.recommended_window} &middot; {r.recommended_bays} bay{r.recommended_bays > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-muted">Delay saved</p>
                          <p className="text-sm font-mono font-bold text-chalk">-{r.estimated_delay_reduction_min} min</p>
                        </div>
                        <ArrowRight className={`w-4 h-4 text-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-border/50 pt-3 animate-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted text-xs">Weekly violations</span>
                            <p className="text-chalk font-mono font-medium">{r.delivery_violations_per_week}</p>
                          </div>
                          <div>
                            <span className="text-muted text-xs">Daily cost savings</span>
                            <p className="text-chalk font-mono font-medium">Rs. {r.estimated_daily_cost_saving_inr?.toLocaleString() || 0}</p>
                          </div>
                          <div>
                            <span className="text-muted text-xs">Peak hours</span>
                            <p className="text-chalk font-mono font-medium">{r.peak_hours?.join(', ') || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-muted text-xs">Priority</span>
                            <p className={`font-bold ${
                              r.priority === 'HIGH' ? 'text-signal-red' : r.priority === 'MEDIUM' ? 'text-signal-amber' : 'text-neon-green'
                            }`}>{r.priority}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </GlassCard>
        </ScrollReveal>
      )}

      <ScrollReveal delay={300}>
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center border border-neon-blue/20">
              <TrendingDown className="w-5 h-5 text-neon-blue" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-chalk">City-Wide Delivery Efficiency</h2>
              <p className="text-xs text-muted">Key performance indicators for Flipkart last-mile logistics</p>
            </div>
          </div>
          <div className="space-y-3">
            <GaugeMeter value={violationsPerWeek} max={500} label="Weekly violations" color="neon-blue" />
            <GaugeMeter value={baysNeeded} max={20} label="Loading bays needed" color="neon-amber" />
            <GaugeMeter value={Number(avgDelayMin.toFixed(1))} max={15} label="Avg delay saved (min)" color="neon-green" />
            <GaugeMeter value={hotspots} max={15} label="Active hotspots" color="neon-red" />
            <GaugeMeter value={highPriorityZones} max={recommendations.length || 1} label="High priority zones" color="signal-red" />
          </div>
        </GlassCard>
      </ScrollReveal>
    </div>
  )
}
