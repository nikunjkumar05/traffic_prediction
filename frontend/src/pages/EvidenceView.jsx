import { useState } from 'react'
import { useApi } from '../utils/api'
import { FileText, Download, CheckCircle, AlertTriangle, MapPin, Car, Printer, Clock, Ban, Gavel, Truck } from 'lucide-react'
import ErrorState from '../components/ErrorState'
import GlassCard from '../components/GlassCard'
import ScrollReveal from '../components/ScrollReveal'
import PageHeader from '../components/PageHeader'

const ACTION_OPTIONS = [
  { id: 'TOW', icon: Truck, label: 'Tow Vehicle', color: 'text-signal-red', border: 'border-signal-red/30', bg: 'bg-signal-red/10 hover:bg-signal-red/20' },
  { id: 'CHALLAN', icon: Gavel, label: 'Issue Challan', color: 'text-signal-amber', border: 'border-signal-amber/30', bg: 'bg-signal-amber/10 hover:bg-signal-amber/20' },
  { id: 'WARN', icon: CheckCircle, label: 'Warning Only', color: 'text-neon-green', border: 'border-neon-green/30', bg: 'bg-neon-green/10 hover:bg-neon-green/20' },
  { id: 'DISMISS', icon: Ban, label: 'Dismiss', color: 'text-muted', border: 'border-border', bg: 'bg-elevated/40 hover:bg-elevated/60' },
]

export default function EvidenceView() {
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [officerActions, setOfficerActions] = useState({})
  const { data: priorityData, loading, error } = useApi('/violations?top_n=10')
  const { data: evidenceData } = useApi(selectedIdx !== null ? `/evidence-packet/${selectedIdx}` : null, [selectedIdx], { enabled: selectedIdx !== null })

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState message={error} />

  const cards = priorityData?.cards || []
  const packet = evidenceData?.packet

  const handleOfficerAction = (actionId) => {
    if (!selectedIdx) return
    const key = `violation_${selectedIdx}`
    const timestamp = new Date().toLocaleTimeString()
    setOfficerActions(prev => ({
      ...prev,
      [key]: { action: actionId, timestamp, label: ACTION_OPTIONS.find(a => a.id === actionId)?.label }
    }))
  }

  const handlePrintPDF = () => {
    const html = evidenceData?.html
    if (!html) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 500)
  }

  const activeAction = officerActions[`violation_${selectedIdx}`]

  return (
    <div className="space-y-6">
      <PageHeader icon={FileText} title="Evidence Packets" subtitle="Court-ready challans with officer action log" accent="blue" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScrollReveal>
          <div className="space-y-2">
            <h2 className="text-[10px] uppercase tracking-widest text-muted/60 font-semibold mb-3">Select Violation</h2>
            {cards.map((card, i) => {
              const hasAction = officerActions[`violation_${card.violation_idx}`]
              return (
                <button key={i} onClick={() => setSelectedIdx(card.violation_idx)} className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedIdx === card.violation_idx ? 'bg-neon-blue/10 border-neon-blue/30 text-neon-blue' : 'bg-surface/40 border-border hover:bg-surface/70'
                } ${hasAction ? 'border-l-signal-emerald border-l-4' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold ${card?.tier === 'CRITICAL' ? 'bg-signal-red text-white shadow-sm' : card?.tier === 'HIGH' ? 'bg-tier-high text-white shadow-sm' : 'bg-signal-amber text-black shadow-sm'}`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-chalk text-sm truncate">{card?.junction || 'N/A'}</p>
                      <p className="text-xs text-muted"><span className="font-mono font-medium">{card?.top_vehicle || 'N/A'}</span> · <span className="font-mono">{card?.total_delay ?? 0}</span> veh-min</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasAction && <span className="text-[10px] text-signal-emerald font-medium bg-signal-emerald/10 px-2 py-0.5 rounded-full">{hasAction.label}</span>}
                      <FileText className="w-4 h-4 text-muted" />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          {packet ? (
            <GlassCard className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono font-bold text-neon-blue text-lg">{packet?.challan_id ?? 'N/A'}</p>
                  <p className="text-xs text-muted">Generated {packet?.generated_at ? new Date(packet.generated_at).toLocaleTimeString() : 'N/A'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handlePrintPDF} className="btn-secondary flex items-center gap-2 text-xs" title="Print PDF">
                    <Printer className="w-3 h-3" /> Print
                  </button>
                  <button onClick={() => { const html = evidenceData?.html || ''; if (!html) return; const blob = new Blob([html], { type: 'text/html' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${packet?.challan_id || 'evidence'}.html`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000) }} className="btn-primary flex items-center gap-2 text-xs">
                    <Download className="w-3 h-3" /> Download
                  </button>
                </div>
              </div>

              {packet?.violation && <div className="p-3 bg-elevated/40 rounded-xl border border-border">
                <p className="text-[10px] text-muted uppercase tracking-widest mb-1">Violation</p>
                <p className="font-semibold text-chalk">{packet.violation.type || 'N/A'}</p>
                <p className="text-xs text-muted font-mono">MV Act Section {packet.violation.mv_act_section || 'N/A'} — {packet.violation.mv_act_penalty || 'N/A'}</p>
              </div>}

              {packet?.location && <div className="p-3 bg-elevated/40 rounded-xl border border-border">
                <p className="text-[10px] text-muted uppercase tracking-widest mb-1">Location</p>
                <div className="flex items-center gap-2"><MapPin className="w-3 h-3 text-signal-emerald" /><p className="text-chalk text-sm">{packet.location.junction || 'N/A'} · {packet.location.road_name || 'N/A'}</p></div>
                <p className="text-xs text-muted mt-1 font-mono">{packet.location.coordinates || ''}</p>
              </div>}

              {packet?.vehicle && <div className="p-3 bg-elevated/40 rounded-xl border border-border">
                <p className="text-[10px] text-muted uppercase tracking-widest mb-1">Vehicle</p>
                <div className="flex items-center gap-2"><Car className="w-3 h-3 text-neon-blue" /><p className="text-chalk text-sm">{packet.vehicle.type || 'N/A'} — <span className="font-mono">{packet.vehicle.number || 'N/A'}</span></p></div>
              </div>}

              {packet?.evidence && <div className="p-3 bg-elevated/40 rounded-xl border border-border">
                <p className="text-[10px] text-muted uppercase tracking-widest mb-2">Impact Evidence</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-[10px] text-muted font-medium">Congestion Score</p><p className="font-mono font-bold text-signal-red">{packet.evidence.congestion_cost ?? 'N/A'}</p></div>
                  <div><p className="text-[10px] text-muted font-medium">Gridlock Score</p><p className="font-mono font-bold text-signal-amber">{packet.evidence.gridlock_score ?? 'N/A'}</p></div>
                  <div><p className="text-[10px] text-muted font-medium">Capacity Loss</p><p className="font-mono font-bold text-signal-amber">{packet.evidence.capacity_loss_pct ?? 'N/A'}%</p></div>
                  <div><p className="text-[10px] text-muted font-medium">Impact Tier</p><p className="font-mono font-bold text-chalk">{packet.evidence.impact_tier || 'N/A'}</p></div>
                </div>
              </div>}

              {packet?.officer_action && <div className={`p-3 rounded-xl border ${packet.officer_action.recommended === 'TOW' ? 'bg-signal-red/10 border-signal-red/20' : 'bg-signal-amber/10 border-signal-amber/20'}`}>
                <p className="text-xs text-muted uppercase tracking-widest mb-1">Recommended Action</p>
                <div className="flex items-center gap-2">
                  {packet.officer_action.recommended === 'TOW' ? <AlertTriangle className="w-4 h-4 text-signal-red" /> : <CheckCircle className="w-4 h-4 text-signal-amber" />}
                  <p className="font-semibold text-chalk">{packet.officer_action.recommended || 'N/A'} — {packet.officer_action.response_priority || 'N/A'}</p>
                </div>
              </div>}

              <div>
                <p className="text-[10px] text-muted uppercase tracking-widest mb-2">Officer Action</p>
                {activeAction ? (
                  <div className="p-3 bg-signal-emerald/10 rounded-xl border border-signal-emerald/20 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-signal-emerald" />
                    <div>
                      <p className="text-sm font-semibold text-chalk">{activeAction.label}</p>
                      <p className="text-xs text-muted flex items-center gap-1"><Clock className="w-3 h-3" /> {activeAction.timestamp}</p>
                    </div>
                    <button onClick={() => setOfficerActions(prev => { const n = {...prev}; delete n[`violation_${selectedIdx}`]; return n; })} className="ml-auto text-xs text-muted hover:text-signal-red transition">Undo</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {ACTION_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => handleOfficerAction(opt.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border ${opt.border} ${opt.bg} transition-all duration-200`}
                      >
                        <opt.icon className={`w-4 h-4 ${opt.color}`} />
                        <span className={`text-xs font-medium ${opt.color}`}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {packet?.legal && <div className="p-3 bg-elevated/40 rounded-xl border border-border">
                <p className="text-[10px] text-muted uppercase tracking-widest mb-1">Evidence Hash</p>
                <p className="font-mono text-[10px] text-muted break-all">{packet.legal.evidence_hash || 'N/A'}</p>
                <p className="text-[10px] text-signal-emerald mt-1 font-medium">✓ Tamper-proof — any modification changes hash</p>
              </div>}
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
