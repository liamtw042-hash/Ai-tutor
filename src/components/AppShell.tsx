import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import { Badge, Button, cn } from "@/components/ui";
import {
  ChatIcon,
  DocIcon,
  GridIcon,
  HomeIcon,
  LogoutIcon,
  PenIcon,
  SparkIcon,
} from "@/components/icons";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { to: "/practice", label: "Practice", icon: PenIcon },
  { to: "/tutor", label: "AI Tutor", icon: ChatIcon },
  { to: "/essay", label: "Essay Feedback", icon: DocIcon },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              isActive
                ? "bg-brand-500/15 text-white ring-1 ring-inset ring-brand-500/30"
                : "text-ink-300 hover:bg-white/5 hover:text-ink-100",
            )
          }
        >
          <Icon className="h-[18px] w-[18px]" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function UpgradeCard() {
  const { profile, togglePremium } = useAuth();
  if (profile?.premium) {
    return (
      <div className="rounded-2xl border border-brand-500/25 bg-brand-500/10 p-4">
        <Badge tone="brand">
          <SparkIcon className="h-3.5 w-3.5" /> Premium
        </Badge>
        <p className="mt-2 text-xs text-ink-300">
          Unlimited practice, tutoring and analytics unlocked.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-brand-500/15 to-transparent p-4">
      <p className="text-sm font-semibold text-white">Go Premium</p>
      <p className="mt-1 text-xs text-ink-300">
        Unlimited everything, analytics & past-paper mode.
      </p>
      <Button
        variant="primary"
        className="mt-3 w-full text-xs"
        onClick={togglePremium}
      >
        Upgrade — $9.99/mo
      </Button>
      <p className="mt-1.5 text-center text-[10px] text-ink-500">
        Demo: toggles instantly, no card required
      </p>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initials = (profile?.displayName || "S")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-white/5 bg-ink-900/40 p-4 lg:flex">
        <div>
          <div className="px-2 py-2">
            <Logo />
          </div>
          <div className="mt-6">
            <NavItems />
          </div>
        </div>
        <div className="space-y-3">
          <UpgradeCard />
          <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-100">
                {profile?.displayName || "Student"}
              </p>
              <p className="truncate text-xs text-ink-400">
                {profile?.premium ? "Premium plan" : "Free plan"}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="rounded-lg p-1.5 text-ink-400 hover:bg-white/10 hover:text-ink-100"
            >
              <LogoutIcon className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-ink-950/80 px-4 py-3 backdrop-blur lg:hidden">
          <Logo size={28} />
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="btn-ghost px-3 py-2"
          >
            <GridIcon className="h-5 w-5" />
          </button>
        </header>
        {mobileOpen && (
          <div className="border-b border-white/5 bg-ink-900/90 p-4 lg:hidden">
            <NavItems onNavigate={() => setMobileOpen(false)} />
            <div className="mt-3">
              <Button
                variant="ghost"
                className="w-full"
                onClick={handleSignOut}
              >
                <LogoutIcon className="h-4 w-4" /> Sign out
              </Button>
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
