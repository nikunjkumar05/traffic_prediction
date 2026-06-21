export default function LoadingSkeleton({ rows = 4, className = '', variant = 'default' }) {
  if (variant === 'dashboard') {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-elevated rounded-lg animate-pulse" />
        <div className="card h-32 bg-elevated animate-pulse" />
        <div className="card h-64 bg-elevated animate-pulse" />
      </div>
    )
  }
  
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-elevated rounded animate-pulse" 
             style={{ width: `${60 + Math.random() * 40}%` }} />
      ))}
    </div>
  )
}
