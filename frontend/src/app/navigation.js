import {
  Shield,
  Map,
  AlertTriangle,
  Route as RouteIcon,
  Users,
  BarChart3,
  Zap,
  Target,
  Activity,
  Radio,
  FileText,
} from 'lucide-react'

export const NAV_BY_ROLE = {
  constable: [
    { path: '/', icon: Target, label: 'ClearLane Dashboard', badge: 'hero' },
    { path: '/field', icon: Map, label: 'Field Dispatch' },
    { path: '/map', icon: Map, label: 'Tactical Map' },
    { path: '/alerts', icon: Radio, label: 'Live Alerts' },
  ],
  si: [
    { path: '/', icon: Target, label: 'ClearLane Dashboard', badge: 'hero' },
    { path: '/inspector', icon: FileText, label: 'Case Management' },
    { path: '/priority', icon: AlertTriangle, label: 'Action Plan' },
    { path: '/dispatch', icon: RouteIcon, label: 'Dispatch Routes' },
    { path: '/evidence', icon: Zap, label: 'Evidence Packets' },
    { path: '/map', icon: Map, label: 'Tactical Map' },
    { path: '/alerts', icon: Radio, label: 'Live Alerts' },
  ],
  acp: [
    { path: '/', icon: Target, label: 'ClearLane Dashboard', badge: 'hero' },
    { path: '/command', icon: Shield, label: 'Command Center' },
    { path: '/early-warning', icon: Activity, label: 'Early Warning' },
    { path: '/simulator', icon: Zap, label: 'What-If Simulator' },
    { path: '/repeat-offenders', icon: Users, label: 'Repeat Offenders' },
    { path: '/priority', icon: AlertTriangle, label: 'Action Plan' },
    { path: '/dispatch', icon: RouteIcon, label: 'Dispatch Routes' },
    { path: '/cascade', icon: BarChart3, label: 'Cascade Analysis' },
    { path: '/map', icon: Map, label: 'Tactical Map' },
    { path: '/alerts', icon: Radio, label: 'Live Alerts' },
  ],
}

export const ROLE_LABELS = {
  constable: 'Constable (On Beat)',
  si: 'Sub-Inspector (Station)',
  acp: 'ACP / Commissioner',
}
