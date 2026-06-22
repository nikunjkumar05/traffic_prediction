import { useState } from 'react';
import { FileText, Clock, CheckCircle, XCircle, Users, MapPin, RefreshCw, Eye, AlertTriangle, Car, TrendingUp } from 'lucide-react';
import { useApi } from '../utils/api';
import GlassCard from '../components/GlassCard';
import ScrollReveal from '../components/ScrollReveal';
import PageHeader from '../components/PageHeader';

export default function InspectorDashboard() {
  const [activeTab, setActiveTab] = useState('escalations')
  const { data: priorityQueue, loading: loadingPq, error: errorPq, refetch: refetchPq } = useApi('/priority-queue/ALL?top_n=10')
  const { data: repeatOffenders, loading: loadingRo, error: errorRo, refetch: refetchRo } = useApi('/repeat-offenders?min_violations=3')
  const loading = loadingPq || loadingRo

  if (loading) return <div className="space-y-6"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-elevated animate-pulse" /><div><div className="h-7 w-48 bg-elevated rounded-lg animate-pulse" /></div></div><div className="grid grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="glass-card-static h-20 bg-elevated/50 animate-pulse" />)}</div></div>

  if (errorPq || errorRo) return <div className="flex flex-col items-center justify-center p-12 text-center"><AlertTriangle className="w-12 h-12 text-neon-red mb-4 animate-bounce" /><h2 className="text-lg font-bold text-chalk mb-2">Data Load Error</h2><p className="text-sm text-muted mb-4">{errorPq || errorRo}</p><button onClick={() => { refetchPq(); refetchRo() }} className="btn-primary flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5" /> Retry</button></div>

  const cards = priorityQueue?.cards || []
  const offenders = repeatOffenders?.offenders || []
  const escalations = cards.filter(c => c.tier === 'CRITICAL' || c.tier === 'HIGH')
  const pendingReview = cards.filter(c => c.tier === 'MEDIUM')

  const TABS = [
    { key: 'escalations', label: 'Escalation Queue', icon: AlertTriangle },
    { key: 'evidence', label: 'Evidence Approval', icon: FileText },
    { key: 'offenders', label: 'Repeat Offenders', icon: Car },
    { key: 'performance', label: 'Officer Performance', icon: TrendingUp },
  ]

  return (
    <div className="space-y-6">
      <PageHeader icon={Users} title="SI Inspector Dashboard" subtitle="Escalation queue, evidence approval, and repeat offenders" accent="text-neon-blue"
        actions={<button onClick={() => { refetchPq(); refetchRo() }} className="btn-ghost flex items-center gap-2 hover:bg-elevated/50 px-3 py-1.5 rounded-lg border border-border transition-all"><RefreshCw className="w-3.5 h-3.5 text-neon-blue" /> <span className="text-chalk">Refresh</span></button>}
      />

      <ScrollReveal delay={100}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="glass-card-static p-4 bg-neon-red/10 border border-neon-red/20"><p className="text-[10px] text-neon-red font-bold uppercase tracking-widest">Escalations</p><p className="text-2xl font-bold text-chalk mt-1 font-mono">{escalations.length}</p></div>
          <div className="glass-card-static p-4 bg-neon-amber/10 border border-neon-amber/20"><p className="text-[10px] text-neon-amber font-bold uppercase tracking-widest">Pending Review</p><p className="text-2xl font-bold text-chalk mt-1 font-mono">{pendingReview.length}</p></div>
          <div className="glass-card-static p-4 border border-border"><p className="text-[10px] text-muted font-bold uppercase tracking-widest">Repeat Offenders</p><p className="text-2xl font-bold text-chalk mt-1 font-mono">{offenders.length}</p></div>
          <div className="glass-card-static p-4 bg-neon-green/10 border border-neon-green/20"><p className="text-[10px] text-neon-green font-bold uppercase tracking-widest">Evidence Approved</p><p className="text-2xl font-bold text-chalk mt-1 font-mono">23</p></div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={150}>
        <div className="flex gap-1 p-1 bg-elevated/40 rounded-xl border border-border">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex-1 justify-center ${activeTab === tab.key ? 'bg-neon-blue text-white shadow-[0_4px_12px_rgba(0,122,255,0.3)]' : 'text-muted hover:text-chalk hover:bg-elevated/55'}`}>
              <tab.icon className="w-4 h-4" /><span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </ScrollReveal>

      {activeTab === 'escalations' && (
        <div className="space-y-3">
          {escalations.length === 0 ? (
            <GlassCard className="text-center py-12"><CheckCircle className="w-10 h-10 text-neon-green mx-auto mb-3" /><p className="text-chalk font-semibold">No escalations pending</p></GlassCard>
          ) : escalations.map((card, idx) => (
            <ScrollReveal key={idx} delay={idx * 60}>
              <GlassCard className="hover:border-neon-red/20 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${card.tier === 'CRITICAL' ? 'bg-neon-red/10 border border-neon-red/20' : 'bg-neon-amber/10 border border-neon-amber/20'}`}>
                    <span className={`font-mono text-xl font-bold ${card.tier === 'CRITICAL' ? 'text-neon-red' : 'text-neon-amber'}`}>{card.rank}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-muted" />
                      <span className="text-sm font-medium text-chalk truncate">{card.junction}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${card.tier === 'CRITICAL' ? 'bg-neon-red/10 text-neon-red border-neon-red/20' : 'bg-neon-amber/10 text-neon-amber border-neon-amber/20'}`}>{card.tier}</span>
                    </div>
                    <p className="text-xs text-muted truncate leading-relaxed">{card.explanation}</p>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-muted uppercase tracking-wider">Delay</p>
                      <p className="font-mono text-sm font-bold text-chalk mt-0.5">{card.total_delay}</p>
                    </div>
                    <button className="bg-neon-blue text-white hover:bg-neon-blue/90 text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all shadow-[0_4px_12px_rgba(0,122,255,0.2)]">
                      <Eye className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Review</span>
                    </button>
                  </div>
                </div>
              </GlassCard>
            </ScrollReveal>
          ))}
        </div>
      )}

      {activeTab === 'evidence' && (
        <ScrollReveal>
          <GlassCard className="p-6">
            <h3 className="text-sm font-bold text-chalk mb-4">Evidence Packets Pending Approval</h3>
            <div className="space-y-3">
              {[{ id: 'CL-2024-001', junction: 'BTP044', vehicle: 'KA-01-AB-1234', status: 'pending', time: '2 hrs ago' }, { id: 'CL-2024-002', junction: 'BTP067', vehicle: 'KA-02-CD-5678', status: 'pending', time: '3 hrs ago' }, { id: 'CL-2024-003', junction: 'BTP089', vehicle: 'KA-03-EF-9012', status: 'approved', time: '5 hrs ago' }].map((e, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-elevated/15 border border-border hover:border-neon-blue/20 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <FileText className="w-5 h-5 text-neon-blue" />
                    <div>
                      <p className="text-sm font-semibold text-chalk">{e.id} — {e.junction}</p>
                      <p className="text-xs text-muted font-mono mt-0.5">{e.vehicle} • {e.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {e.status === 'pending' ? (
                      <>
                        <button className="px-3 py-1.5 bg-neon-green text-white text-xs font-bold rounded-lg hover:bg-neon-green/90 transition-all shadow-[0_4px_12px_rgba(52,199,89,0.2)]">Approve</button>
                        <button className="px-3 py-1.5 bg-neon-red text-white text-xs font-bold rounded-lg hover:bg-neon-red/90 transition-all shadow-[0_4px_12px_rgba(255,59,48,0.2)]">Reject</button>
                      </>
                    ) : (
                      <span className="px-2.5 py-1 bg-neon-green/10 text-neon-green text-xs font-bold rounded-lg border border-neon-green/20">APPROVED</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </ScrollReveal>
      )}

      {activeTab === 'offenders' && (
        <ScrollReveal>
          <GlassCard className="p-6">
            <h3 className="text-sm font-bold text-chalk mb-4">Repeat Offenders — {offenders.length} identified</h3>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {['Vehicle', 'Violations', 'Stations', 'Total Delay', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] text-muted/60 font-semibold uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {offenders.slice(0, 10).map((o, idx) => (
                    <tr key={idx} className="border-b border-border hover:bg-elevated/40 transition-colors duration-250">
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><Car className="w-4 h-4 text-muted" /><span className="text-sm font-semibold font-mono text-chalk">{o.vehicle_number || 'N/A'}</span></div></td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 bg-neon-red/10 text-neon-red text-xs font-bold rounded-lg border border-neon-red/20">{o.violation_count}</span></td>
                      <td className="px-4 py-3 text-xs text-muted font-medium">{o.stations}</td>
                      <td className="px-4 py-3 font-mono text-xs text-chalk font-semibold">{o.total_delay?.toFixed(1)}</td>
                      <td className="px-4 py-3">
                        <button className="p-2 hover:bg-neon-blue/10 rounded-lg transition-colors text-neon-blue">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </ScrollReveal>
      )}

      {activeTab === 'performance' && (
        <ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[{ name: 'Officer Kumar', cleared: 23, avg_response: '4.2 min', rating: 'Excellent' }, { name: 'Officer Singh', cleared: 18, avg_response: '5.1 min', rating: 'Good' }, { name: 'Officer Patel', cleared: 15, avg_response: '6.3 min', rating: 'Good' }, { name: 'Officer Sharma', cleared: 12, avg_response: '7.2 min', rating: 'Average' }].map((officer, idx) => (
              <GlassCard key={idx} className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-neon-blue" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-chalk">{officer.name}</p>
                      <p className="text-xs text-muted font-medium mt-0.5">{officer.rating}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border ${
                    officer.rating === 'Excellent' ? 'bg-neon-green/10 text-neon-green border-neon-green/20' : 
                    officer.rating === 'Good' ? 'bg-neon-amber/10 text-neon-amber border-neon-amber/20' : 'bg-elevated/40 border border-border text-muted'
                  }`}>
                    {officer.rating.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-elevated/15 border border-border"><p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Cleared</p><p className="text-lg font-bold text-chalk font-mono mt-1">{officer.cleared}</p></div>
                  <div className="p-3 rounded-xl bg-elevated/15 border border-border"><p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Avg Response</p><p className="text-lg font-bold text-chalk font-mono mt-1">{officer.avg_response}</p></div>
                </div>
              </GlassCard>
            ))}
          </div>
        </ScrollReveal>
      )}
    </div>
  )
}
