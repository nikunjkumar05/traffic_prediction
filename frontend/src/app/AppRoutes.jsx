import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ROUTE_CONFIG } from './routes'
import PageLoader from '../components/common/PageLoader'

export default function AppRoutes({ role }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {ROUTE_CONFIG.map(({ path, component: Component, passRole }) => (
          <Route
            key={path}
            path={path}
            element={passRole ? <Component role={role} /> : <Component />}
          />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
