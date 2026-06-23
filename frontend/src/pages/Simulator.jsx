import { useState, useEffect, useRef } from 'react'
import { useApi } from '../utils/api'
import { Sliders, TrendingDown, AlertTriangle, MapPin, Zap, IndianRupee, Car, Leaf, Clock } from 'lucide-react'
import ScrollReveal from '../components/ScrollReveal'
import GlassCard from '../components/GlassCard'
import AnimatedCounter from '../components/AnimatedCounter'
import PageHeader from '../components/PageHeader'

function AnimatedMetric({ value, prefix = '', suffix = '', label, color = 'text-signal-emerald', active }) {
  return (
    <div className="text-center">
      <p className={`font-mono font-bold text-2xl ${color}`}>
        {prefix}<AnimatedCounter value={value} duration={1000} active={active} />{suffix}
      </p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
    </div>
  )
}

function ImpactSlider({ baseline, scenario, impactData }) {
  const [revealed, setRevealed] = useState(true)
  const vehiclesSaved = scenario?.vehicles_saved_hr ?? 0
  const economicSaved = scenario?.economic_savings_inr ?? 0
  const co2Saved = scenario?.co2_saved_kg ?? 0
  const pctReduction = scenario?.pct_reduction ?? 0

  return (
    <div className="glass-card border-signal-emerald/20 bg-signal-emerald/5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-signal-emerald to-transparent" />
      <h3 className="font-heading font-semibold text-signal-emerald mb-4 flex items-center gap-2">
        <Zap className="w-4 h-4" />
        Enforcement Impact: Clear Top {scenario?.clear_count || 0} Violations
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <AnimatedMetric value={pctReduction} suffix="%" label="Congestion reduced" color="text-signal-emerald" active={revealed} />
        <AnimatedMetric value={vehiclesSaved} label="Vehicles freed/hr" color="text-neon-blue" active={revealed} />
        <AnimatedMetric value={economicSaved} prefix="₹" label="Economic savings" color="text-tier-medium" active={revealed} />
        <AnimatedMetric value={co2Saved} suffix=" kg" label="CO₂ saved" color="text-signal-emerald" active={revealed} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Before clearance</span>
          <span className="text-chalk font-mono">{baseline?.cost?.toLocaleString()}</span>
        </div>
        <div className="h-3 bg-signal-red/20 rounded-full overflow-hidden relative">
          <div className="h-full bg-signal-red/60 rounded-full" style={{ width: '100%' }} />
        </div>
        <div className="flex items-center justify-between text-xs text-muted">
          <span>After clearance</span>
          <span className="text-signal-emerald font-mono">{scenario?.remaining_cost?.toLocaleString()}</span>
        </div>
        <div className="h-3 bg-elevated rounded-full overflow-hidden relative border border-border">
          <div
            className="h-full bg-signal-emerald/70 rounded-full transition-all duration-1000"
            style={{ width: `${100 - pctReduction}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default function Simulator() {
  const [clearCount, setClearCount] = useState(10)
  const [filterStation, setFilterStation] = useState('ALL')
  const [filterTier, setFilterTier] = useState('ALL')
  const [showImpact, setShowImpact] = useState(false)

  const { data: stationData } = useApi('/stations')
  const { data: impactData } = useApi('/impact-summary')
  const { data, loading, error } = useApi(
    `/simulator?top_n=${clearCount}&filter_station=${filterStation}&filter_tier=${filterTier}`,
    [clearCount, filterStation, filterTier]
  )

  const stationList = stationData?.stations || []
  const baseline = data?.baseline || {}
  const scenarios = data?.scenarios || []
  const activeScenario = scenarios.find(s => s.clear_count === clearCount) || scenarios[scenarios.length - 1]

  useEffect(() => {
    setShowImpact(false)
    const t = setTimeout(() => setShowImpact(true), 300)
    return () => clearTimeout(t)
  }, [clearCount, filterStation, filterTier])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <AlertTriangle className="w-12 h-12 text-signal-red mb-4" />
        <p className="text-sm text-muted">{error}</p>
      </div>
    )
  }

  if (loading) return <LoadingSkeleton />

  return (
    <div className="space-y-6">
      <ScrollReveal>
        <PageHeader
          icon={Sliders}
          iconColor="text-neon-blue"
          title="Counterfactual Impact Simulator"
          subtitle={<span>Answer: <span className="text-chalk italic">"What if we cleared the top N violations right now?"</span></span>}
        />
      </ScrollReveal>

      {/* Controls */}
      <ScrollReveal delay={50}>
        <div className="glass-card">
          <h2 className="font-heading font-semibold text-lg text-chalk mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-neon-blue" />
            Scenario Controls
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Clear Count Slider */}
            <div>
              <label className="text-xs uppercase tracking-wider text-muted font-semibold">
                Clear Top N Violations
              </label>
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted">1</span>
                  <span className="text-xl font-mono font-bold text-neon-blue">{clearCount}</span>
                  <span className="text-xs text-muted">20</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={clearCount}
                  onChange={(e) => setClearCount(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-neon-blue bg-elevated"
                />
                <div className="flex gap-2 mt-3">
                  {[1, 5, 10, 20].map(n => (
                    <button
                      key={n}
                      onClick={() => setClearCount(n)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                        clearCount === n ? 'bg-neon-blue text-white shadow-sm' : 'bg-elevated text-muted hover:bg-neon-blue/20 hover:text-neon-blue'
                      }`}
                    >
                      Top {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Station Filter */}
            <div>
              <label className="text-xs uppercase tracking-wider text-muted font-semibold" htmlFor="station-select">
                Police Station
              </label>
              <select
                id="station-select"
                value={filterStation}
                onChange={(e) => setFilterStation(e.target.value)}
                className="mt-3 w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-chalk focus:outline-none focus:border-neon-blue input-glass"
              >
                <option value="ALL">All Stations</option>
                {stationList.map(s => (
                  <option key={s.station} value={s.station}>{s.station}</option>
                ))}
              </select>
            </div>

            {/* Tier Filter */}
            <div>
              <label className="text-xs uppercase tracking-wider text-muted font-semibold" htmlFor="tier-select">
                Impact Tier
              </label>
              <select
                id="tier-select"
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="mt-3 w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-chalk focus:outline-none focus:border-neon-blue input-glass"
              >
                <option value="ALL">All Tiers</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Animated Impact Panel */}
      {activeScenario && (
        <ScrollReveal delay={100}>
          <ImpactSlider
            baseline={baseline}
            scenario={activeScenario}
            impactData={impactData}
          />
        </ScrollReveal>
      )}

      {/* Baseline vs Cleared side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ScrollReveal delay={150}>
          <div className="glass-card border-signal-red/20">
            <p className="text-xs uppercase tracking-wider text-signal-red font-semibold mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Current Baseline
            </p>
            <p className="metric-value text-signal-red">{baseline.cost?.toLocaleString()}</p>
            <p className="text-xs text-muted mt-1">congestion severity score</p>
            <div className="flex gap-4 mt-3 text-sm text-muted">
              <span className="font-mono">{baseline.violations?.toLocaleString()} violations</span>
              <span className="font-mono">{baseline.junctions} junctions</span>
            </div>
          </div>
        </ScrollReveal>

        {activeScenario && (
          <ScrollReveal delay={180}>
            <div className="glass-card border-signal-emerald/30 bg-signal-emerald/5">
              <p className="text-xs uppercase tracking-wider text-signal-emerald font-semibold mb-1 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> After Clearing {activeScenario.clear_count}
              </p>
              <div className="flex items-baseline gap-3">
                <p className="metric-value text-signal-emerald">{activeScenario.remaining_cost?.toLocaleString()}</p>
                <span className="text-lg font-mono text-signal-emerald font-bold">
                  -{activeScenario.pct_reduction}%
                </span>
              </div>
              <p className="text-xs text-muted mt-1">remaining congestion severity</p>
              <div className="flex gap-4 mt-3 text-sm text-muted">
                <span className="font-mono">{activeScenario.violations_cleared} violations cleared</span>
                <span className="truncate">Top: {activeScenario.top_junction}</span>
              </div>
            </div>
          </ScrollReveal>
        )}
      </div>

      {/* Scenario Comparison with visual bars */}
      {scenarios.length > 0 && (
        <ScrollReveal delay={200}>
          <div className="glass-card">
            <h2 className="font-heading font-semibold text-lg text-chalk mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-signal-emerald" />
              Scenario Comparison
            </h2>
            <div className="space-y-3">
              {scenarios.map((scenario) => (
                <button
                  key={scenario.clear_count}
                  onClick={() => setClearCount(scenario.clear_count)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    clearCount === scenario.clear_count
                      ? 'border-neon-blue bg-neon-blue/10 shadow-sm'
                      : 'border-border bg-elevated/50 hover:border-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-heading font-bold text-sm ${
                        clearCount === scenario.clear_count ? 'bg-neon-blue text-white' : 'bg-muted/20 text-muted'
                      }`}>
                        {scenario.clear_count}
                      </div>
                      <div>
                        <p className="font-semibold text-chalk text-sm">
                          Clear top {scenario.clear_count} violations
                        </p>
                        <p className="text-xs text-muted">
                          {scenario.tier_impact?.CRITICAL || 0} critical · {scenario.tier_impact?.HIGH || 0} high · Focus: {scenario.top_junction}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-signal-emerald">-{scenario.pct_reduction}%</p>
                      <p className="text-xs text-muted">congestion</p>
                    </div>
                  </div>
                  <div className="h-2 bg-elevated rounded-full overflow-hidden border border-border">
                    <div
                      className="h-full bg-gradient-to-r from-signal-emerald/80 to-signal-emerald rounded-full transition-all duration-700"
                      style={{ width: `${scenario.pct_reduction}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* Pareto Insight */}
      {activeScenario && (
        <ScrollReveal delay={250}>
          <div className="glass-card border-neon-blue/20 bg-neon-blue/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-neon-blue to-transparent" />
            <h3 className="font-heading font-semibold text-neon-blue mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Pareto Principle Confirmed
            </h3>
            <p className="text-sm text-muted leading-relaxed">
              Clearing just <span className="text-chalk font-bold font-mono">{activeScenario.clear_count}</span>{' '}
              violation{activeScenario.clear_count !== 1 ? 's' : ''} reduces congestion by{' '}
              <span className="text-signal-emerald font-bold font-mono">-{activeScenario.pct_reduction}%</span> —
              disproportionate impact driven by{' '}
              <span className="text-chalk font-semibold">{activeScenario.top_junction}</span>{' '}
              (<span className="font-mono">{activeScenario.top_junction_pct?.toFixed(1)}%</span> of total severity). This is the Pareto principle in action:
              a handful of enforcement actions deliver outsized congestion relief.
            </p>
          </div>
        </ScrollReveal>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-56 bg-elevated rounded-lg" />
      <div className="glass-card-static h-48" />
      <div className="glass-card-static h-32" />
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card-static h-32" />
        <div className="glass-card-static h-32" />
      </div>
      <div className="glass-card-static h-64" />
    </div>
  )
}
