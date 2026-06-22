import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, useMap } from "react-leaflet";
import { useApi, tierColor } from "../utils/api";
import {
  MapPin,
  Layers,
  X,
  AlertTriangle,
  Bot,
  Navigation,
} from "lucide-react";
import ErrorState from "../components/ErrorState";
import TierBadge from "../components/TierBadge";
import ScrollReveal from "../components/ScrollReveal";
import PageHeader from "../components/PageHeader";
import "leaflet/dist/leaflet.css";

const BENGALURU_CENTER = [12.9716, 77.5946];

const TIER_RADIUS = {
  CRITICAL: 8,
  HIGH: 6,
  MEDIUM: 5,
  LOW: 4,
};

function FitBounds({ violations }) {
  const map = useMap();
  useEffect(() => {
    if (!violations?.length) return;
    const bounds = violations.map((v) => [v.latitude, v.longitude]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }, [violations, map]);
  return null;
}

function FlyTo({ position, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, zoom || 15, { duration: 0.8 });
  }, [position, zoom, map]);
  return null;
}

export default function MapView() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApi("/map-data");
  const [showSpillover, setShowSpillover] = useState(false);
  const { data: spilloverData, loading: spilloverLoading } = useApi(
    "/spillover-zones",
    [],
    { enabled: showSpillover },
  );
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);

  if (error) {
    return <ErrorState message={error} onRetry={refetch} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-neon-blue/30 border-t-neon-blue rounded-full animate-spin" />
          <p className="text-muted text-sm font-medium">Loading tactical map...</p>
        </div>
      </div>
    );
  }

  const violations = data?.violations || [];
  const junctions = data?.junctions || [];

  return (
    <div className="space-y-4">
      <ScrollReveal>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PageHeader
            icon={MapPin}
            iconColor="text-signal-emerald"
            title="Tactical Map"
            subtitle="Violation hotspots across Bengaluru"
          />
          <div className="text-xs text-muted flex items-center gap-1">
            <Layers className="w-3 h-3" />
            OpenStreetMap
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={50}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowSpillover((v) => !v)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all ${
              showSpillover
                ? "bg-[#a855f7]/10 border-[#a855f7]/30 text-[#c084fc]"
                : "bg-surface/50 border-border text-muted hover:text-chalk hover:border-neon-blue/30"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            {spilloverLoading
              ? "Loading spillover..."
              : showSpillover
                ? "Hide Spillover Zones"
                : "Show Spillover Zones"}
          </button>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={100}>
        <div className="relative rounded-xl overflow-hidden border border-border" style={{ height: "70vh" }}>
          <MapContainer
            center={BENGALURU_CENTER}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a> | &copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {flyTarget && <FlyTo position={flyTarget} zoom={15} />}

            {violations.map((v, idx) => (
              <CircleMarker
                key={`v-${idx}`}
                center={[v.latitude, v.longitude]}
                radius={TIER_RADIUS[v.impact_tier] || 5}
                pathOptions={{
                  color: tierColor(v.impact_tier),
                  fillColor: tierColor(v.impact_tier),
                  fillOpacity: 0.7,
                  weight: 1,
                }}
                eventHandlers={{
                  click: () => {
                    setSelectedViolation(v);
                    setSelectedZone(null);
                    setFlyTarget([v.latitude, v.longitude]);
                  },
                }}
              />
            ))}

            {junctions.map((j, idx) => (
              <CircleMarker
                key={`j-${idx}`}
                center={[j.lat, j.lon]}
                radius={10}
                pathOptions={{
                  color: "#3B82F6",
                  fillColor: "transparent",
                  fillOpacity: 0,
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => setFlyTarget([j.lat, j.lon]),
                }}
              />
            ))}

            {showSpillover &&
              spilloverData?.zones?.map((zone, idx) => (
                <Circle
                  key={`s-${idx}`}
                  center={[zone.center_lat, zone.center_lon]}
                  radius={200}
                  pathOptions={{
                    color: "#a855f7",
                    fillColor: "#a855f7",
                    fillOpacity: 0.2,
                    weight: 2,
                    dashArray: "6 4",
                  }}
                  eventHandlers={{
                    click: () => {
                      setSelectedZone(zone);
                      setSelectedViolation(null);
                      setFlyTarget([zone.center_lat, zone.center_lon]);
                    },
                  }}
                >
                  <Popup>
                    <span className="text-xs font-medium">{zone.label}</span>
                  </Popup>
                </Circle>
              ))}
          </MapContainer>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 z-[1000] glass-card-static p-3">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">
              Impact Tier
            </p>
            <div className="space-y-1.5">
              {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((tier) => (
                <div key={tier} className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: tierColor(tier) }}
                  />
                  <span className="text-xs text-muted">{tier}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Marker Types */}
          <div className="absolute bottom-4 right-4 z-[1000] glass-card-static p-3">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">
              Markers
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-neon-blue bg-transparent" />
                <span className="text-xs text-muted">Junction (BTP)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-signal-red" />
                <span className="text-xs text-muted">Violation</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full border-2 border-dashed"
                  style={{
                    borderColor: "#a855f7",
                    backgroundColor: "rgba(168,85,247,0.3)",
                  }}
                />
                <span className="text-xs text-muted">AI Spillover Zone</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Selected Violation Detail */}
      {selectedViolation && (
        <ScrollReveal delay={50}>
          <div className="glass-card border-neon-blue/20 relative">
            <button
              onClick={() => setSelectedViolation(null)}
              className="absolute top-3 right-3 p-1 rounded-lg hover:bg-elevated border border-transparent hover:border-border transition-colors"
            >
              <X className="w-4 h-4 text-muted" />
            </button>

            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-signal-red/10">
                <AlertTriangle className="w-5 h-5 text-signal-red" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-heading font-semibold text-base text-chalk truncate">
                    {selectedViolation.mapped_junction}
                  </h3>
                  <TierBadge tier={selectedViolation.impact_tier} />
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  <span className="text-muted">
                    Vehicle:{" "}
                    <span className="font-mono text-chalk">
                      {selectedViolation.vehicle_type}
                    </span>
                  </span>
                  <span className="text-muted">
                    Delay:{" "}
                    <span className="font-mono text-chalk">
                      {selectedViolation.duration_minutes} min
                    </span>
                  </span>
                  <span className="text-muted">
                    Score:{" "}
                    <span className="font-mono text-chalk">
                      {selectedViolation.gridlock_score}
                    </span>
                  </span>
                </div>
                <p className="text-xs text-muted mt-2">
                  {selectedViolation.police_station} —{" "}
                  {selectedViolation.single_violation}
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* Selected Spillover Zone Detail */}
      {selectedZone && (
        <ScrollReveal delay={50}>
          <div
            className="glass-card border-[#a855f7]/20 relative"
            style={{ boxShadow: "0 0 20px rgba(168,85,247,0.1)" }}
          >
            <button
              onClick={() => setSelectedZone(null)}
              className="absolute top-3 right-3 p-1 rounded-lg hover:bg-elevated border border-transparent hover:border-border transition-colors"
            >
              <X className="w-4 h-4 text-muted" />
            </button>

            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-[#a855f7]/10">
                <Bot className="w-5 h-5 text-[#a855f7]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-heading font-semibold text-base text-chalk truncate">
                    AI Detected: {selectedZone.label} Zone
                  </h3>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  <span className="text-muted">
                    Severity:{" "}
                    <span className="font-mono text-chalk">
                      {selectedZone.severity}
                    </span>
                  </span>
                  <span className="text-muted">
                    Active Vehicles:{" "}
                    <span className="font-mono text-chalk">
                      {selectedZone.vehicle_count}
                    </span>
                  </span>
                  <span className="text-muted">
                    Center:{" "}
                    <span className="font-mono text-chalk">
                      {selectedZone.center_lat.toFixed(4)},{" "}
                      {selectedZone.center_lon.toFixed(4)}
                    </span>
                  </span>
                </div>
                <button
                  onClick={() => navigate("/dispatch")}
                  className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#a855f7]/10 text-[#a855f7] text-sm font-medium hover:bg-[#a855f7]/20 transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Dispatch Area Patrol
                </button>
              </div>
            </div>
          </div>
        </ScrollReveal>
      )}
    </div>
  );
}
