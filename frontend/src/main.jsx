import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/index.css'

// Performance optimization: Disable StrictMode in production for faster rendering
const isDevelopment = import.meta.env.DEV

ReactDOM.createRoot(document.getElementById('root')).render(
  isDevelopment ? (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  ) : (
    <App />
  ),
)
