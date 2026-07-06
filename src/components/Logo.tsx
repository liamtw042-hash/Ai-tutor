import { Link } from "react-router-dom";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="lm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b83f8" />
          <stop offset="1" stopColor="#5d37c9" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="#14141f" />
      <rect
        width="31"
        height="31"
        x="0.5"
        y="0.5"
        rx="8.5"
        fill="none"
        stroke="url(#lm)"
        strokeOpacity="0.4"
      />
      <path
        d="M9 20.5c0-2 1.7-3.2 3.8-3.2h6.4c1 0 1.8-.7 1.8-1.7s-.8-1.7-1.8-1.7H10.5"
        fill="none"
        stroke="url(#lm)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="22" cy="11" r="2.6" fill="url(#lm)" />
    </svg>
  );
}

export function Logo({
  size = 32,
  to = "/",
  showText = true,
}: {
  size?: number;
  to?: string;
  showText?: boolean;
}) {
  return (
    <Link to={to} className="flex items-center gap-2.5 group">
      <LogoMark size={size} />
      {showText && (
        <span className="font-display text-lg font-bold tracking-tight text-white">
          StudyMate
          <span className="ml-1 rounded-md bg-brand-500/15 px-1.5 py-0.5 align-middle text-[11px] font-bold text-brand-200 ring-1 ring-inset ring-brand-500/30">
            NSW
          </span>
        </span>
      )}
    </Link>
  );
}
