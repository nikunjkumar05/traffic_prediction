import { useState } from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./app/AppRoutes";
import AppShell from "./layout/AppShell";

export default function App() {
  const [role, setRole] = useState("acp");

  return (
    <BrowserRouter>
      <AppShell role={role} setRole={setRole}>
        <AppRoutes role={role} />
      </AppShell>
    </BrowserRouter>
  );
}
