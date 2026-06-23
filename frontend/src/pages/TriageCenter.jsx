import { useEffect, useMemo, useState } from "react";
import { Activity, HeartPulse, ShieldCheck, Truck, Send, Stethoscope, Scale, FileWarning, CheckCircle2 } from "lucide-react";
import { useApi, formatNumber, apiFetch } from "../utils/api";
import ErrorState from "../components/ErrorState";
import ScrollReveal from "../components/ScrollReveal";
import GlassCard from "../components/GlassCard";
import PageHeader from "../components/PageHeader";

function statusBand(lossPct) {
  if (lossPct >= 60) return "CRITICAL";
  if (lossPct >= 35) return "URGENT";
  if (lossPct >= 15) return "STABLE";
  return "RESOLVED";
}

const BAND_STYLE = {
  CRITICAL: "bg-signal-red/10 text-signal-red border-signal-red/25",
  URGENT: "bg-signal-amber/10 text-signal-amber border-signal-amber/25",
  STABLE: "bg-signal-emerald/10 text-signal-emerald border-signal-emerald/25",
  RESOLVED: "bg-elevated text-muted border-white/[0.08]",
};

const BAND_ICON = {
  CRITICAL: <HeartPulse className="w-4 h-4" />,
  URGENT: <Activity className="w-4 h-4" />,
  STABLE: <ShieldCheck className="w-4 h-4" />,
  RESOLVED: <CheckCircle2 className="w-4 h-4" />,
};

export default function TriageCenter() {
  const { data, loading, error, refetch } = useApi("/capacity-status");
  const [selected, setSelected] = useState(null);
  const [cause, setCause] = useState(null);
  const [court, setCourt] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [scoutPayload, setScoutPayload] = useState({
    scout_id: "FK-RIDER-001",
    junction: "",
    latitude: "12.9716",
    longitude: "77.5946",
    photo_url: "https://example.com/violation.jpg",
    vehicle_number: "",
    notes: "",
  });
  const [scoutResult, setScoutResult] = useState(null);
  const [scoutSubmitting, setScoutSubmitting] = useState(false);

  const junctions = useMemo(() => data?.junctions || [], [data]);

  const grouped = useMemo(() => {
    const buckets = { CRITICAL: [], URGENT: [], STABLE: [], RESOLVED: [] };
    junctions.forEach((j) => buckets[statusBand(j.capacity_loss_pct)].push(j));
    Object.keys(buckets).forEach((k) => {
      buckets[k].sort((a, b) => b.capacity_loss_pct - a.capacity_loss_pct);
    });
    return buckets;
  }, [junctions]);

  useEffect(() => {
    if (!selected?.junction) return;
    let cancelled = false;

    async function loadDetails() {
      setDetailLoading(true);
      setCause(null);
      setCourt(null);
      try {
        const [causeRes, courtRes] = await Promise.all([
          apiFetch(
            `/api/cause-attribution/${encodeURIComponent(selected.junction)}`,
          ),
          apiFetch(
            `/api/court-readiness/${encodeURIComponent(selected.junction)}`,
          ),
        ]);

        const [causeJson, courtJson] = await Promise.all([
          causeRes.json(),
          courtRes.json(),
        ]);
        if (!cancelled) {
          setCause(causeJson);
          setCourt(courtJson);
          setScoutPayload((p) => ({ ...p, junction: selected.junction }));
        }
      } catch (e) {
        if (!cancelled) {
          setCause({ error: "Failed to load attribution" });
          setCourt({ error: "Failed to load legal score" });
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }

    loadDetails();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  async function submitScout(e) {
    e.preventDefault();
    setScoutSubmitting(true);
    setScoutResult(null);
    try {
      const payload = {
        ...scoutPayload,
        latitude: Number(scoutPayload.latitude),
        longitude: Number(scoutPayload.longitude),
      };
      const res = await apiFetch("/api/flipkart-scouts/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      setScoutResult(json);
    } catch (err) {
      setScoutResult({ message: "Scout submission failed" });
    } finally {
      setScoutSubmitting(false);
    }
  }

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <ScrollReveal>
        <PageHeader
          icon={HeartPulse}
          iconColor="text-signal-red"
          title="Junction ER Triage"
          subtitle="Critical first: root-cause attribution + legal readiness + scout ingestion."
        />
      </ScrollReveal>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 space-y-4">
          {["CRITICAL", "URGENT", "STABLE", "RESOLVED"].map((band, bandIdx) => (
            <ScrollReveal key={band} delay={50 + bandIdx * 50}>
              <div className="glass-card">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs uppercase tracking-wider text-muted font-semibold flex items-center gap-2">
                    {BAND_ICON[band]}
                    {band}
                  </p>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] border ${BAND_STYLE[band]}`}
                  >
                    {grouped[band].length}
                  </span>
                </div>
                <div className="space-y-2">
                  {grouped[band].slice(0, 6).map((j) => (
                    <button
                      key={j.junction}
                      onClick={() => setSelected(j)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selected?.junction === j.junction
                          ? "border-neon-blue/35 bg-neon-blue/5 text-neon-blue"
                          : "border-border hover:border-muted/20 bg-elevated/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-chalk font-medium truncate">
                            {j.junction}
                          </p>
                          <p className="text-xs text-muted mt-0.5">
                            <span className="font-mono">{j.violation_count}</span> violations ·{" "}
                            <span className="font-mono">{j.footpath_violations}</span> footpath
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono font-bold text-chalk">
                            {j.capacity_loss_pct}%
                          </p>
                          <p className="text-[10px] text-muted uppercase">loss</p>
                        </div>
                      </div>
                    </button>
                  ))}
                  {grouped[band].length === 0 && (
                    <p className="text-xs text-muted">
                      No junctions in this band
                    </p>
                  )}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <div className="xl:col-span-5 space-y-4">
          <ScrollReveal delay={100}>
            <div className="glass-card">
              {!selected ? (
                <div className="text-center py-8 text-muted">
                  <Stethoscope className="w-7 h-7 mx-auto mb-2" />
                  <p>Select a junction to run root-cause analysis</p>
                </div>
              ) : detailLoading ? (
                <div className="py-8 text-center text-muted text-sm">
                  <div className="w-8 h-8 border-2 border-neon-blue/30 border-t-neon-blue rounded-full animate-spin mx-auto mb-3" />
                  Loading diagnostics...
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted">
                      Selected Junction
                    </p>
                    <p className="text-lg font-semibold text-chalk">
                      {selected.junction}
                    </p>
                  </div>

                  <div className="bg-elevated/40 rounded-lg p-3 border border-border">
                    <p className="text-xs text-neon-blue font-semibold mb-2 flex items-center gap-1">
                      <Stethoscope className="w-3.5 h-3.5" /> Cause Attribution
                    </p>
                    {cause?.attribution_pcts ? (
                      <div className="space-y-2">
                        {Object.entries(cause.attribution_pcts).map(
                          ([label, pct]) => (
                            <div key={label}>
                              <div className="flex items-center justify-between text-xs text-muted mb-1">
                                <span>{label}</span>
                                <span className="text-chalk font-mono font-bold">
                                  {pct}%
                                </span>
                              </div>
                              <div className="h-1.5 bg-base rounded overflow-hidden border border-border">
                                <div
                                  className="h-full bg-neon-blue transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          ),
                        )}
                        <p className="text-xs text-muted mt-2 leading-relaxed">
                          {cause.action_recommendation}
                        </p>
                        <p className="text-xs text-chalk font-mono mt-1">
                          Clear hotspot = ~{cause.clear_hotspot_eta_minutes} min
                          to stabilize flow
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted">
                        No attribution available
                      </p>
                    )}
                  </div>

                  <div className="bg-elevated/40 rounded-lg p-3 border border-border">
                    <p className="text-xs text-signal-emerald font-semibold mb-2 flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5" /> Court Readiness
                    </p>
                    {court?.score !== undefined ? (
                      <div>
                        <p className="text-sm text-chalk font-medium">
                          {court.status} ·{" "}
                          <span className="font-mono font-bold text-signal-emerald">{court.score}%</span>
                        </p>
                        <p className="text-xs text-muted mt-1 leading-relaxed">
                          {court.recommendation}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted">
                        No legal score available
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={150}>
            <form className="glass-card space-y-3" onSubmit={submitScout}>
              <p className="text-sm text-chalk font-semibold flex items-center gap-2">
                <Truck className="w-4 h-4 text-tier-high" /> Flipkart Scout Intake
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  aria-label="Scout ID"
                  value={scoutPayload.scout_id}
                  onChange={(e) =>
                    setScoutPayload((p) => ({ ...p, scout_id: e.target.value }))
                  }
                  className="bg-elevated/60 border border-border rounded px-2 py-1.5 text-xs text-chalk input-glass"
                  placeholder="Scout ID"
                />
                <input
                  aria-label="Junction"
                  value={scoutPayload.junction}
                  onChange={(e) =>
                    setScoutPayload((p) => ({ ...p, junction: e.target.value }))
                  }
                  className="bg-elevated/60 border border-border rounded px-2 py-1.5 text-xs text-chalk input-glass"
                  placeholder="Junction"
                />
                <input
                  aria-label="Latitude"
                  value={scoutPayload.latitude}
                  onChange={(e) =>
                    setScoutPayload((p) => ({ ...p, latitude: e.target.value }))
                  }
                  className="bg-elevated/60 border border-border rounded px-2 py-1.5 text-xs text-chalk input-glass font-mono"
                  placeholder="Latitude"
                />
                <input
                  aria-label="Longitude"
                  value={scoutPayload.longitude}
                  onChange={(e) =>
                    setScoutPayload((p) => ({ ...p, longitude: e.target.value }))
                  }
                  className="bg-elevated/60 border border-border rounded px-2 py-1.5 text-xs text-chalk input-glass font-mono"
                  placeholder="Longitude"
                />
              </div>
              <input
                aria-label="Photo URL"
                value={scoutPayload.photo_url}
                onChange={(e) =>
                  setScoutPayload((p) => ({ ...p, photo_url: e.target.value }))
                }
                className="w-full bg-elevated/60 border border-border rounded px-2 py-1.5 text-xs text-chalk input-glass font-mono"
                placeholder="Photo URL"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  aria-label="Vehicle Number"
                  value={scoutPayload.vehicle_number}
                  onChange={(e) =>
                    setScoutPayload((p) => ({ ...p, vehicle_number: e.target.value }))
                  }
                  className="bg-elevated/60 border border-border rounded px-2 py-1.5 text-xs text-chalk input-glass font-mono"
                  placeholder="Vehicle Number"
                />
                <input
                  aria-label="Notes"
                  value={scoutPayload.notes}
                  onChange={(e) =>
                    setScoutPayload((p) => ({ ...p, notes: e.target.value }))
                  }
                  className="bg-elevated/60 border border-border rounded px-2 py-1.5 text-xs text-chalk input-glass"
                  placeholder="Notes / Obstructions"
                />
              </div>
              <button
                type="submit"
                disabled={scoutSubmitting}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                {scoutSubmitting ? "Submitting..." : "Submit Scout Report"}
              </button>

              {scoutResult && (
                <div className="text-xs glass-card-static p-3 text-muted">
                  <p className="text-chalk font-medium">
                    {scoutResult.status || "response"}
                  </p>
                  {scoutResult.priority && (
                    <p>
                      Priority:{" "}
                      <span className="text-chalk font-mono font-bold">
                        {scoutResult.priority}
                      </span>
                      {" · "}Points:{" "}
                      <span className="text-chalk font-mono font-bold">
                        {formatNumber(scoutResult.reward_points || 0)}
                      </span>
                    </p>
                  )}
                  {scoutResult.estimated_cii !== undefined && (
                    <p>
                      Estimated CII:{" "}
                      <span className="text-chalk font-mono font-bold">
                        {scoutResult.estimated_cii}
                      </span>
                    </p>
                  )}
                  <p className="mt-1 leading-relaxed">{scoutResult.message}</p>
                </div>
              )}
            </form>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 bg-elevated rounded-lg animate-pulse" />
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card-static h-40 animate-pulse" />
          ))}
        </div>
        <div className="xl:col-span-5">
          <div className="glass-card-static h-[500px] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
