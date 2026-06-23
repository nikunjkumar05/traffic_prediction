import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ROUTE_CONFIG } from './routes'
import { NAV_BY_ROLE } from './navigation'
import PageLoader from '../components/common/PageLoader'
import ErrorBoundary from '../components/ErrorBoundary'

const ROUTE_PERMISSIONS = {
  "/": ["constable", "si", "acp"],
  "/command": ["acp"],
  "/field": ["constable", "si", "acp"],
  "/inspector": ["si", "acp"],
  "/priority": ["si", "acp"],
  "/dispatch": ["si", "acp"],
  "/evidence": ["si", "acp"],
  "/map": ["constable", "si", "acp"],
  "/cascade": ["constable", "si", "acp"],
  "/alerts": ["constable", "si", "acp"],
  "/overview": ["constable", "si", "acp"],
  "/early-warning": ["acp"],
  "/simulator": ["acp"],
  "/repeat-offenders": ["acp"],
  "/triage": ["si", "acp"],
  "/ai-copilot": ["constable", "si", "acp"],
  "/capacity-board": ["acp"],
  "/flipkart-scout": ["scout", "acp"],
  "/flipkart-impact": ["acp", "si"],
  "/scout-leaderboard": ["scout", "si", "acp"]
};

export default function AppRoutes({ role }) {
  const allowedNavs = NAV_BY_ROLE[role] || [];
  const defaultFallbackPath = role === "scout" ? "/flipkart-scout" : "/";
  const fallbackPath = allowedNavs.length > 0 ? allowedNavs[0].path : defaultFallbackPath;

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {ROUTE_CONFIG.map(({ path, component: Component, passRole }) => {
            const allowedRoles = ROUTE_PERMISSIONS[path] || [];
            const isAuthorized = allowedRoles.includes(role);

            return (
              <Route
                key={path}
                path={path}
                element={
                  isAuthorized ? (
                    <ErrorBoundary key={path}>
                      {passRole ? <Component role={role} /> : <Component />}
                    </ErrorBoundary>
                  ) : (
                    <Navigate to={fallbackPath} replace />
                  )
                }
              />
            );
          })}
          <Route path="*" element={<Navigate to={fallbackPath} replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
