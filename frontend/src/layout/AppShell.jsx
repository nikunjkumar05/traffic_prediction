import { memo, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { NAV_BY_ROLE, ROLE_LABELS } from '../app/navigation'

const SideNavItem = memo(function SideNavItem({ item, onClick }) {
  const { path, icon: Icon, label, badge } = item

  return (
    <NavLink
      to={path}
      onClick={onClick}
      className={({ isActive }) =>
        `sidebar-link ${isActive ? 'active' : ''} ${badge === 'hero' ? 'border-l-2 border-signal-emerald' : ''}`
      }
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm">{label}</span>
      {badge === 'hero' && (
        <span className="ml-auto text-[9px] bg-signal-emerald/20 text-signal-emerald px-1.5 py-0.5 rounded font-medium">
          LIVE
        </span>
      )}
    </NavLink>
  )
})

export default function AppShell({ role, setRole, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navItems = useMemo(() => NAV_BY_ROLE[role] || NAV_BY_ROLE.acp, [role])

  return (
    <div className="flex h-screen overflow-hidden bg-base">
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-60 bg-sidebar border-r border-white/[0.06]
          transform transition-transform duration-200 ease-in-out
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
          <img src="/logo.svg" alt="ClearLane" className="w-10 h-10" loading="eager" />
          <div>
            <h1 className="font-heading font-bold text-base text-chalk leading-tight">ClearLane</h1>
            <p className="text-[10px] text-muted uppercase tracking-wider">Congestion-First Enforcement</p>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-white/[0.06]">
          <label className="text-[10px] uppercase tracking-wider text-muted font-medium" htmlFor="role-selector">
            Role
          </label>
          <select
            id="role-selector"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1.5 w-full bg-elevated border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-chalk focus:outline-none focus:border-accent/50 transition-colors"
          >
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <nav className="px-3 py-3 space-y-0.5">
          {navItems.map((item) => (
            <SideNavItem key={`${role}-${item.path}`} item={item} onClick={() => setSidebarOpen(false)} />
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 px-4 py-3 border-t border-white/[0.06]">
          <p className="text-[10px] text-muted/60 text-center uppercase tracking-wider">
            Gridlock Hackathon 2.0
          </p>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className="flex-1 overflow-y-auto bg-base">
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-sidebar sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-elevated transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5 text-chalk" />
          </button>
          <h1 className="font-heading font-bold text-sm text-chalk">ClearLane</h1>
        </div>

        <div className="p-4 lg:p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
