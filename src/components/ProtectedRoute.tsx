import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { Spinner } from "@/components/ui";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, profile, loading, configured } = useAuth();
  const location = useLocation();

  // In demo mode (no Firebase configured) we still let people explore the UI.
  if (!configured) return <>{children}</>;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-brand-300">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Force onboarding until subjects are picked.
  if (
    profile &&
    !profile.onboarded &&
    location.pathname !== "/onboarding"
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
