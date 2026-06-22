import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Car, Ruler } from "lucide-react";

/**
 * CapacityGauge — animated horizontal progress bar card for a single junction.
 *
 * Props:
 *   junction       {string}  — name of the junction
 *   capacityPct    {number}  — remaining capacity 0–100
 *   status         {string}  — "GREEN" | "YELLOW" | "RED"
 *   violationCount {number}  — total active violations
 *   blockedWidthM  {number}  — blocked road width in metres
 *   onClick        {fn}      — optional click handler
 *   isExpanded     {boolean} — whether the card is currently selected/expanded
 *   isCritical     {boolean} — drives the flashing CRITICAL badge (pct < 40)
 */
export default function CapacityGauge({
  junction,
  capacityPct = 0,
  status = "GREEN",
  violationCount = 0,
  blockedWidthM = 0,
  onClick,
  isExpanded = false,
  isCritical = false,
}) {
  const [animatedPct, setAnimatedPct] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const DURATION = 900; // ms for the fill animation

  // Animate from 0 → capacityPct on mount / whenever capacityPct changes
  useEffect(() => {
    const target = Math.min(100, Math.max(0, capacityPct));
    startRef.current = null;

    function step(ts) {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / DURATION, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedPct(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    }

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [capacityPct]);

  // ── colour logic ──────────────────────────────────────────────────────────
  const barColor =
    capacityPct >= 70
      ? { bar: "bg-signal-emerald", glow: "shadow-glow-green", text: "text-signal-emerald" }
      : capacityPct >= 50
      ? { bar: "bg-signal-amber", glow: "shadow-glow-amber", text: "text-signal-amber" }
      : { bar: "bg-signal-red", glow: "shadow-glow-red", text: "text-signal-red" };

  const statusConfig = {
    GREEN: {
      dot: "bg-signal-emerald",
      badge: "bg-signal-emerald/15 text-signal-emerald border-signal-emerald/30",
      glow: "shadow-[0_0_12px_rgba(34,197,94,0.35)]",
    },
    YELLOW: {
      dot: "bg-signal-amber",
      badge: "bg-signal-amber/15 text-signal-amber border-signal-amber/30",
      glow: "shadow-[0_0_12px_rgba(245,158,11,0.35)]",
    },
    RED: {
      dot: "bg-signal-red",
      badge: "bg-signal-red/15 text-signal-red border-signal-red/30",
      glow: "shadow-[0_0_12px_rgba(239,68,68,0.35)]",
    },
  };

  const sc = statusConfig[status] ?? statusConfig.GREEN;

  // Card border accent when critical or expanded
  const cardBorder = isCritical
    ? "border-signal-red/40"
    : isExpanded
    ? "border-neon-blue/40"
    : "border-border hover:border-muted/20";

  const cardBg = isCritical
    ? "bg-gradient-to-r from-signal-red/[0.06] to-surface"
    : isExpanded
    ? "bg-neon-blue/[0.03]"
    : "bg-surface/50 backdrop-blur-md";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-4 transition-all duration-200 group ${cardBorder} ${cardBg} focus:outline-none focus:ring-2 focus:ring-neon-blue/40`}
    >
      {/* ── Top row: name + badges ── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        {/* Junction name */}
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-semibold text-chalk truncate tracking-tight leading-tight">
            {junction}
          </p>
          <div className="flex items-center gap-3 mt-1">
            {/* Violation count */}
            <span className="flex items-center gap-1 text-xs text-muted">
              <Car className="w-3 h-3" />
              {violationCount} violations
            </span>
            {/* Blocked width */}
            <span className="flex items-center gap-1 text-xs text-muted">
              <Ruler className="w-3 h-3" />
              {blockedWidthM.toFixed(1)} m blocked
            </span>
          </div>
        </div>

        {/* Right badges */}
        <div className="flex items-center gap-2 shrink-0">
          {/* CRITICAL flashing badge */}
          {isCritical && (
            <span className="animate-pulse px-2 py-0.5 bg-signal-red text-white text-[9px] font-black uppercase tracking-widest rounded">
              CRITICAL
            </span>
          )}

          {/* Status badge with glow */}
          <span
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${sc.badge} ${sc.glow}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} animate-pulse`} />
            {status}
          </span>
        </div>
      </div>

      {/* ── Capacity bar ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted font-medium">
            Capacity Remaining
          </span>
          <span className={`font-mono text-sm font-bold ${barColor.text}`}>
            {animatedPct}%
          </span>
        </div>

        {/* Track */}
        <div className="relative h-2.5 bg-elevated rounded-full overflow-hidden border border-border">
          {/* Fill */}
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-none ${barColor.bar} ${
              capacityPct < 50 ? "animate-pulse" : ""
            }`}
            style={{ width: `${animatedPct}%` }}
          />
          {/* Shimmer overlay */}
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${animatedPct}%`,
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)",
            }}
          />
        </div>

        {/* Threshold markers */}
        <div className="relative h-1">
          {/* 50% marker */}
          <div
            className="absolute top-0 w-px h-full bg-signal-amber/40"
            style={{ left: "50%" }}
            title="50% threshold"
          />
          {/* 70% marker */}
          <div
            className="absolute top-0 w-px h-full bg-signal-emerald/40"
            style={{ left: "70%" }}
            title="70% threshold"
          />
        </div>
      </div>

      {/* ── Warning row for very low capacity ── */}
      {capacityPct < 50 && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-signal-red font-medium">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>
            {capacityPct < 40
              ? "Severely congested — immediate action required"
              : "Below critical threshold — monitor closely"}
          </span>
        </div>
      )}
    </button>
  );
}
