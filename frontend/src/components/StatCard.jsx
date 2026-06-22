import { memo } from "react"
import { formatNumber } from "../utils/api"

function StatCard({
  label,
  value,
  suffix,
  sub,
  icon: Icon,
  title,
  change,
  color = "blue",
  gradient = "light",
}) {
  const displayLabel = label || title
  const displayValue = value
  const DisplayIcon = Icon

  const colorClasses = {
    blue: "from-blue-500 to-cyan-500",
    green: "from-green-500 to-emerald-500",
    emerald: "from-emerald-500 to-teal-500",
    orange: "from-orange-500 to-yellow-500",
    purple: "from-purple-500 to-pink-500",
    red: "from-red-500 to-orange-500",
  }

  const gradientClass = colorClasses[color] || colorClasses.blue

  if (gradient === "dark") {
    return (
      <div className="glass-card-static p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
            {DisplayIcon && <DisplayIcon className="w-5 h-5 text-white" />}
          </div>
          <div>
            <p className="text-muted text-sm">{displayLabel}</p>
            <p className="text-chalk text-2xl font-bold font-mono">{displayValue}</p>
          </div>
        </div>
        {change && (
          <div className={`text-sm font-medium ${change?.startsWith("+") || change?.includes("↓") ? "text-signal-emerald" : "text-signal-red"}`}>
            {change} from last week
          </div>
        )}
        {sub && <p className="text-xs text-muted/60 mt-2">{sub}</p>}
      </div>
    )
  }

  return (
    <div className="glass-card-static hover:scale-[1.01] hover:bg-surface/60 transition-all duration-300">
      <div className="flex items-start justify-between mb-2">
        <span className="metric-label">{displayLabel}</span>
        {DisplayIcon && <DisplayIcon className="w-4 h-4 text-muted/50" />}
      </div>
      <div className="metric-value font-mono">
        {typeof displayValue === "number"
          ? formatNumber(displayValue)
          : displayValue}
        {suffix && <span className="text-lg text-muted ml-1">{suffix}</span>}
      </div>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  )
}

export default memo(StatCard)
