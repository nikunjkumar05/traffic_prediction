import { useMemo } from "react";
import { useApi, formatDelay, formatNumber } from "../utils/api";
import { Users, AlertTriangle, RefreshCw, TrendingUp } from "lucide-react";
import ErrorState from "../components/ErrorState";
import StatCard from "../components/StatCard";

export default function RepeatOffenders() {
  const { data, loading, error, refetch } = useApi(
    "/repeat-offenders?min_violations=3",
  );

  // ── ALL hooks must be called before any early return ──────────────────────
  const offenders = useMemo(() => data?.offenders ?? [], [data]);

  const totalViolations = useMemo(
    () => offenders.reduce((sum, o) => sum + (o.violation_count ?? 0), 0),
    [offenders],
  );
  // ──────────────────────────────────────────────────────────────────────────

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-chalk flex items-center gap-2">
            <Users className="w-6 h-6 text-tier-high" />
            Repeat Offenders
          </h1>
          <p className="text-muted text-sm mt-1">
            The &lt;1% of vehicles responsible for &gt;20% of high-impact
            violations
          </p>
        </div>
        <button
          onClick={refetch}
          className="flex items-center gap-2 px-3 py-1.5 bg-elevated border border-white/[0.08] rounded-lg text-sm text-muted hover:text-chalk hover:border-accent/30 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Serial Offenders"
          value={data.total_count ?? 0}
          icon={Users}
        />
        <StatCard
          label="Total Violations"
          value={totalViolations}
          icon={AlertTriangle}
        />
      </div>

      {/* Table */}
      <div className="card">
        <h2 className="font-heading font-semibold text-lg text-chalk mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-signal-red" />
          Top Serial Blockers
        </h2>

        {offenders.length > 0 ? (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-3 px-3 text-[10px] uppercase tracking-wider text-muted font-medium">
                    #
                  </th>
                  <th className="text-left py-3 px-3 text-[10px] uppercase tracking-wider text-muted font-medium">
                    Vehicle
                  </th>
                  <th className="text-left py-3 px-3 text-[10px] uppercase tracking-wider text-muted font-medium">
                    Type
                  </th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-wider text-muted font-medium">
                    Violations
                  </th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-wider text-muted font-medium">
                    Total Delay
                  </th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-wider text-muted font-medium">
                    Avg Score
                  </th>
                  <th className="text-left py-3 px-3 text-[10px] uppercase tracking-wider text-muted font-medium">
                    Stations
                  </th>
                </tr>
              </thead>
              <tbody>
                {offenders.map((o, i) => (
                  <tr
                    key={o.vehicle_number ?? i}
                    className="border-b border-white/[0.03] hover:bg-elevated/50 transition-colors"
                  >
                    <td className="py-3 px-3 text-muted text-xs">{i + 1}</td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-medium text-chalk text-xs">
                        {o.vehicle_number ?? "—"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-muted text-xs">
                      {o.top_vehicle ?? "—"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`font-mono font-bold text-sm ${
                          o.violation_count >= 20
                            ? "text-signal-red"
                            : o.violation_count >= 10
                              ? "text-tier-high"
                              : "text-tier-medium"
                        }`}
                      >
                        {o.violation_count}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-muted text-xs">
                      {formatDelay(o.total_delay ?? 0)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-muted text-xs">
                      {typeof o.avg_gridlock === "number"
                        ? o.avg_gridlock.toFixed(1)
                        : "—"}
                    </td>
                    <td
                      className="py-3 px-3 text-muted text-xs max-w-[180px] truncate"
                      title={o.stations}
                    >
                      {o.stations ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-muted mx-auto mb-3" />
            <p className="text-chalk font-medium">No repeat offenders found</p>
            <p className="text-sm text-muted mt-1">
              Try lowering the minimum violations filter
            </p>
          </div>
        )}
      </div>

      {/* Insight card */}
      <div className="card border-tier-high/20 bg-tier-high/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-tier-high to-transparent" />
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-tier-high/10 shrink-0">
            <TrendingUp className="w-5 h-5 text-tier-high" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-tier-high mb-1">
              Operational Insight
            </h3>
            <p className="text-sm text-muted leading-relaxed">
              These{" "}
              <span className="font-mono font-bold text-chalk">
                {data.total_count ?? 0}
              </span>{" "}
              vehicles operate across multiple police jurisdictions, exploiting
              enforcement gaps. A{" "}
              <span className="text-chalk font-medium">
                centralized plate-flag system
              </span>{" "}
              at entry points would significantly reduce repeat violations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-elevated rounded-lg animate-pulse" />
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="stat-card h-24 bg-elevated animate-pulse" />
        ))}
      </div>
      <div className="card h-64 bg-elevated animate-pulse" />
    </div>
  );
}
