import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Clock,
  MapPin,
  Truck,
  Activity,
  ChevronRight,
  RefreshCw,
  Radio,
  Zap,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import ScrollReveal from "../components/ScrollReveal";
import GlassCard from "../components/GlassCard";
import PageHeader from "../components/PageHeader";
import { apiFetch } from "../utils/api";

const REFRESH_INTERVAL = 30_000;

function countdownMinutes() {
  const now = new Date();
  const mins = now.getMinutes();
  const secs = now.getSeconds();
  const elapsed = (mins % 15) * 60 + secs;
  return elapsed === 0 ? 15 * 60 : 15 * 60 - elapsed;
}

function formatCountdown(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m} min ${s.toString().padStart(2, "0")} sec`;
}

export default function EarlyWarningPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(countdownMinutes());

  const fetchData = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const res = await apiFetch("/api/early-warning-system", {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastFetch(new Date());
      setError(null);
    } catch (err) {
      setError(
        err.name === "AbortError"
          ? "Request timed out — backend is processing heavy data"
          : err.message,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchData]);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft(countdownMinutes());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const zones = data?.top_risk_zones || [];
  const hero = zones[0] || null;
  const rest = zones.slice(1);

  useEffect(() => {
    if (zones.length === 0) return;
    const id = setInterval(() => {
      setSecondsLeft(countdownMinutes());
    }, 1000);
    return () => clearInterval(id);
  }, [zones.length]);

  if (loading) {
    return (
      <div className="glass-card-static animate-pulse">
        <div className="h-48 bg-elevated/50 rounded-xl" />
      </div>
    );
  }

  const predictions = data?.predictions || [];
  const critical = predictions
    .filter((p) => p.status === "CRITICAL")
    .slice(0, 5);

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-chalk flex items-center gap-2">
            <Zap className="w-4 h-4 text-neon-amber" />
            Tipping Point Predictions
          </h3>
          <p className="text-xs text-muted mt-0.5">
            AI-detected congestion spikes — Predictive vs Reactive
          </p>
        </div>
        {data && (
          <span className="px-2 py-0.5 bg-neon-amber/10 text-neon-amber text-[10px] font-bold rounded uppercase border border-neon-amber/20">
            {data.total_junctions_with_tipping_points} Detected
          </span>
        )}
      </div>

      {critical.length === 0 ? (
        <div className="text-center py-8">
          <Activity className="w-8 h-8 text-neon-green mx-auto mb-2" />
          <p className="text-sm text-muted">
            No critical tipping points detected
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {critical.map((pred, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-lg bg-elevated/30 border border-border hover:border-neon-red/20 transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-neon-red" />
                <div>
                  <p className="text-sm font-medium text-chalk">
                    {pred.junction}
                  </p>
                  <p className="text-xs text-muted">{pred.message}</p>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                  pred.status === "CRITICAL"
                    ? "bg-neon-red/10 text-neon-red border border-neon-red/20"
                    : "bg-neon-amber/10 text-neon-amber border border-neon-amber/20"
                }`}
              >
                {pred.predicted_time}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Methodology */}
      <div className="mt-4 p-3 bg-elevated/20 border border-border rounded-lg text-xs text-muted">
        <p className="flex items-center gap-1.5 font-mono">
          <Activity className="w-3.5 h-3.5 text-neon-blue" />
          {data?.methodology ||
            "7-hour rolling window, 3-sigma spike detection"}
        </p>
      </div>
    </div>
  );
}

function AnomalyDetectionPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 30000);
    apiFetch("/api/anomaly-scores", { signal: c.signal })
      .then((res) => {
        if (cancelled) return null;
        clearTimeout(t);
        return res.json();
      })
      .then((json) => {
        if (!cancelled && json) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearTimeout(t);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
      clearTimeout(t);
      c.abort();
    };
  }, []);

  if (loading) return null;

  const anomalies =
    data?.anomalies?.filter((a) => a.is_anomaly).slice(0, 3) || [];
  if (anomalies.length === 0) return null;

  return (
    <div className="glass-card border-neon-amber/20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-chalk flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-neon-amber" />
            Isolation Forest Anomalies
          </h3>
          <p className="text-xs text-muted mt-0.5">
            First-in-India ML for parking violations
          </p>
        </div>
        <span className="px-2 py-0.5 bg-neon-amber/10 text-neon-amber text-[10px] font-bold rounded uppercase border border-neon-amber/20">
          {data?.anomaly_count || 0} Anomalies
        </span>
      </div>

      <div className="space-y-2">
        {anomalies.map((a, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3 rounded-lg bg-neon-amber/5 border border-neon-amber/10 hover:border-neon-amber/30 transition-all duration-300"
          >
            <div>
              <p className="text-sm font-medium text-chalk">{a.junction}</p>
              <p className="text-xs text-muted">{a.anomaly_reason}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted">Score</p>
              <p className="font-mono text-lg font-bold text-neon-amber">
                {a.anomaly_score.toFixed(3)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
