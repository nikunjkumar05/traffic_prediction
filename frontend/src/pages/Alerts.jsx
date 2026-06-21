import { useMemo } from "react";
import { useApi } from "../utils/api";
import { AlertTriangle, Bell, MapPin, Car, Zap, RefreshCw } from "lucide-react";
import ErrorState from "../components/ErrorState";

const PRIORITY_CONFIG = {
  CRITICAL: {
    color: "text-signal-red",
    bg: "bg-signal-red/10",
    border: "border-signal-red/20",
  },
  HIGH: {
    color: "text-tier-high",
    bg: "bg-tier-high/10",
    border: "border-tier-high/20",
  },
  MEDIUM: {
    color: "text-tier-medium",
    bg: "bg-tier-medium/10",
    border: "border-tier-medium/20",
  },
  INFO: {
    color: "text-muted",
    bg: "bg-elevated",
    border: "border-white/[0.06]",
  },
};

export default function Alerts() {
  const { data, loading, error, refetch } = useApi("/alerts?count=15");

  // ── ALL hooks must be called before any early return ──────────────────────
  const alerts = useMemo(() => data?.alerts ?? [], [data]);

  const counts = useMemo(() => {
    const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, INFO: 0 };
    alerts.forEach((a) => {
      const key = a.priority in c ? a.priority : "INFO";
      c[key]++;
    });
    return c;
  }, [alerts]);
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
            <Bell className="w-6 h-6 text-signal-amber" />
            Live Alert Queue
          </h1>
          <p className="text-muted text-sm mt-1">
            Real-time enforcement alerts — WhatsApp/SMS ready
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

      {/* Priority Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {["CRITICAL", "HIGH", "MEDIUM", "INFO"].map((p) => {
          const cfg = PRIORITY_CONFIG[p];
          return (
            <div key={p} className={`card ${cfg.bg} border ${cfg.border}`}>
              <p
                className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}
              >
                {p}
              </p>
              <p className="font-mono font-bold text-2xl text-chalk mt-1">
                {counts[p]}
              </p>
            </div>
          );
        })}
      </div>

      {/* Alert Cards */}
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="card text-center py-12">
            <Bell className="w-10 h-10 text-muted mx-auto mb-3" />
            <p className="text-chalk font-medium">No alerts generated</p>
            <p className="text-sm text-muted mt-1">
              All clear — no high-impact violations right now
            </p>
          </div>
        ) : (
          alerts.map((alert, i) => {
            const cfg = PRIORITY_CONFIG[alert.priority] ?? PRIORITY_CONFIG.INFO;
            const vehicleLabel =
              [alert.vehicle?.type, alert.vehicle?.number]
                .filter(Boolean)
                .join(" — ") || "Unknown vehicle";

            return (
              <div
                key={alert.alert_id ?? i}
                className={`card border ${cfg.border}`}
              >
                <div className="flex items-start gap-4">
                  {/* Priority icon */}
                  <div className={`p-2 rounded-lg ${cfg.bg} shrink-0 mt-0.5`}>
                    <AlertTriangle className={`w-4 h-4 ${cfg.color}`} />
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}
                      >
                        {alert.priority}
                      </span>
                      {alert.scores?.cascade_detected && (
                        <span className="px-1.5 py-0.5 bg-signal-red/10 text-signal-red text-[9px] font-bold rounded-full uppercase tracking-wider">
                          Cascade
                        </span>
                      )}
                    </div>

                    <h3 className="font-medium text-chalk text-sm truncate">
                      {alert.location?.junction || "Unknown Junction"}
                    </h3>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-2 text-muted">
                      <span className="flex items-center gap-1">
                        <Car className="w-3 h-3 shrink-0" />
                        {vehicleLabel}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {alert.location?.police_station || "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3 shrink-0" />
                        CII:&nbsp;
                        <span className="font-mono text-chalk">
                          {typeof alert.scores?.cii === "number"
                            ? alert.scores.cii.toFixed(1)
                            : (alert.scores?.cii ?? "—")}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Action badge */}
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-chalk">
                      {alert.action?.recommended?.replace(/_/g, " ") ?? "—"}
                    </p>
                    <p className="text-[10px] text-muted mt-0.5">
                      {alert.action?.target_response_time ?? ""}
                    </p>
                    {alert.action?.requires_towing && (
                      <span className="inline-block mt-1 text-[9px] bg-signal-amber/15 text-signal-amber px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                        Tow
                      </span>
                    )}
                  </div>
                </div>

                {/* WhatsApp preview */}
                {alert.message && (
                  <div className="mt-3 p-3 bg-elevated rounded-lg">
                    <p className="text-[10px] text-muted mb-1 uppercase tracking-wider">
                      WhatsApp Preview
                    </p>
                    <pre className="text-xs text-muted font-mono whitespace-pre-wrap break-words">
                      {alert.message}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-elevated rounded-lg animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card h-16 bg-elevated animate-pulse" />
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="card h-32 bg-elevated animate-pulse" />
      ))}
    </div>
  );
}
