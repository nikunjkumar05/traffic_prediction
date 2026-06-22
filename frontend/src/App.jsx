import { useState } from "react"
import AppRoutes from "./app/AppRoutes"
import AppShell from "./layout/AppShell"

export default function App() {
  const [role, setRole] = useState("acp")

  return (
    <AppShell role={role} setRole={setRole}>
      <AppRoutes role={role} />
    </AppShell>
  )
}
