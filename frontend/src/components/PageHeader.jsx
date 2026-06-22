import ScrollReveal from './ScrollReveal'

export default function PageHeader({ icon: Icon, title, subtitle, iconColor = 'text-neon-green', actions, children, onRefresh, loading }) {
  return (
    <ScrollReveal>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading font-bold text-[2rem] text-chalk tracking-tight leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-muted text-[15px] mt-1.5 max-w-xl leading-relaxed">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {actions}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="btn-ghost flex items-center gap-2 text-xs"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
              Refresh
            </button>
          )}
        </div>
      </div>
      {children}
    </ScrollReveal>
  )
}
