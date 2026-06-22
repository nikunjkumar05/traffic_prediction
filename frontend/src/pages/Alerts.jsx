import { useState, useMemo } from "react";
import { useApi } from "../utils/api";
import { AlertTriangle, Bell, MapPin, Car, Zap, RefreshCw } from "lucide-react";
import ErrorState from "../components/ErrorState";
import GlassCard from "../components/GlassCard";
import ScrollReveal from "../components/ScrollReveal";
import AnimatedCounter from "../components/AnimatedCounter";
import PageHeader from "../components/PageHeader";

const PRIORITY_CONFIG = {
  CRITICAL: { color: "text-signal-red", bg: "bg-signal-red/10", border: "border-signal-red/20" },
  HIGH: { color: "text-tier-high", bg: "bg-tier-high/10", border: "border-tier-high/20" },
  MEDIUM: { color: "text-tier-medium", bg: "bg-tier-medium/10", border: "border-tier-medium/20" },
  INFO: { color: "text-muted", bg: "bg-elevated", border: "border-border" },
};

export default function Alerts() {
  const [whatsappMode, setWhatsappMode] = useState("sandbox");
  const { data, loading, error, refetch } = useApi("/alerts?count=15");
  const alerts = useMemo(() => data?.alerts ?? [], [data]);
  const counts = useMemo(() => {
    const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, INFO: 0 };
    alerts.forEach((a) => { const key = a.priority in c ? a.priority : "INFO"; c[key]++; });
    return c;
  }, [alerts]);

  function formatMetaTemplate(alert) {
    const priority = alert.priority || "INFO";
    const junction = alert.location?.junction || "Unknown Junction";
    const station = alert.location?.police_station || "Unknown Station";
    const vType = alert.vehicle?.type || "UNKNOWN";
    const vNum = alert.vehicle?.number || "N/A";
    const cii = typeof alert.scores?.cii === "number" ? alert.scores.cii.toFixed(1) : (alert.scores?.cii ?? "—");
    const action = alert.action?.recommended || "—";
    const target = alert.action?.target_response_time || "—";
    
    return `BTP Alert: ${priority} priority traffic alert at ${junction} (PS: ${station}). Vehicle: ${vType} (${vNum}). CII Score: ${cii}. Action: ${action}. Target: ${target}.`;
  }

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bell}
        title="Live Alert Queue"
        subtitle="Real-time enforcement alerts — WhatsApp/SMS ready"
        accent="amber"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex bg-surface/50 backdrop-blur-md p-1 rounded-xl border border-border text-xs">
              <button 
                onClick={() => setWhatsappMode("sandbox")}
                className={`px-3 py-1.5 rounded-lg transition ${whatsappMode === "sandbox" ? "bg-neon-amber text-chalk font-semibold shadow-sm" : "text-muted hover:text-chalk"}`}
              >
                Sandbox Preview
              </button>
              <button 
                onClick={() => setWhatsappMode("production")}
                className={`px-3 py-1.5 rounded-lg transition ${whatsappMode === "production" ? "bg-neon-amber text-chalk font-semibold shadow-sm" : "text-muted hover:text-chalk"}`}
              >
                Meta Template
              </button>
            </div>
            <button onClick={refetch} className="btn-ghost flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        }
      />

      <ScrollReveal delay={100}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {["CRITICAL", "HIGH", "MEDIUM", "INFO"].map((p) => {
            const cfg = PRIORITY_CONFIG[p];
            return (
              <div key={p} className={`glass-card-static p-4 bg-gradient-to-br ${cfg.bg} border ${cfg.border}`}>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${cfg.color}`}>{p}</p>
                <AnimatedCounter value={counts[p]} className="text-2xl text-chalk mt-1 font-mono font-bold tracking-tight" />
              </div>
            );
          })}
        </div>
      </ScrollReveal>

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <GlassCard className="text-center py-12">
            <Bell className="w-10 h-10 text-muted/30 mx-auto mb-3" />
            <p className="text-chalk font-medium">No alerts generated</p>
            <p className="text-sm text-muted mt-1">All clear — no high-impact violations right now</p>
          </GlassCard>
        ) : (
          alerts.map((alert, i) => {
            const cfg = PRIORITY_CONFIG[alert.priority] ?? PRIORITY_CONFIG.INFO;
            const vehicleLabel = [alert.vehicle?.type, alert.vehicle?.number].filter(Boolean).join(" — ") || "Unknown vehicle";
            return (
              <ScrollReveal key={alert.alert_id ?? i} delay={i * 50}>
                <GlassCard className={`border ${cfg.border}`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-xl ${cfg.bg} shrink-0 mt-0.5`}>
                      <AlertTriangle className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${cfg.color}`}>{alert.priority}</span>
                        {alert.scores?.cascade_detected && (
                          <span className="px-1.5 py-0.5 bg-signal-red/10 text-signal-red text-[9px] font-bold rounded-full">Cascade</span>
                        )}
                      </div>
                      <h3 className="font-medium text-chalk text-sm truncate">{alert.location?.junction || "Unknown Junction"}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-2 text-muted">
                        <span className="flex items-center gap-1"><Car className="w-3 h-3 shrink-0" />{vehicleLabel}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{alert.location?.police_station || "—"}</span>
                        <span className="flex items-center gap-1"><Zap className="w-3 h-3 shrink-0" />CII:&nbsp;<span className="font-mono text-chalk">{typeof alert.scores?.cii === "number" ? alert.scores.cii.toFixed(1) : (alert.scores?.cii ?? "—")}</span></span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-chalk">{alert.action?.recommended?.replace(/_/g, " ") ?? "—"}</p>
                      <p className="text-[10px] text-muted mt-0.5">{alert.action?.target_response_time ?? ""}</p>
                      {alert.action?.requires_towing && (
                        <span className="inline-block mt-1 text-[9px] bg-signal-amber/15 text-signal-amber px-1.5 py-0.5 rounded font-bold uppercase">Tow</span>
                      )}
                    </div>
                  </div>
                  {alert.message && (
                    <div className="mt-3 p-3 bg-elevated/40 rounded-xl border border-border">
                      <p className="text-[10px] text-muted mb-1 uppercase tracking-widest">
                        {whatsappMode === "sandbox" ? "WhatsApp Sandbox Preview" : "WhatsApp Meta Registered Template"}
                      </p>
                      <pre className="text-xs text-muted font-mono whitespace-pre-wrap break-words">
                        {whatsappMode === "sandbox" ? alert.message : formatMetaTemplate(alert)}
                      </pre>
                    </div>
                  )}
                </GlassCard>
              </ScrollReveal>
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
      <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-elevated animate-pulse" /><div><div className="h-7 w-48 bg-elevated rounded-lg animate-pulse" /></div></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="glass-card-static h-20 bg-elevated/50 animate-pulse" />)}</div>
      {[1,2,3].map(i => <div key={i} className="glass-card-static h-32 bg-elevated/50 animate-pulse" />)}
    </div>
  );
}
