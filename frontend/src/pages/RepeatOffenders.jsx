import { useMemo, useState } from "react";
import { useApi, formatDelay } from "../utils/api";
import { Users, AlertTriangle, RefreshCw, TrendingUp, Search, MapPin, ChevronDown, ChevronUp, Clock } from "lucide-react";
import ErrorState from "../components/ErrorState";
import GlassCard from "../components/GlassCard";
import AnimatedCounter from "../components/AnimatedCounter";
import ScrollReveal from "../components/ScrollReveal";
import PageHeader from "../components/PageHeader";

export default function RepeatOffenders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedVehicle, setExpandedVehicle] = useState(null);
  const { data, loading, error, refetch } = useApi("/repeat-offenders?min_violations=3");
  const offenders = useMemo(() => data?.offenders ?? [], [data]);
  const totalViolations = useMemo(() => offenders.reduce((sum, o) => sum + (o.violation_count ?? 0), 0), [offenders]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return offenders;
    const q = searchQuery.toLowerCase();
    return offenders.filter(o =>
      (o.vehicle_number?.toLowerCase() || '').includes(q) ||
      (o.top_vehicle?.toLowerCase() || '').includes(q) ||
      (o.stations?.toLowerCase() || '').includes(q)
    );
  }, [offenders, searchQuery]);

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <PageHeader icon={Users} title="Repeat Offenders" subtitle="The <1% of vehicles responsible for >20% of high-impact violations" accent="text-neon-amber"
        actions={<button onClick={refetch} className="btn-ghost flex items-center gap-2 hover:bg-elevated/50 px-3 py-1.5 rounded-lg border border-border transition-all"><RefreshCw className="w-3.5 h-3.5 text-neon-blue" /> <span className="text-chalk">Refresh</span></button>}
      />

      <ScrollReveal delay={100}>
        <div className="grid grid-cols-3 gap-4">
          <GlassCard className="p-5"><p className="metric-label mb-1 text-xs text-muted uppercase tracking-wider font-semibold">Serial Offenders</p><AnimatedCounter value={data.total_count ?? 0} className="text-3xl font-bold font-mono text-chalk" /></GlassCard>
          <GlassCard className="p-5"><p className="metric-label mb-1 text-xs text-muted uppercase tracking-wider font-semibold">Total Violations</p><AnimatedCounter value={totalViolations} className="text-3xl font-bold font-mono text-chalk" /></GlassCard>
          <GlassCard className="p-5"><p className="metric-label mb-1 text-xs text-muted uppercase tracking-wider font-semibold">Avg per Offender</p><span className="text-3xl font-bold font-mono text-chalk">{(totalViolations / (data.total_count || 1)).toFixed(1)}</span></GlassCard>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={200}>
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-neon-red animate-pulse" />
              <h2 className="font-heading font-semibold text-lg text-chalk">Top Serial Blockers</h2>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by plate, type, station..."
                className="w-56 bg-elevated/60 border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-chalk placeholder:text-muted/50 focus:border-neon-blue/30 focus:outline-none transition"
              />
            </div>
          </div>
          {filtered.length > 0 ? (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-border">
                    {['#', 'Vehicle', 'Type', 'Violations', 'Total Delay', 'Avg Score', 'Stations', ''].map(h => (
                      <th key={h} className={`py-3 px-3 text-[10px] uppercase tracking-widest text-muted/60 font-semibold ${['#','Vehicle','Type','Stations'].includes(h) ? 'text-left' : 'text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o, i) => {
                    const isExpanded = expandedVehicle === o.vehicle_number
                    return (
                      <>
                        <tr key={o.vehicle_number ?? i} className="border-b border-border hover:bg-elevated/40 transition-colors duration-250 cursor-pointer" onClick={() => setExpandedVehicle(isExpanded ? null : o.vehicle_number)}>
                          <td className="py-3 px-3 text-muted/50 text-xs font-mono">{i + 1}</td>
                          <td className="py-3 px-3"><span className="font-mono font-bold text-chalk text-xs bg-elevated/60 px-2 py-1 rounded border border-border">{o.vehicle_number ?? "—"}</span></td>
                          <td className="py-3 px-3 text-muted text-xs font-medium">{o.top_vehicle ?? "—"}</td>
                          <td className="py-3 px-3 text-right"><span className={`font-mono font-bold text-sm ${o.violation_count >= 20 ? 'text-neon-red' : o.violation_count >= 10 ? 'text-neon-amber' : 'text-neon-blue'}`}>{o.violation_count}</span></td>
                          <td className="py-3 px-3 text-right font-mono text-muted text-xs font-medium">{formatDelay(o.total_delay ?? 0)}</td>
                          <td className="py-3 px-3 text-right font-mono text-muted text-xs font-semibold">{typeof o.avg_gridlock === "number" ? o.avg_gridlock.toFixed(1) : "—"}</td>
                          <td className="py-3 px-3 text-muted text-xs max-w-[180px] truncate font-medium" title={o.stations}>{o.stations ?? "—"}</td>
                          <td className="py-3 px-3 text-right">{isExpanded ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}</td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${o.vehicle_number}_detail`}>
                            <td colSpan={8} className="px-6 py-4 bg-elevated/30">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-[10px] text-muted uppercase tracking-widest mb-2 font-semibold">Violation History</p>
                                  <div className="space-y-1.5">
                                    {(o.violation_timestamps || o.junctions || []).slice(0, 5).map((v, vi) => (
                                      <div key={vi} className="flex items-center gap-2 text-xs">
                                        <Clock className="w-3 h-3 text-muted shrink-0" />
                                        <span className="text-muted font-mono">{v.timestamp || `Day ${vi + 1}`}</span>
                                        <MapPin className="w-3 h-3 text-muted shrink-0 ml-1" />
                                        <span className="text-chalk">{v.junction || o.top_junction || 'Unknown'}</span>
                                      </div>
                                    ))}
                                    {(!o.violation_timestamps && !o.junctions) && (
                                      <p className="text-xs text-muted">{o.violation_count} violations across {o.stations || 'multiple'} stations</p>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted uppercase tracking-widest mb-2 font-semibold">Junction Activity Map</p>
                                  <div className="bg-elevated/40 rounded-xl border border-border p-3 h-24 flex items-center justify-center">
                                    <div className="flex flex-wrap gap-1.5">
                                      {(o.junction_list || o.stations?.split(',').filter(Boolean) || ['Junction A', 'Junction B', 'Junction C']).slice(0, 5).map((j, ji) => (
                                        <span key={ji} className="text-[10px] bg-neon-blue/10 text-neon-blue px-2 py-0.5 rounded-full border border-neon-blue/20 font-mono">
                                          {j.trim()}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              {searchQuery ? (
                <>
                  <Search className="w-10 h-10 text-muted mx-auto mb-3" />
                  <p className="text-chalk font-semibold">No offenders matching "{searchQuery}"</p>
                </>
              ) : (
                <>
                  <Users className="w-10 h-10 text-muted mx-auto mb-3" />
                  <p className="text-chalk font-semibold">No repeat offenders found</p>
                </>
              )}
            </div>
          )}
        </GlassCard>
      </ScrollReveal>

      <ScrollReveal delay={300}>
        <GlassCard className="p-6 border-neon-amber/20">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-amber/30 to-transparent" />
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-xl bg-neon-amber/10 border border-neon-amber/20 shrink-0"><TrendingUp className="w-5 h-5 text-neon-amber" /></div>
            <div>
              <h3 className="font-heading font-semibold text-neon-amber mb-1">Operational Insight</h3>
              <p className="text-sm text-muted leading-relaxed">These <span className="font-mono font-bold text-chalk">{data.total_count ?? 0}</span> vehicles operate across multiple police jurisdictions, exploiting enforcement gaps. A <span className="text-chalk font-medium">centralized plate-flag system</span> at entry points would significantly reduce repeat violations.</p>
            </div>
          </div>
        </GlassCard>
      </ScrollReveal>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-elevated animate-pulse" /><div><div className="h-7 w-48 bg-elevated rounded-lg animate-pulse" /></div></div>
      <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="glass-card-static h-20 bg-elevated/50 animate-pulse" />)}</div>
      <div className="glass-card-static h-64 bg-elevated/50 animate-pulse" />
    </div>
  );
}
