import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XIcon } from "@/components/icons";

// --- classnames helper ---
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

// --- Button ---
type Variant = "primary" | "ghost" | "outline" | "danger";

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
        : variant === "danger"
          ? "btn-danger"
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
  return <div className={cn("card p-6", className)}>{children}</div>;
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

// --- Progress ring (daily goal, mastery) ---
export function ProgressRing({
  value,
  size = 72,
  stroke = 7,
  tone = "brand",
  children,
  className,
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  tone?: "brand" | "green" | "amber";
  children?: ReactNode;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const colors: Record<string, string> = {
    brand: "#7c65f1",
    green: "#10b981",
    amber: "#f59e0b",
  };
  return (
    <div
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colors[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - clamped) }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

// --- Stat card ---
export function Stat({
  label,
  value,
  icon,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("card flex items-center gap-3 p-4", className)}>
      {icon && (
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 text-ink-300">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate text-lg font-semibold text-white">{value}</div>
        <div className="truncate text-xs text-ink-400">
          {label}
          {hint ? <span className="text-ink-500"> · {hint}</span> : null}
        </div>
      </div>
    </div>
  );
}

// --- Modal ---
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={cn(
              "card w-full p-6",
              wide ? "max-w-2xl" : "max-w-md",
            )}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              {title && <h3 className="section-title">{title}</h3>}
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-ink-400 hover:bg-white/10 hover:text-white"
              >
                <XIcon className="h-4.5 w-4.5" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- Page header (one consistent title treatment for every screen) ---
export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle max-w-xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
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
      {eyebrow && <div className="eyebrow mb-3">{eyebrow}</div>}
      <h2 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        {title}
      </h2>
      {subtitle && <p className="mt-3 max-w-2xl text-ink-400">{subtitle}</p>}
    </div>
  );
}

// --- Empty state ---
export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/8 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-ink-500">{icon}</div>}
      <p className="text-sm font-semibold text-white">{title}</p>
      {children && <p className="mt-1.5 max-w-sm text-sm text-ink-400">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// --- Fade-up wrapper for staggered page sections ---
export function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// --- Segmented control ---
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-xl border border-white/10 bg-white/5 p-1",
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
            value === o.value
              ? "bg-ink-700 text-white"
              : "text-ink-400 hover:text-white",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
