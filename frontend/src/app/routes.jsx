import { lazy } from 'react'

const Overview = lazy(() => import('../pages/Overview'))
const PriorityQueue = lazy(() => import('../pages/PriorityQueue'))
const MapView = lazy(() => import('../pages/MapView'))
const Cascade = lazy(() => import('../pages/Cascade'))
const Dispatch = lazy(() => import('../pages/Dispatch'))
const Alerts = lazy(() => import('../pages/Alerts'))
const ImpactCalculator = lazy(() => import('../pages/ImpactCalculator'))
const EarlyWarningPanel = lazy(() => import('../pages/EarlyWarningPanel'))
const CommandCenter = lazy(() => import('../pages/CommandCenter'))
const FieldOfficer = lazy(() => import('../pages/FieldOfficer'))
const InspectorDashboard = lazy(() => import('../pages/InspectorDashboard'))
const EvidenceView = lazy(() => import('../pages/EvidenceView'))
const Simulator = lazy(() => import('../pages/Simulator'))
const RepeatOffenders = lazy(() => import('../pages/RepeatOffenders'))

export const ROUTE_CONFIG = [
  { path: '/', component: ImpactCalculator },
  { path: '/command', component: CommandCenter },
  { path: '/field', component: FieldOfficer },
  { path: '/inspector', component: InspectorDashboard },
  { path: '/priority', component: PriorityQueue, passRole: true },
  { path: '/dispatch', component: Dispatch },
  { path: '/evidence', component: EvidenceView },
  { path: '/map', component: MapView },
  { path: '/cascade', component: Cascade },
  { path: '/alerts', component: Alerts },
  { path: '/overview', component: Overview },
  { path: '/early-warning', component: EarlyWarningPanel },
  { path: '/simulator', component: Simulator },
  { path: '/repeat-offenders', component: RepeatOffenders },
]
