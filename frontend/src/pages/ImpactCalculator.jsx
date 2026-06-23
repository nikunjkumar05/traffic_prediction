import { useState } from 'react'
import { useApi } from '../utils/api'
import { Target, TrendingDown, Users, Cloud, ArrowRight, Zap, ChevronRight, BarChart3, MapPin } from 'lucide-react'
import ErrorState from '../components/ErrorState'
import GlassCard from '../components/GlassCard'
import AnimatedCounter from '../components/AnimatedCounter'
import ScrollReveal from '../components/ScrollReveal'
import PageHeader from '../components/PageHeader'

const HERO_IMAGE = '/make_in_india.jpg?v=3'

export default function ImpactCalculator() {
  const [selectedScenario, setSelectedScenario] = useState(5)
  const { data, loading, error, refetch } = useApi('/impact-summary')

  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const total = data?.total || {}
  const scenarios = data?.scenarios || []
  const topJunctions = data?.top_junctions || []
  const activeScenario = scenarios.find(s => s.clear_count === selectedScenario)

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <ScrollReveal>
        <div className="hero-section relative rounded-2xl overflow-hidden border border-border">
          <img
            src={HERO_IMAGE}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-45 dark:opacity-30"
            loading="eager"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-base via-base/40 to-transparent z-0" />
          <div className="relative z-10 p-6 lg:p-8 flex flex-col justify-end min-h-[240px]">
            <div className="flex items-center gap-2 mb-3">
              <div className="glow-dot bg-neon-blue shadow-[0_0_8px_var(--color-accent-blue)]" />
              <span className="text-[10px] uppercase tracking-widest text-neon-blue font-bold">
                Bengaluru Traffic Intelligence
              </span>
            </div>
            <h1 className="font-heading font-extrabold text-3xl lg:text-4xl text-chalk tracking-tight mb-2">
              Impact Calculator
            </h1>
            <p className="text-muted text-sm lg:text-base max-w-xl leading-relaxed">
              Quantify the measurable impact of clearing top congestion junctions.
              Every junction cleared saves vehicles, hours, and rupees.
            </p>
          </div>
        </div>
      </ScrollReveal>

      {/* Impact Summary Cards */}
      <ScrollReveal delay={100}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <MetricCard
            icon={<Zap className="w-5 h-5" />}
            label="Vehicles Blocked/hr"
            value={total.vehicles_blocked_hr || 0}
            color="red"
            delay={0}
          />
          <MetricCard
            icon={<TrendingDown className="w-5 h-5" />}
            label="Economic Loss/hr"
            value={total.economic_loss_inr || 0}
            prefix="INR "
            color="amber"
            delay={100}
          />
          <MetricCard
            icon={<Users className="w-5 h-5" />}
            label="Person-Hours Blocked"
            value={total.person_hours_blocked || 0}
            color="orange"
            delay={200}
          />
          <MetricCard
            icon={<Cloud className="w-5 h-5" />}
            label="CO2 Emissions (kg)"
            value={total.co2_kg || 0}
            color="emerald"
            delay={300}
          />
        </div>
      </ScrollReveal>

      {/* Scenario Selector */}
      <ScrollReveal delay={200}>
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-green to-neon-blue flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-lg text-chalk">
                What-If Scenario
              </h2>
              <p className="text-muted text-xs">Select how many top junctions to clear</p>
            </div>
          </div>

          <div className="flex gap-2.5 mb-6 bg-elevated/40 p-1 rounded-xl border border-border w-fit">
            {[1, 3, 5, 10].map(n => (
              <button
                key={n}
                onClick={() => setSelectedScenario(n)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 ${
                  selectedScenario === n 
                    ? 'bg-neon-blue text-white shadow-[0_4px_12px_rgba(0,122,255,0.3)]' 
                    : 'text-muted hover:text-chalk hover:bg-elevated/35'
                }`}
              >
                Top {n}
              </button>
            ))}
          </div>

          {activeScenario && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Impact Summary */}
              <div className="space-y-3">
                <div className="p-4 bg-elevated/15 rounded-xl border border-border">
                  <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-3">
                    Impact Saved
                  </p>
                  <div className="space-y-3">
                    <ImpactRow
                      label="Vehicles/hr freed"
                      value={activeScenario.vehicles_saved_hr?.toLocaleString()}
                    />
                    <ImpactRow
                      label="Economic savings/hr"
                      value={`INR ${activeScenario.economic_savings_inr?.toLocaleString()}`}
                    />
                    <ImpactRow
                      label="Person-hours saved"
                      value={activeScenario.person_hours_saved?.toLocaleString()}
                    />
                    <ImpactRow
                      label="CO2 reduction"
                      value={`${activeScenario.co2_saved_kg?.toLocaleString()} kg`}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-neon-green/20 bg-neon-green/5">
                  <p className="text-neon-green font-bold text-2xl font-mono">
                    {activeScenario?.pct_of_total_impact ?? 0}%
                  </p>
                  <p className="text-muted text-xs mt-1 leading-relaxed">
                    of total congestion impact eliminated by clearing{' '}
                    <span className="text-chalk font-semibold">{activeScenario?.clear_count ?? 0}</span>{' '}
                    junction{(activeScenario?.clear_count ?? 0) > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Junctions to Clear */}
              <div>
                <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-3">
                  Junctions to Clear
                </p>
                <div className="space-y-2">
                  {activeScenario.junctions?.map((junction, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 bg-elevated/15 rounded-xl border border-border hover:border-neon-blue/20 transition-all duration-300 group"
                    >
                      <span className="w-7 h-7 rounded-lg bg-neon-blue/10 text-neon-blue text-xs font-bold flex items-center justify-center font-mono shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-chalk text-sm font-medium truncate flex-1">{junction}</span>
                      <ChevronRight className="w-4 h-4 text-muted/0 group-hover:text-neon-blue transition-all duration-300" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </GlassCard>
      </ScrollReveal>

      {/* Top Junctions Table */}
      <ScrollReveal delay={300}>
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-red to-neon-amber flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-lg text-chalk">
                Top 15 High-Impact Junctions
              </h2>
              <p className="text-muted text-xs">Ranked by vehicles blocked per hour</p>
            </div>
          </div>

          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-border">
                  {['#', 'Junction', 'Violations', 'Vehicles/hr', 'Economic Loss', 'Gridlock'].map(h => (
                    <th key={h} className={`py-3 px-4 text-[10px] uppercase tracking-widest text-muted/60 font-semibold ${h === 'Junction' ? 'text-left' : h === '#' ? 'text-left' : 'text-right'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topJunctions.map((j, i) => (
                  <tr key={i} className="border-b border-border hover:bg-elevated/40 transition-colors duration-250 group">
                    <td className="py-3 px-4 font-mono text-muted/50 text-xs">{String(i + 1).padStart(2, '0')}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-neon-blue/50 shrink-0" />
                        <span className="font-medium text-chalk text-xs">{j.mapped_junction}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-muted text-xs font-mono">{j.violation_count}</td>
                    <td className="py-3 px-4 text-right font-mono text-neon-red text-xs font-semibold">
                      {j.vehicles_blocked?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-neon-amber text-xs">
                      INR {j.economic_loss?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`inline-flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                        j.avg_gridlock > 70 ? 'bg-neon-red/10 text-neon-red border border-neon-red/20' :
                        j.avg_gridlock > 40 ? 'bg-neon-amber/10 text-neon-amber border border-neon-amber/20' : 'bg-neon-green/10 text-neon-green border border-neon-green/20'
                      }`}>
                        {j.avg_gridlock?.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </ScrollReveal>
    </div>
  )
}

function MetricCard({ icon, label, value, prefix = '', color, delay = 0 }) {
  const colors = {
    red: 'bg-neon-red/10 border-neon-red/20 text-neon-red',
    amber: 'bg-neon-amber/10 border-neon-amber/20 text-neon-amber',
    orange: 'bg-neon-purple/10 border-neon-purple/20 text-neon-purple',
    emerald: 'bg-neon-green/10 border-neon-green/20 text-neon-green',
  }

  return (
    <ScrollReveal delay={delay}>
      <div className={`glass-card-static p-4 lg:p-5 ${colors[color]} border`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="text-chalk">{icon}</div>
          <span className="metric-label text-[9px] uppercase tracking-wider font-semibold text-muted">{label}</span>
        </div>
        <AnimatedCounter
          value={value}
          prefix={prefix}
          className="text-2xl lg:text-3xl font-bold font-mono text-chalk"
        />
      </div>
    </ScrollReveal>
  )
}

function ImpactRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted text-sm">{label}</span>
      <span className="font-mono text-chalk font-semibold text-sm">{value}</span>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="hero-section rounded-2xl bg-elevated animate-pulse min-h-[240px]" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="glass-card-static h-28 bg-elevated/50 animate-pulse" />
        ))}
      </div>
      <div className="glass-card-static h-80 bg-elevated/50 animate-pulse" />
    </div>
  )
}
