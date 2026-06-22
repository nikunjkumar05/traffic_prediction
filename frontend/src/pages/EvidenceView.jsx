import { useState } from 'react'
import { useApi } from '../utils/api'
import { FileText, Download, CheckCircle, AlertTriangle, MapPin, Car } from 'lucide-react'
import ErrorState from '../components/ErrorState'
import GlassCard from '../components/GlassCard'
import ScrollReveal from '../components/ScrollReveal'
import PageHeader from '../components/PageHeader'

export default function EvidenceView() {
  const [selectedIdx, setSelectedIdx] = useState(null)
  const { data: priorityData, loading, error } = useApi('/violations?top_n=10')
  const { data: evidenceData, refetch: refetchEvidence } = useApi(selectedIdx !== null ? `/evidence-packet/${selectedIdx}` : null, [selectedIdx], { enabled: selectedIdx !== null })

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState message={error} />

  const cards = priorityData?.cards || []
  const packet = evidenceData?.packet

  return (
    <div className="space-y-6">
      <PageHeader icon={FileText} title="Evidence Packets" subtitle="Auto-generated court-ready challans — click to generate" accent="blue" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScrollReveal>
          <div className="space-y-2">
            <h2 className="text-[10px] uppercase tracking-widest text-muted/60 font-semibold mb-3">Select Violation</h2>
            {cards.map((card, i) => (
              <button key={i} onClick={() => setSelectedIdx(card.violation_idx)} className={`w-full text-left p-3 rounded-xl border transition-all ${selectedIdx === card.violation_idx ? 'bg-neon-blue/10 border-neon-blue/30 text-neon-blue' : 'bg-surface/40 border-border hover:bg-surface/70'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold ${card?.tier === 'CRITICAL' ? 'bg-signal-red text-white shadow-sm' : card?.tier === 'HIGH' ? 'bg-tier-high text-white shadow-sm' : 'bg-signal-amber text-black shadow-sm'}`}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-chalk text-sm truncate">{card?.junction || 'N/A'}</p>
                    <p className="text-xs text-muted"><span className="font-mono font-medium">{card?.top_vehicle || 'N/A'}</span> · <span className="font-mono">{card?.total_delay ?? 0}</span> veh-min</p>
                  </div>
                  <FileText className="w-4 h-4 text-muted" />
                </div>
              </button>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          {packet ? (
            <GlassCard className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div><p className="font-mono font-bold text-neon-blue text-lg">{packet?.challan_id ?? 'N/A'}</p><p className="text-xs text-muted">Generated {packet?.generated_at ? new Date(packet.generated_at).toLocaleTimeString() : 'N/A'}</p></div>
                <button onClick={() => { const html = evidenceData?.html || ''; if (!html) return; const blob = new Blob([html], { type: 'text/html' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${packet?.challan_id || 'evidence'}.html`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000) }} className="btn-primary flex items-center gap-2 text-xs"><Download className="w-3 h-3" /> Download</button>
              </div>
              {packet?.violation && <div className="p-3 bg-elevated/40 rounded-xl border border-border"><p className="text-[10px] text-muted uppercase tracking-widest mb-1">Violation</p><p className="font-semibold text-chalk">{packet.violation.type || 'N/A'}</p><p className="text-xs text-muted font-mono">MV Act Section {packet.violation.mv_act_section || 'N/A'} — {packet.violation.mv_act_penalty || 'N/A'}</p></div>}
              {packet?.location && <div className="p-3 bg-elevated/40 rounded-xl border border-border"><p className="text-[10px] text-muted uppercase tracking-widest mb-1">Location</p><div className="flex items-center gap-2"><MapPin className="w-3 h-3 text-signal-emerald" /><p className="text-chalk text-sm">{packet.location.junction || 'N/A'} · {packet.location.road_name || 'N/A'}</p></div><p className="text-xs text-muted mt-1 font-mono">{packet.location.coordinates || ''}</p></div>}
              {packet?.vehicle && <div className="p-3 bg-elevated/40 rounded-xl border border-border"><p className="text-[10px] text-muted uppercase tracking-widest mb-1">Vehicle</p><div className="flex items-center gap-2"><Car className="w-3 h-3 text-neon-blue" /><p className="text-chalk text-sm">{packet.vehicle.type || 'N/A'} — <span className="font-mono">{packet.vehicle.number || 'N/A'}</span></p></div></div>}
              {packet?.evidence && <div className="p-3 bg-elevated/40 rounded-xl border border-border"><p className="text-[10px] text-muted uppercase tracking-widest mb-2">Impact Evidence</p><div className="grid grid-cols-2 gap-2">
                <div><p className="text-[10px] text-muted font-medium">Congestion Score</p><p className="font-mono font-bold text-signal-red">{packet.evidence.congestion_cost ?? 'N/A'}</p></div>
                <div><p className="text-[10px] text-muted font-medium">Gridlock Score</p><p className="font-mono font-bold text-signal-amber">{packet.evidence.gridlock_score ?? 'N/A'}</p></div>
                <div><p className="text-[10px] text-muted font-medium">Capacity Loss</p><p className="font-mono font-bold text-signal-amber">{packet.evidence.capacity_loss_pct ?? 'N/A'}%</p></div>
                <div><p className="text-[10px] text-muted font-medium">Impact Tier</p><p className="font-mono font-bold text-chalk">{packet.evidence.impact_tier || 'N/A'}</p></div>
              </div></div>}
              {packet?.officer_action && <div className={`p-3 rounded-xl border ${packet.officer_action.recommended === 'TOW' ? 'bg-signal-red/10 border-signal-red/20' : 'bg-signal-amber/10 border-signal-amber/20'}`}><p className="text-xs text-muted uppercase tracking-widest mb-1">Recommended Action</p><div className="flex items-center gap-2">{packet.officer_action.recommended === 'TOW' ? <AlertTriangle className="w-4 h-4 text-signal-red" /> : <CheckCircle className="w-4 h-4 text-signal-amber" />}<p className="font-semibold text-chalk">{packet.officer_action.recommended || 'N/A'} — {packet.officer_action.response_priority || 'N/A'}</p></div></div>}
              {packet?.legal && <div className="p-3 bg-elevated/40 rounded-xl border border-border"><p className="text-[10px] text-muted uppercase tracking-widest mb-1">Evidence Hash</p><p className="font-mono text-[10px] text-muted break-all">{packet.legal.evidence_hash || 'N/A'}</p><p className="text-[10px] text-signal-emerald mt-1 font-medium">✓ Tamper-proof — any modification changes hash</p></div>}
            </GlassCard>
          ) : (
            <GlassCard className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted/20 mb-3" />
              <p className="text-muted text-sm">Select a violation to generate evidence packet</p>
            </GlassCard>
          )}
        </ScrollReveal>
      </div>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-elevated animate-pulse" /><div><div className="h-7 w-48 bg-elevated rounded-lg animate-pulse" /></div></div>
      <div className="grid grid-cols-2 gap-6"><div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-elevated rounded-xl animate-pulse" />)}</div><div className="h-96 bg-elevated rounded-xl animate-pulse" /></div>
    </div>
  )
}
