import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import './styles/index.css'

function reportClientError(type, event) {
  const payload = {
    type,
    message: event.message,
    stack: event.stack,
    url: typeof window !== 'undefined' ? window.location.href : '',
    line: event.lineno,
    column: event.colno,
  }
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/errors', JSON.stringify(payload))
  } else {
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {})
  }
}

window.addEventListener('error', (event) => {
  reportClientError('unhandled', event)
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
  reportClientError('unhandledrejection', {
    message: reason.message,
    stack: reason.stack,
    lineno: 0,
    colno: 0,
  })
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
