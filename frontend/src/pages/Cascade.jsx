import { useState, useEffect, useRef } from 'react'
import { useApi } from '../utils/api'
import { Route as RouteIcon, ArrowRight, GitBranch, TrendingUp, Play, Pause, Zap, Radio } from 'lucide-react'
import ErrorState from '../components/ErrorState'
import GlassCard from '../components/GlassCard'
import ScrollReveal from '../components/ScrollReveal'
import AnimatedCounter from '../components/AnimatedCounter'
import PageHeader from '../components/PageHeader'

function PulseNode({ color = '#6366f1', label, delay = 0, active = false }) {
  return (
    <div className="relative flex flex-col items-center gap-2" style={{ animationDelay: `${delay}ms` }}>
      <div className="relative">
        {active && (
          <>
            <div className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: color, opacity: 0.3 }} />
            <div className="absolute inset-[-4px] rounded-full animate-ping" style={{ backgroundColor: color, opacity: 0.15, animationDelay: '300ms' }} />
          </>
        )}
        <div
          className="relative w-12 h-12 rounded-full flex items-center justify-center font-mono text-xs font-bold text-white shadow-lg"
          style={{ backgroundColor: color, boxShadow: active ? `0 0 20px ${color}80` : 'none' }}
        >
          {label?.slice(-3) || '---'}
        </div>
      </div>
      <span className="text-[10px] text-muted font-mono max-w-[60px] text-center truncate">{label}</span>
    </div>
  )
}

function CascadeChainVisualizer({ chain, isPlaying }) {
  const [activeStep, setActiveStep] = useState(-1)
  useEffect(() => {
    if (!isPlaying) { setActiveStep(-1); return }
    setActiveStep(0)
    const timers = chain.chain.map((_, i) => setTimeout(() => setActiveStep(i), i * 900))
    return () => timers.forEach(clearTimeout)
  }, [isPlaying, chain])
  const nodeColors = ['#ef4444', '#f97316', '#eab308', '#6366f1', '#8b5cf6']
  return (
    <div className="flex items-center gap-3 flex-wrap py-4">
      {chain.chain.map((junction, i) => (
        <span key={i} className="flex items-center gap-3">
          <PulseNode label={junction} color={nodeColors[i % nodeColors.length]} active={activeStep >= i} delay={i * 200} />
          {i < chain.chain.length - 1 && (
            <div className="flex flex-col items-center gap-1">
              <div className={`h-0.5 w-10 transition-all duration-700 ${activeStep > i ? 'bg-neon-blue' : 'bg-muted/30'}`} style={{ boxShadow: activeStep > i ? '0 0 8px #6366f180' : 'none' }} />
              <span className="text-[9px] text-muted">~15 min</span>
            </div>
          )}
        </span>
      ))}
    </div>
  )
}

export default function Cascade() {
  const { data, loading, error, refetch } = useApi('/cascade')
  const [playingChain, setPlayingChain] = useState(null)
  const [autoPlay, setAutoPlay] = useState(false)
  const autoPlayRef = useRef(null)
  const pairs = data?.pairs || []
  const chains = data?.chains || []

  useEffect(() => {
    if (!autoPlay || chains.length === 0) { clearInterval(autoPlayRef.current); setPlayingChain(null); return }
    let idx = 0; setPlayingChain(idx)
    autoPlayRef.current = setInterval(() => { idx = (idx + 1) % chains.length; setPlayingChain(idx) }, chains.length > 0 ? chains[0].chain.length * 900 + 1500 : 4000)
    return () => clearInterval(autoPlayRef.current)
  }, [autoPlay, chains])

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Radio}
        title="Cascade Domino Proof"
        subtitle="When one junction jams, nearby junctions cascade within 15 minutes — proven by lag correlation analysis"
        accent="blue"
        actions={
          <button onClick={() => setAutoPlay(v => !v)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${autoPlay ? 'bg-signal-red/20 text-signal-red border border-signal-red/30' : 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30'}`}>
            {autoPlay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {autoPlay ? 'Stop' : 'Animate'}
          </button>
        }
      />

      <ScrollReveal delay={100}>
        <div className="grid grid-cols-3 gap-4">
          <GlassCard className="p-5 text-center"><p className="metric-label mb-1">Pairs Tested</p><AnimatedCounter value={data?.total_tested || 0} className="text-3xl text-chalk font-mono font-bold tracking-tight" /></GlassCard>
          <GlassCard className="p-5 text-center border-signal-emerald/10"><p className="metric-label mb-1">Significant (r&gt;0.2)</p><AnimatedCounter value={data?.significant_count || 0} className="text-3xl text-signal-emerald font-mono font-bold tracking-tight" /></GlassCard>
          <GlassCard className="p-5 text-center border-neon-blue/10"><p className="metric-label mb-1">Cascade Chains</p><AnimatedCounter value={chains.length} className="text-3xl text-neon-blue font-mono font-bold tracking-tight" /></GlassCard>
        </div>
      </ScrollReveal>

      {chains.length > 0 && (
        <ScrollReveal delay={200}>
          <GlassCard className="p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-blue/40 to-transparent" />
            <div className="flex items-center gap-3 mb-4">
              <GitBranch className="w-5 h-5 text-neon-blue" />
              <h2 className="font-heading font-semibold text-lg text-chalk">Cascade Chain Animations</h2>
              <span className="ml-auto text-[10px] bg-neon-blue/10 text-neon-blue px-2 py-0.5 rounded-full font-semibold">{autoPlay ? 'AUTO-PLAYING' : 'Click Animate'}</span>
            </div>
            <div className="space-y-6">
              {chains.map((chain, i) => (
                <div key={i} className={`p-4 rounded-xl border transition-all cursor-pointer ${playingChain === i ? 'border-neon-blue/40 bg-neon-blue/5 shadow-sm' : 'border-border bg-surface/40 hover:border-neon-blue/20'}`} onClick={() => setPlayingChain(playingChain === i ? null : i)}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted font-semibold uppercase tracking-widest">Chain #{i + 1} — {chain.chain.length} junctions</span>
                    <div className="flex gap-4 text-xs text-muted"><span>Correlation: <span className="text-chalk font-mono font-bold">{chain.total_correlation?.toFixed(3)}</span></span><span>Span: <span className="text-chalk font-mono font-bold">{Math.round(chain.total_distance)}m</span></span></div>
                  </div>
                  <CascadeChainVisualizer chain={chain} isPlaying={playingChain === i} />
                </div>
              ))}
            </div>
          </GlassCard>
        </ScrollReveal>
      )}

      <ScrollReveal delay={300}>
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-signal-emerald" />
            <h2 className="font-heading font-semibold text-lg text-chalk">Significant Junction Pairs</h2>
          </div>
          {pairs.length > 0 ? (
            <div className="space-y-2">
              {pairs.map((pair, i) => (
                <div key={i} className="p-3 rounded-xl bg-surface/40 border border-border hover:border-neon-blue/20 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-chalk text-xs font-semibold">{pair.from_junction}</span>
                    <ArrowRight className="w-3 h-3 text-neon-blue shrink-0" />
                    <span className="font-mono text-chalk text-xs font-semibold">{pair.to_junction}</span>
                    <span className="ml-auto text-xs text-muted font-mono">{pair.distance_m}m apart</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-elevated/40 rounded-full overflow-hidden border border-border">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.abs(pair.correlation) * 100}%`, backgroundColor: pair.correlation > 0.5 ? '#22c55e' : pair.correlation > 0.3 ? '#0A84FF' : '#6b7280' }} />
                    </div>
                    <span className={`font-mono text-xs font-bold w-12 text-right ${pair.correlation > 0.5 ? 'text-signal-emerald' : pair.correlation > 0.3 ? 'text-neon-blue' : 'text-muted'}`}>r={pair.correlation}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-center py-8">No significant pairs found</p>
          )}
        </GlassCard>
      </ScrollReveal>

      <ScrollReveal delay={400}>
        <GlassCard className="p-6 border-neon-blue/10">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-blue/30 to-transparent" />
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-neon-blue shrink-0 mt-0.5" />
            <div>
              <h3 className="font-heading font-semibold text-neon-blue mb-2">What This Proves</h3>
              <p className="text-sm text-muted leading-relaxed">When violations spike at one junction, nearby junctions see increased violations within <span className="text-chalk font-medium">15–30 minutes</span>. This <span className="text-chalk font-medium">causal cascade relationship</span> enables BTP to <span className="text-chalk font-medium">pre-position enforcement</span> before a junction tips into gridlock — turning reactive patrol into predictive prevention.</p>
            </div>
          </div>
        </GlassCard>
      </ScrollReveal>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-elevated animate-pulse" /><div><div className="h-7 w-48 bg-elevated rounded-lg animate-pulse" /></div></div>
      <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="glass-card-static h-24 bg-elevated/50 animate-pulse" />)}</div>
      <div className="glass-card-static h-80 bg-elevated/50 animate-pulse" />
    </div>
  )
}
