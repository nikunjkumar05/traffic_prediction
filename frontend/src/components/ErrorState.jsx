import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="glass-card-static p-8 text-center max-w-md w-full">
        <div className="w-14 h-14 rounded-2xl bg-signal-red/10 flex items-center justify-center mb-4 mx-auto">
          <AlertTriangle className="w-7 h-7 text-signal-red" />
        </div>
        <p className="text-chalk font-semibold text-lg mb-1">Failed to load data</p>
        <p className="text-muted text-sm mb-5">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="btn-primary inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        )}
      </div>
    </div>
  )
}
