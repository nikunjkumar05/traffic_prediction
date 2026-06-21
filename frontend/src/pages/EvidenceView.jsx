import { useState } from 'react'
import { useApi } from '../utils/api'
import { FileText, Download, CheckCircle, AlertTriangle, MapPin, Car } from 'lucide-react'
import ErrorState from '../components/ErrorState'

export default function EvidenceView() {
  const [selectedIdx, setSelectedIdx] = useState(null)
  const { data: priorityData, loading, error } = useApi('/priority-queue/ALL?top_n=10')
  const { data: evidenceData, refetch: refetchEvidence } = useApi(
    selectedIdx !== null ? `/evidence-packet/${selectedIdx}` : null,
    [selectedIdx],
    { enabled: selectedIdx !== null }
  )

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState message={error} />

  const cards = priorityData?.cards || []
  const packet = evidenceData?.packet

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading font-bold text-2xl text-chalk flex items-center gap-2">
          <FileText className="w-6 h-6 text-accent" />
          Evidence Packets
        </h1>
        <p className="text-muted text-sm mt-1">Auto-generated court-ready challans — click to generate</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Violation List */}
        <div className="space-y-2">
          <h2 className="font-heading font-semibold text-sm text-chalk uppercase tracking-wider mb-3">
            Select Violation
          </h2>
          {cards.map((card, i) => (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                selectedIdx === i
                  ? 'bg-accent/10 border-accent/30'
                  : 'bg-elevated border-white/[0.06] hover:bg-elevated/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  card.tier === 'CRITICAL' ? 'bg-signal-red text-white' :
                  card.tier === 'HIGH' ? 'bg-signal-orange text-white' :
                  'bg-signal-amber text-black'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-chalk text-sm truncate">{card.junction}</p>
                  <p className="text-xs text-muted">{card.top_vehicle} · {card.total_delay} veh-min</p>
                </div>
                <FileText className="w-4 h-4 text-muted" />
              </div>
            </button>
          ))}
        </div>

        {/* Evidence Packet Preview */}
        <div>
          {packet ? (
            <div className="card space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono font-bold text-accent text-lg">{packet.challan_id}</p>
                  <p className="text-xs text-muted">Generated {new Date(packet.generated_at).toLocaleTimeString()}</p>
                </div>
                <button
                  onClick={() => {
                    const blob = new Blob([evidenceData.html], { type: 'text/html' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${packet.challan_id}.html`
                    a.click()
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-accent rounded-lg text-white text-xs font-semibold"
                >
                  <Download className="w-3 h-3" /> Download
                </button>
              </div>

              {/* Violation */}
              <div className="p-3 bg-elevated rounded-xl">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Violation</p>
                <p className="font-semibold text-chalk">{packet.violation.type}</p>
                <p className="text-xs text-muted">
                  MV Act Section {packet.violation.mv_act_section} — {packet.violation.mv_act_penalty}
                </p>
              </div>

              {/* Location */}
              <div className="p-3 bg-elevated rounded-xl">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Location</p>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-signal-emerald" />
                  <p className="text-chalk text-sm">{packet.location.junction} · {packet.location.road_name}</p>
                </div>
                <p className="text-xs text-muted mt-1">{packet.location.coordinates}</p>
              </div>

              {/* Vehicle */}
              <div className="p-3 bg-elevated rounded-xl">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Vehicle</p>
                <div className="flex items-center gap-2">
                  <Car className="w-3 h-3 text-accent" />
                  <p className="text-chalk text-sm">{packet.vehicle.type} — {packet.vehicle.number}</p>
                </div>
              </div>

              {/* Impact Evidence */}
              <div className="p-3 bg-elevated rounded-xl">
                <p className="text-xs text-muted uppercase tracking-wider mb-2">Impact Evidence</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-muted">Congestion Score</p>
                    <p className="font-mono font-bold text-signal-red">{packet.evidence.congestion_cost}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted">Gridlock Score</p>
                    <p className="font-mono font-bold text-signal-amber">{packet.evidence.gridlock_score}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted">Capacity Loss</p>
                    <p className="font-mono font-bold text-signal-orange">{packet.evidence.capacity_loss_pct}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted">Impact Tier</p>
                    <p className="font-mono font-bold text-chalk">{packet.evidence.impact_tier}</p>
                  </div>
                </div>
              </div>

              {/* Officer Action */}
              <div className={`p-3 rounded-xl ${
                packet.officer_action.recommended === 'TOW'
                  ? 'bg-signal-red/10 border border-signal-red/20'
                  : 'bg-signal-amber/10 border border-signal-amber/20'
              }`}>
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Recommended Action</p>
                <div className="flex items-center gap-2">
                  {packet.officer_action.recommended === 'TOW' ? (
                    <AlertTriangle className="w-4 h-4 text-signal-red" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-signal-amber" />
                  )}
                  <p className="font-semibold text-chalk">
                    {packet.officer_action.recommended} — {packet.officer_action.response_priority}
                  </p>
                </div>
              </div>

              {/* Evidence Hash */}
              <div className="p-3 bg-elevated rounded-xl">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Evidence Hash</p>
                <p className="font-mono text-[10px] text-muted break-all">{packet.legal.evidence_hash}</p>
                <p className="text-[10px] text-signal-emerald mt-1">✓ Tamper-proof — any modification changes hash</p>
              </div>
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted/30 mb-3" />
              <p className="text-muted text-sm">Select a violation to generate evidence packet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-elevated rounded-lg animate-pulse" />
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="h-16 bg-elevated rounded-xl animate-pulse" />)}
        </div>
        <div className="h-96 bg-elevated rounded-xl animate-pulse" />
      </div>
    </div>
  )
}
