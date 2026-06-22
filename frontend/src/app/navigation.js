import {
  CrosshairSimple,
  MapPin,
  Warning,
  Signpost,
  UsersThree,
  ChartLineUp,
  Lightning,
  Target,
  Radio,
  FileText,
  Heartbeat,
  Robot,
  Gauge,
  Camera,
  Trophy,
  ShieldCheck,
} from "@phosphor-icons/react";

export const NAV_BY_ROLE = {
  constable: [
    { path: "/overview", icon: ChartLineUp, label: "City Overview" },
    { path: "/", icon: CrosshairSimple, label: "Dashboard", badge: "hero" },
    { path: "/ai-copilot", icon: Robot, label: "AI Copilot" },
    { path: "/field", icon: MapPin, label: "Field Dispatch" },
    { path: "/map", icon: MapPin, label: "Tactical Map" },
    { path: "/alerts", icon: Radio, label: "Live Alerts" },
  ],
  si: [
    { path: "/overview", icon: ChartLineUp, label: "City Overview" },
    { path: "/", icon: CrosshairSimple, label: "Dashboard", badge: "hero" },
    { path: "/inspector", icon: FileText, label: "Case Management" },
    { path: "/triage", icon: Heartbeat, label: "Triage" },
    { path: "/dispatch", icon: Signpost, label: "Dispatch" },
    { path: "/scout-leaderboard", icon: Trophy, label: "Leaderboard" },
    { path: "/map", icon: MapPin, label: "Tactical Map" },
    { path: "/alerts", icon: Radio, label: "Live Alerts" },
  ],
  acp: [
    { path: "/overview", icon: ChartLineUp, label: "City Overview" },
    { path: "/", icon: CrosshairSimple, label: "Dashboard", badge: "hero" },
    { path: "/command", icon: ShieldCheck, label: "Command Center" },
    { path: "/capacity-board", icon: Gauge, label: "Live Capacity" },
    { path: "/early-warning", icon: Radio, label: "Early Warning" },
    { path: "/simulator", icon: Lightning, label: "Simulator" },
    { path: "/triage", icon: Heartbeat, label: "Triage" },
    { path: "/dispatch", icon: Signpost, label: "Dispatch" },
    { path: "/repeat-offenders", icon: UsersThree, label: "Offenders" },
    { path: "/flipkart-scout", icon: Camera, label: "Scout Reports" },
    { path: "/scout-leaderboard", icon: Trophy, label: "Leaderboard" },
    { path: "/map", icon: MapPin, label: "Tactical Map" },
  ],
};

export const ROLE_LABELS = {
  constable: "Constable (On Beat)",
  si: "Sub-Inspector (Station)",
  acp: "ACP / Commissioner",
};
