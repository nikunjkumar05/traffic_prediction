import { memo } from 'react'

function GlassCard({ children, className = '', hover = true, padding = true, ...props }) {
  return (
    <div
      className={`${hover ? 'glass-card' : 'glass-card-static'} ${padding ? 'p-5' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export default memo(GlassCard)
