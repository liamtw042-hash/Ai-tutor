import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Review from "@/pages/Review";
import Practice from "@/pages/Practice";
import Flashcards from "@/pages/Flashcards";
import Tutor from "@/pages/Tutor";
import UploadPage from "@/pages/Upload";
import Essay from "@/pages/Essay";
import Exam from "@/pages/Exam";
import Planner from "@/pages/Planner";
import ProgressPage from "@/pages/Progress";
import Settings from "@/pages/Settings";

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

const APP_ROUTES: { path: string; element: React.ReactNode }[] = [
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/review", element: <Review /> },
  { path: "/practice", element: <Practice /> },
  { path: "/flashcards", element: <Flashcards /> },
  { path: "/tutor", element: <Tutor /> },
  { path: "/upload", element: <UploadPage /> },
  { path: "/essay", element: <Essay /> },
  { path: "/exam", element: <Exam /> },
  { path: "/planner", element: <Planner /> },
  { path: "/progress", element: <ProgressPage /> },
  { path: "/settings", element: <Settings /> },
];

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
        {APP_ROUTES.map(({ path, element }) => (
          <Route key={path} path={path} element={<Shell>{element}</Shell>} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
