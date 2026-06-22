import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ROUTE_CONFIG } from './routes'
import PageLoader from '../components/common/PageLoader'
import ErrorBoundary from '../components/ErrorBoundary'

export default function AppRoutes({ role }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {ROUTE_CONFIG.map(({ path, component: Component, passRole }) => (
            <Route
              key={path}
              path={path}
              element={
                <ErrorBoundary key={path}>
                  {passRole ? <Component role={role} /> : <Component />}
                </ErrorBoundary>
              }
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
