import { useEffect, useMemo, useState } from "react";
import { Activity, HeartPulse, ShieldCheck, Truck, Send } from "lucide-react";
import { useApi, formatNumber } from "../utils/api";
import ErrorState from "../components/ErrorState";

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
          fetch(
            `/api/cause-attribution/${encodeURIComponent(selected.junction)}`,
          ),
          fetch(
            `/api/court-readiness/${encodeURIComponent(`demo-${selected.junction}`)}`,
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
      const res = await fetch("/api/flipkart-scouts/report", {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-chalk flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-signal-red" />
            Junction ER Triage
          </h1>
          <p className="text-muted text-sm mt-1">
            Critical first: root-cause attribution + legal readiness + scout
            ingestion.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 space-y-4">
          {["CRITICAL", "URGENT", "STABLE", "RESOLVED"].map((band) => (
            <div key={band} className="card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-wider text-muted font-semibold">
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
                        ? "border-accent/35 bg-accent/5"
                        : "border-white/[0.06] hover:border-white/[0.14] bg-elevated/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-chalk font-medium truncate">
                          {j.junction}
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          {j.violation_count} violations ·{" "}
                          {j.footpath_violations} footpath
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
          ))}
        </div>

        <div className="xl:col-span-5 space-y-4">
          <div className="card">
            {!selected ? (
              <div className="text-center py-8 text-muted">
                <Activity className="w-7 h-7 mx-auto mb-2" />
                <p>Select a junction to run root-cause analysis</p>
              </div>
            ) : detailLoading ? (
              <div className="py-8 text-center text-muted text-sm">
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

                <div className="bg-elevated rounded-lg p-3 border border-white/[0.06]">
                  <p className="text-xs text-accent font-semibold mb-2">
                    Cause Attribution
                  </p>
                  {cause?.attribution_pcts ? (
                    <div className="space-y-2">
                      {Object.entries(cause.attribution_pcts).map(
                        ([label, pct]) => (
                          <div key={label}>
                            <div className="flex items-center justify-between text-xs text-muted mb-1">
                              <span>{label}</span>
                              <span className="text-chalk font-mono">
                                {pct}%
                              </span>
                            </div>
                            <div className="h-1.5 bg-base rounded overflow-hidden">
                              <div
                                className="h-full bg-accent"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        ),
                      )}
                      <p className="text-xs text-muted mt-2">
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

                <div className="bg-elevated rounded-lg p-3 border border-white/[0.06]">
                  <p className="text-xs text-signal-emerald font-semibold mb-2 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Court Readiness
                  </p>
                  {court?.score !== undefined ? (
                    <div>
                      <p className="text-sm text-chalk font-medium">
                        {court.status} ·{" "}
                        <span className="font-mono">{court.score}%</span>
                      </p>
                      <p className="text-xs text-muted mt-1">
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

          <form className="card space-y-3" onSubmit={submitScout}>
            <p className="text-sm text-chalk font-semibold flex items-center gap-2">
              <Truck className="w-4 h-4 text-tier-high" /> Flipkart Scout Intake
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={scoutPayload.scout_id}
                onChange={(e) =>
                  setScoutPayload((p) => ({ ...p, scout_id: e.target.value }))
                }
                className="bg-elevated border border-white/[0.08] rounded px-2 py-1.5 text-xs text-chalk"
                placeholder="Scout ID"
              />
              <input
                value={scoutPayload.junction}
                onChange={(e) =>
                  setScoutPayload((p) => ({ ...p, junction: e.target.value }))
                }
                className="bg-elevated border border-white/[0.08] rounded px-2 py-1.5 text-xs text-chalk"
                placeholder="Junction"
              />
              <input
                value={scoutPayload.latitude}
                onChange={(e) =>
                  setScoutPayload((p) => ({ ...p, latitude: e.target.value }))
                }
                className="bg-elevated border border-white/[0.08] rounded px-2 py-1.5 text-xs text-chalk"
                placeholder="Latitude"
              />
              <input
                value={scoutPayload.longitude}
                onChange={(e) =>
                  setScoutPayload((p) => ({ ...p, longitude: e.target.value }))
                }
                className="bg-elevated border border-white/[0.08] rounded px-2 py-1.5 text-xs text-chalk"
                placeholder="Longitude"
              />
            </div>
            <input
              value={scoutPayload.photo_url}
              onChange={(e) =>
                setScoutPayload((p) => ({ ...p, photo_url: e.target.value }))
              }
              className="w-full bg-elevated border border-white/[0.08] rounded px-2 py-1.5 text-xs text-chalk"
              placeholder="Photo URL"
            />
            <button
              type="submit"
              disabled={scoutSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent/15 border border-accent/30 text-accent text-sm py-2 hover:bg-accent/25 disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              {scoutSubmitting ? "Submitting..." : "Submit Scout Report"}
            </button>

            {scoutResult && (
              <div className="text-xs bg-elevated/70 border border-white/[0.06] rounded p-2 text-muted">
                <p className="text-chalk font-medium">
                  {scoutResult.status || "response"}
                </p>
                {scoutResult.priority && (
                  <p>
                    Priority:{" "}
                    <span className="text-chalk font-mono">
                      {scoutResult.priority}
                    </span>
                    {" · "}Points:{" "}
                    <span className="text-chalk font-mono">
                      {formatNumber(scoutResult.reward_points || 0)}
                    </span>
                  </p>
                )}
                {scoutResult.estimated_cii !== undefined && (
                  <p>
                    Estimated CII:{" "}
                    <span className="text-chalk font-mono">
                      {scoutResult.estimated_cii}
                    </span>
                  </p>
                )}
                <p className="mt-1">{scoutResult.message}</p>
              </div>
            )}
          </form>
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
            <div key={i} className="card h-40 bg-elevated animate-pulse" />
          ))}
        </div>
        <div className="xl:col-span-5">
          <div className="card h-[500px] bg-elevated animate-pulse" />
        </div>
      </div>
    </div>
  );
}
