import type { ButtonHTMLAttributes, ReactNode } from "react";

// --- classnames helper ---
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

// --- Button ---
type Variant = "primary" | "ghost" | "outline";

export function Button({
  variant = "primary",
  className,
  loading,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
}) {
  const cls =
    variant === "primary"
      ? "btn-primary"
      : variant === "outline"
        ? "btn-outline"
        : "btn-ghost";
  return (
    <button
      className={cn(cls, className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

// --- Card ---
export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("card p-5", className)}>{children}</div>;
}

// --- Spinner ---
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin text-current", className || "h-5 w-5")}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4Z"
      />
    </svg>
  );
}

// --- Badge / chip ---
export function Badge({
  children,
  tone = "brand",
  className,
}: {
  children: ReactNode;
  tone?: "brand" | "green" | "red" | "neutral" | "amber";
  className?: string;
}) {
  const tones: Record<string, string> = {
    brand: "bg-brand-500/12 text-brand-200 ring-brand-500/25",
    green: "bg-emerald-500/12 text-emerald-300 ring-emerald-500/25",
    red: "bg-red-500/12 text-red-300 ring-red-500/25",
    amber: "bg-amber-500/12 text-amber-300 ring-amber-500/25",
    neutral: "bg-white/5 text-ink-200 ring-white/10",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// --- Progress bar ---
export function Progress({
  value,
  className,
  tone = "brand",
}: {
  value: number; // 0..1
  className?: string;
  tone?: "brand" | "green" | "amber" | "red";
}) {
  const tones: Record<string, string> = {
    brand: "bg-brand-500",
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-white/5", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", tones[tone])}
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
      />
    </div>
  );
}

// --- Section heading ---
export function SectionTitle({
  eyebrow,
  title,
  subtitle,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {eyebrow && (
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-300">
          {eyebrow}
        </div>
      )}
      <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
        {title}
      </h2>
      {subtitle && <p className="mt-2 max-w-2xl text-ink-300">{subtitle}</p>}
    </div>
  );
}

// --- Empty state ---
export function EmptyState({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-brand-300">{icon}</div>}
      <p className="font-semibold text-ink-100">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-ink-400">{children}</p>}
    </div>
  );
}
