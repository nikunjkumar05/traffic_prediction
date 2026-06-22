import { NavLink } from 'react-router-dom'
import { useApi, formatDelay } from '../utils/api'
import {
  Warning, Clock, MapPin, Buildings,
  TrendUp, ShieldCheck, Lightning, ArrowRight, ChartBar, CaretRight,
  CrosshairSimple, Gauge, Signpost
} from '@phosphor-icons/react'
import LoadingSkeleton from '../components/LoadingSkeleton'
import ErrorState from '../components/ErrorState'
import GlassCard from '../components/GlassCard'
import AnimatedCounter from '../components/AnimatedCounter'
import ScrollReveal from '../components/ScrollReveal'

const HERO_IMAGE = '/hero.jpg?v=3'

export default function Overview() {
  const { data, loading, error, refetch } = useApi('/overview')

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState message={error} onRetry={refetch} />
  if (!data) return null

  const stats = [
    { label: 'Total Violations', value: data.total_violations, icon: Warning, color: 'neon-red' },
    { label: 'Total Delay', value: data.total_delay_veh_min, icon: Clock, color: 'neon-amber', display: formatDelay(data.total_delay_veh_min) },
    { label: 'Active Junctions', value: data.total_junctions, icon: MapPin, color: 'neon-blue' },
    { label: 'Police Stations', value: data.total_stations, icon: Buildings, color: 'neon-green' },
  ]

  const tiers = [
    { label: 'CRITICAL', count: data.critical_count, color: 'bg-tier-critical' },
    { label: 'HIGH', count: data.high_count, color: 'bg-tier-high' },
    { label: 'MEDIUM', count: data.medium_count, color: 'bg-tier-medium' },
    { label: 'LOW', count: data.low_count, color: 'bg-tier-low' },
  ]

  const total = data.critical_count + data.high_count + data.medium_count + data.low_count

  return (
    <div className="space-y-8">
      {/* Hero — Apple-style large title */}
      <ScrollReveal>
        <div className="hero-section relative rounded-3xl overflow-hidden">
          <img
            src={HERO_IMAGE}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <div className="relative z-10 p-8 lg:p-12 flex flex-col justify-end min-h-[320px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="glow-dot" />
              <span className="text-[11px] uppercase tracking-[0.25em] text-neon-green font-semibold">
                City Overview
              </span>
            </div>
            <h1 className="font-heading font-extrabold text-[2.5rem] lg:text-[3.5rem] text-chalk tracking-tight leading-[1.05] mb-3">
              DispatchMind
            </h1>
            <p className="text-muted text-[15px] lg:text-lg max-w-xl leading-relaxed">
              Congestion-First Enforcement — Your city's clear path to faster commutes.
            </p>
          </div>
        </div>
      </ScrollReveal>

      {/* Stats Grid — Large, clean cards */}
      <ScrollReveal delay={100}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {stats.map((stat, i) => (
            <OverviewStatCard key={stat.label} {...stat} delay={i * 80} />
          ))}
        </div>
      </ScrollReveal>

      {/* Tier Breakdown */}
      <ScrollReveal delay={200}>
        <GlassCard className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-neon-green/10 flex items-center justify-center border border-neon-green/20">
              <Lightning className="w-6 h-6 text-neon-green" weight="duotone" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-xl text-chalk">Impact Tier Distribution</h2>
              <p className="text-muted text-sm">Violation severity breakdown</p>
            </div>
          </div>

          <div className="space-y-5">
            {tiers.map(({ label, count, color }, i) => {
              const pct = total > 0 ? (count / total * 100) : 0
              return (
                <div key={label} className="flex items-center gap-5">
                  <span className={`tier-badge ${label} w-24 text-center`}>{label}</span>
                  <div className="flex-1 progress-bar">
                    <div
                      className={`progress-bar-fill ${color}`}
                      style={{ width: `${pct}%`, transitionDelay: `${i * 200}ms` }}
                    />
                  </div>
                  <span className="font-mono text-base text-chalk w-20 text-right font-semibold">
                    {count.toLocaleString()}
                  </span>
                  <span className="font-mono text-xs text-muted/50 w-16 text-right">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              )
            })}
          </div>
        </GlassCard>
      </ScrollReveal>

      {/* Pareto Insight */}
      <ScrollReveal delay={300}>
        <GlassCard className="p-8 border-neon-green/10 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/30 to-transparent" />
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-neon-green/10 flex items-center justify-center shrink-0 border border-neon-green/15">
              <TrendUp className="w-7 h-7 text-neon-green" weight="duotone" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-chalk mb-1.5">
                The {data.pareto_pct}% Rule
              </h3>
              <p className="text-muted text-[15px] leading-relaxed">
                Just <span className="font-mono font-bold text-chalk">{data.pareto_pct}%</span> of violations
                cause <span className="font-mono font-bold text-chalk">{data.pareto_impact_pct}%</span> of
                total congestion severity. Focus enforcement on these critical hotspots for maximum impact.
              </p>
            </div>
          </div>
        </GlassCard>
      </ScrollReveal>

      {/* Quick Actions — Clean nav cards */}
      <ScrollReveal delay={400}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionCard
            to="/priority"
            icon={Warning}
            title="Priority Queue"
            desc="What to clear right now"
            color="neon-red"
          />
          <ActionCard
            to="/map"
            icon={MapPin}
            title="Tactical Map"
            desc="Bengaluru violation hotspots"
            color="neon-green"
          />
          <ActionCard
            to="/dispatch"
            icon={Signpost}
            title="Dispatch Plan"
            desc="Tow truck routing"
            color="neon-blue"
          />
        </div>
      </ScrollReveal>
    </div>
  )
}

const OVERVIEW_COLORS = {
  'neon-red': {
    text: 'text-neon-red',
    bg: 'bg-neon-red/10',
    border: 'border-neon-red/15',
  },
  'neon-amber': {
    text: 'text-neon-amber',
    bg: 'bg-neon-amber/10',
    border: 'border-neon-amber/15',
  },
  'neon-green': {
    text: 'text-neon-green',
    bg: 'bg-neon-green/10',
    border: 'border-neon-green/15',
  },
  'neon-blue': {
    text: 'text-neon-blue',
    bg: 'bg-neon-blue/10',
    border: 'border-neon-blue/15',
  },
}

function OverviewStatCard({ label, value, icon: Icon, color, display, delay = 0 }) {
  const colorClasses = OVERVIEW_COLORS[color] || { text: 'text-chalk', bg: 'bg-elevated', border: 'border-border' }
  return (
    <div className="glass-card-static p-5 lg:p-6 group hover:border-muted/20 transition-all duration-500">
      <div className="flex items-center gap-2.5 mb-4">
        <Icon className={`w-5 h-5 ${colorClasses.text}`} weight="duotone" />
        <span className="metric-label text-[10px]">{label}</span>
      </div>
      <AnimatedCounter
        value={display || value}
        className="text-3xl lg:text-4xl text-chalk font-bold font-mono tracking-tight"
      />
    </div>
  )
}

function ActionCard({ to, icon: Icon, title, desc, color }) {
  const colorClasses = OVERVIEW_COLORS[color] || { text: 'text-chalk', bg: 'bg-elevated', border: 'border-border' }
  return (
    <NavLink to={to} className="glass-card p-6 group block hover:border-muted/20 transition-all duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl ${colorClasses.bg} flex items-center justify-center border ${colorClasses.border}`}>
            <Icon className={`w-6 h-6 ${colorClasses.text}`} weight="duotone" />
          </div>
          <div>
            <p className="font-semibold text-chalk text-[15px]">{title}</p>
            <p className="text-sm text-muted mt-0.5">{desc}</p>
          </div>
        </div>
        <CaretRight className="w-5 h-5 text-muted/0 group-hover:text-neon-green transition-all duration-300 group-hover:translate-x-1" weight="bold" />
      </div>
    </NavLink>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="hero-section rounded-3xl bg-elevated animate-pulse min-h-[320px]" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[1,2,3,4].map(i => (
          <div key={i} className="glass-card-static h-28 bg-elevated/50 animate-pulse" />
        ))}
      </div>
      <div className="glass-card-static h-56 bg-elevated/50 animate-pulse" />
      <div className="glass-card-static h-36 bg-elevated/50 animate-pulse" />
    </div>
  )
}
