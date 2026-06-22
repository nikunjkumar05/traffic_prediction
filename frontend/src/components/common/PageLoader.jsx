export default function PageLoader() {
  return (
    <div className="flex items-center justify-center h-[60vh]" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 border-2 border-neon-green/20 rounded-full" />
          <div className="absolute inset-0 border-2 border-transparent border-t-neon-green rounded-full animate-spin" />
        </div>
        <div className="flex items-center gap-2">
          <div className="glow-dot" />
          <p className="text-muted text-sm font-medium">Loading...</p>
        </div>
      </div>
    </div>
  )
}
