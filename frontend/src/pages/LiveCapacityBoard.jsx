import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  BarChart3,
  MapPin,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useApi } from "../utils/api";
import CapacityGauge from "../components/CapacityGauge";
import ScrollReveal from "../components/ScrollReveal";
import GlassCard from "../components/GlassCard";
import PageHeader from "../components/PageHeader";

const REFRESH_INTERVAL = 30_000;

function normaliseStatus(raw) {
  if (!raw) return "GREEN";
  const s = raw.toUpperCase();
  if (s === "GREEN" || s === "YELLOW" || s === "RED") return s;
  return "GREEN";
}

function deriveStatus(remaining) {
  if (remaining < 50) return "RED";
  if (remaining < 70) return "YELLOW";
  return "GREEN";
}

function hourLabel(h) {
  if (h === 0) return "12a";
  if (h === 12) return "12p";
  if (h < 12) return `${h}a`;
  return `${h - 12}p`;
}

function heatColor(val) {
  if (val < 0.33) return "bg-neon-blue/20 border-neon-blue/10";
  if (val < 0.66) return "bg-signal-amber/40 border-signal-amber/20";
  return "bg-signal-red/60 border-signal-red/30";
}

function StatusStrip({ loading, error, lastFetched, junctions }) {
  const critical = junctions.filter((j) => j.remaining_pct < 50).length;
  const health =
    error ? "DEGRADED" : loading ? "SYNCING" : critical > 3 ? "ALERT" : "NOMINAL";

  const stripStyle = {
    DEGRADED: "glass-alert border-signal-red/30 text-signal-red",
    SYNCING: "glass-alert border-signal-amber/20 text-signal-amber",
    ALERT: "glass-alert border-signal-red/20 text-signal-red",
    NOMINAL: "glass-alert border-signal-emerald/20 text-signal-emerald",
  }[health];

  const stripIcon = {
    DEGRADED: <WifiOff className="w-3.5 h-3.5" />,
    SYNCING: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
    ALERT: <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />,
    NOMINAL: <Wifi className="w-3.5 h-3.5" />,
  }[health];

  return (
    <div className={`flex items-center justify-between px-4 py-2 rounded-lg border text-xs font-medium ${stripStyle}`}>
      <div className="flex items-center gap-2">
        {stripIcon}
        <span>
          System{" "}
          <span className="font-bold tracking-wider">{health}</span>
          {critical > 0 && (
            <span className="ml-2">
              — {critical} junction{critical !== 1 ? "s" : ""} critically blocked
            </span>
          )}
        </span>
      </div>
      {lastFetched && (
        <span className="text-[10px] opacity-70 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Last sync: {lastFetched.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}

function SummaryStats({ junctions }) {
  const total = junctions.length;
  const critical = junctions.filter((j) => j.remaining_pct < 50).length;
  const critPct = total > 0 ? Math.round((critical / total) * 100) : 0;
  const avgRemaining =
    total > 0
      ? Math.round(junctions.reduce((s, j) => s + j.remaining_pct, 0) / total)
      : 0;

  const stats = [
    {
      label: "Total Junctions",
      value: total,
      icon: <MapPin className="w-4 h-4 text-neon-blue" />,
      color: "text-neon-blue",
      sub: "monitored",
    },
    {
      label: "Critically Blocked",
      value: `${critPct}%`,
      icon: <AlertTriangle className="w-4 h-4 text-signal-red" />,
      color: "text-signal-red",
      sub: `${critical} junctions <50% capacity`,
    },
    {
      label: "Avg Capacity",
      value: `${avgRemaining}%`,
      icon: <Activity className="w-4 h-4 text-signal-emerald" />,
      color:
        avgRemaining >= 70
          ? "text-signal-emerald"
          : avgRemaining >= 50
          ? "text-signal-amber"
          : "text-signal-red",
      sub: "remaining across network",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="glass-card-static flex items-start gap-4">
          <div className="w-9 h-9 rounded-lg bg-elevated flex items-center justify-center shrink-0 border border-border">
            {s.icon}
          </div>
          <div>
            <p className="metric-label">{s.label}</p>
            <p className={`font-mono font-bold text-2xl ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted mt-0.5">{s.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TemporalHeatmap({ junctionId }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!junctionId) return;
    let cancelled = false;
    setLoading(true);
    setProfile(null);
    setError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    fetch(`/api/temporal-profile/${encodeURIComponent(junctionId)}`, {
      signal: controller.signal,
    })
      .then((res) => {
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!cancelled) {
          setProfile(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.name === "AbortError" ? "Timed out" : err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [junctionId]);

  if (loading) {
    return (
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-[10px] uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
          <BarChart3 className="w-3 h-3" /> Hourly Violation Profile
        </p>
        <div className="grid grid-cols-12 gap-1">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="h-8 bg-elevated rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-signal-red">Failed to load temporal profile: {error}</p>
      </div>
    );
  }

  const rawHours =
    profile?.hourly ||
    profile?.profile ||
    profile?.hourly_violations ||
    [];

  const maxVal = rawHours.length > 0 ? Math.max(...rawHours, 1) : 1;
  const normalised = rawHours.slice(0, 24).map((v) => v / maxVal);

  const peakHour =
    profile?.peak_hour ??
    (normalised.length > 0
      ? normalised.indexOf(Math.max(...normalised))
      : null);

  if (normalised.length === 0) {
    return (
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted">No temporal data available for this junction.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-wider text-muted flex items-center gap-1.5">
          <BarChart3 className="w-3 h-3" /> Hourly Violation Profile
        </p>
        {peakHour !== null && (
          <span className="text-[10px] text-signal-amber font-medium">
            Peak: {hourLabel(peakHour)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-12 gap-1">
        {Array.from({ length: 24 }).map((_, h) => {
          const intensity = normalised[h] ?? 0;
          const isPeak = h === peakHour;
          return (
            <div key={h} className="flex flex-col items-center gap-0.5">
              <div
                title={`${hourLabel(h)}: ${rawHours[h] ?? 0} violations`}
                className={`w-full h-8 rounded border ${heatColor(intensity)} ${
                  isPeak ? "ring-1 ring-signal-amber ring-offset-0" : ""
                } transition-all hover:scale-110 hover:z-10 relative cursor-default`}
              >
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-b"
                  style={{
                    height: `${Math.round(intensity * 100)}%`,
                    background:
                      intensity < 0.33
                        ? "rgba(59,130,246,0.25)"
                        : intensity < 0.66
                        ? "rgba(245,158,11,0.35)"
                        : "rgba(239,68,68,0.45)",
                  }}
                />
              </div>
              <span className="text-[8px] text-muted font-mono leading-none">
                {h % 3 === 0 ? hourLabel(h) : ""}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-2">
        <span className="flex items-center gap-1 text-[9px] text-muted">
          <span className="w-3 h-2 rounded bg-neon-blue/30 border border-neon-blue/20 inline-block" />
          Low
        </span>
        <span className="flex items-center gap-1 text-[9px] text-muted">
          <span className="w-3 h-2 rounded bg-signal-amber/50 border border-signal-amber/30 inline-block" />
          Medium
        </span>
        <span className="flex items-center gap-1 text-[9px] text-muted">
          <span className="w-3 h-2 rounded bg-signal-red/60 border border-signal-red/30 inline-block" />
          High
        </span>
      </div>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-72 bg-elevated rounded-lg animate-pulse" />
        <div className="h-4 w-96 bg-elevated rounded animate-pulse" />
      </div>
      <div className="h-9 bg-elevated rounded-lg animate-pulse" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-elevated rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((i) => (
          <div key={i} className="h-20 bg-elevated rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function LiveCapacityBoard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error, refetch } = useApi(
    "/capacity-status",
    [refreshKey],
  );

  const [lastFetched, setLastFetched] = useState(null);
  const [expandedJunction, setExpandedJunction] = useState(null);
  const [filterStatus, setFilterStatus] = useState("ALL");

  useEffect(() => {
    if (data) setLastFetched(new Date());
  }, [data]);

  useEffect(() => {
    const id = setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
    setLastFetched(new Date());
  }, [refetch]);

  const junctions = useMemo(() => {
    const raw = data?.junctions ?? [];
    return [...raw].sort((a, b) => a.remaining_pct - b.remaining_pct);
  }, [data]);

  const filtered = useMemo(() => {
    if (filterStatus === "ALL") return junctions;
    return junctions.filter((j) => {
      const s = j.status?.toUpperCase() ?? deriveStatus(j.remaining_pct);
      return s === filterStatus;
    });
  }, [junctions, filterStatus]);

  const toggleExpand = useCallback(
    (junction) => {
      setExpandedJunction((prev) => (prev === junction ? null : junction));
    },
    [],
  );

  if (!loading && error && !data) {
    return (
      <div className="space-y-6">
        <ScrollReveal>
          <PageHeader
            icon={Activity}
            iconColor="text-neon-blue"
            title="Live Capacity Board"
            subtitle="Real-time road capacity monitoring — Bengaluru"
            onRefresh={handleRefresh}
            loading={loading}
          />
        </ScrollReveal>
        <div className="glass-card border-signal-red/20 flex flex-col items-center py-12 text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-signal-red/10 flex items-center justify-center">
            <WifiOff className="w-7 h-7 text-signal-red" />
          </div>
          <div>
            <p className="text-chalk font-semibold">Failed to load capacity data</p>
            <p className="text-sm text-muted mt-1">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading && !data) return <BoardSkeleton />;

  return (
    <div className="space-y-5">
      <ScrollReveal>
        <PageHeader
          icon={Activity}
          iconColor="text-neon-blue"
          title="Live Capacity Board"
          subtitle="Real-time road capacity monitoring — Bengaluru"
          onRefresh={handleRefresh}
          loading={loading}
        />
      </ScrollReveal>

      <ScrollReveal delay={50}>
        <StatusStrip
          loading={loading}
          error={error}
          lastFetched={lastFetched}
          junctions={junctions}
        />
      </ScrollReveal>

      <ScrollReveal delay={100}>
        <SummaryStats junctions={junctions} />
      </ScrollReveal>

      <div className="glow-line" />

      {/* Filter tabs */}
      <ScrollReveal delay={150}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted uppercase tracking-wider mr-1">Filter:</span>
          {["ALL", "RED", "YELLOW", "GREEN"].map((s) => {
            const active = filterStatus === s;
            const colorMap = {
              ALL: "border-neon-blue/40 text-neon-blue bg-neon-blue/10",
              RED: "border-signal-red/40 text-signal-red bg-signal-red/10",
              YELLOW: "border-signal-amber/40 text-signal-amber bg-signal-amber/10",
              GREEN: "border-signal-emerald/40 text-signal-emerald bg-signal-emerald/10",
            };
            const inactiveColor = "border-border text-muted hover:border-muted/20";
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-full border text-[11px] font-semibold uppercase tracking-wider transition-all ${
                  active ? colorMap[s] : inactiveColor
                }`}
              >
                {s}
                {s !== "ALL" && (
                  <span className="ml-1.5 font-mono font-bold">
                    ({junctions.filter((j) => {
                      const st = (j.status?.toUpperCase() ?? deriveStatus(j.remaining_pct));
                      return st === s;
                    }).length})
                  </span>
                )}
              </button>
            );
          })}

          {error && data && (
            <span className="ml-auto text-[10px] text-signal-amber flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Stale data — {error}
            </span>
          )}
        </div>
      </ScrollReveal>

      {/* Junction cards */}
      {filtered.length === 0 ? (
        <ScrollReveal delay={200}>
          <div className="glass-card text-center py-12">
            <CheckCircle2 className="w-10 h-10 text-signal-emerald mx-auto mb-3" />
            <p className="text-chalk font-medium">No junctions in this category</p>
            <p className="text-sm text-muted mt-1">
              {filterStatus === "ALL"
                ? "No capacity data received yet."
                : `All junctions are operating outside the "${filterStatus}" band.`}
            </p>
          </div>
        </ScrollReveal>
      ) : (
        <div className="space-y-3">
          {filtered.map((j, idx) => {
            const status = j.status?.toUpperCase() ?? deriveStatus(j.remaining_pct);
            const remaining = Math.round(j.remaining_pct ?? 100 - (j.capacity_loss_pct ?? 0));
            const isCritical = remaining < 40;
            const isExpanded = expandedJunction === j.junction;

            return (
              <ScrollReveal key={j.junction} delay={200 + idx * 30}>
                <div
                  className={`rounded-xl transition-all duration-300 ${
                    isExpanded
                      ? "ring-1 ring-neon-blue/20"
                      : ""
                  }`}
                >
                  <CapacityGauge
                    junction={j.junction}
                    capacityPct={remaining}
                    status={normaliseStatus(status)}
                    violationCount={j.violation_count ?? 0}
                    blockedWidthM={j.blocked_width_m ?? 0}
                    onClick={() => toggleExpand(j.junction)}
                    isExpanded={isExpanded}
                    isCritical={isCritical}
                  />

                  <div
                    className={`flex justify-center transition-all ${isExpanded ? "pb-0" : "hidden"}`}
                  >
                    <ChevronUp className="w-3.5 h-3.5 text-muted" />
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 glass-card-static border-t-0 border-border rounded-b-xl bg-surface/50 backdrop-blur-md">
                      <TemporalHeatmap junctionId={j.junction} />

                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          {
                            label: "Capacity Loss",
                            value: `${j.capacity_loss_pct ?? 0}%`,
                            color: "text-signal-red",
                          },
                          {
                            label: "Remaining",
                            value: `${remaining}%`,
                            color:
                              remaining >= 70
                                ? "text-signal-emerald"
                                : remaining >= 50
                                ? "text-signal-amber"
                                : "text-signal-red",
                          },
                          {
                            label: "Violations",
                            value: j.violation_count ?? "—",
                            color: "text-chalk",
                          },
                          {
                            label: "Blocked Width",
                            value: `${(j.blocked_width_m ?? 0).toFixed(1)} m`,
                            color: "text-chalk",
                          },
                        ].map((stat) => (
                          <div
                            key={stat.label}
                            className="bg-elevated/60 rounded-lg p-3 border border-border"
                          >
                            <p className="text-[10px] uppercase tracking-wider text-muted font-medium">
                              {stat.label}
                            </p>
                            <p className={`font-mono text-lg font-bold mt-0.5 ${stat.color}`}>
                              {stat.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-center gap-2 text-xs text-muted pt-2 pb-4">
        <Zap className="w-3.5 h-3.5 text-neon-blue animate-pulse" />
        Auto-refreshes every {REFRESH_INTERVAL / 1000}s &middot; ClearLane AI Enforcement Platform
      </div>
    </div>
  );
}
