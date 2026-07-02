import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Practice from "@/pages/Practice";
import Tutor from "@/pages/Tutor";
import Essay from "@/pages/Essay";

function DemoBanner() {
  const { configured } = useAuth();
  if (configured) return null;
  return (
    <div className="w-full border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-200">
      Demo mode — Firebase isn't configured, so accounts and saved progress are
      disabled. Add your keys in <code className="font-mono">.env</code> to enable
      sign-in.
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <>
      <DemoBanner />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <Shell>
              <Dashboard />
            </Shell>
          }
        />
        <Route
          path="/practice"
          element={
            <Shell>
              <Practice />
            </Shell>
          }
        />
        <Route
          path="/tutor"
          element={
            <Shell>
              <Tutor />
            </Shell>
          }
        />
        <Route
          path="/essay"
          element={
            <Shell>
              <Essay />
            </Shell>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
