import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-8 w-8", className)}
      aria-label="SOYL"
    >
      <defs>
        <radialGradient id="soylRing" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#AFD0CC" stopOpacity="0.0" />
          <stop offset="55%" stopColor="#AFD0CC" stopOpacity="0.0" />
          <stop offset="100%" stopColor="#AFD0CC" stopOpacity="0.55" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="#0a1014" stroke="#AFD0CC" strokeOpacity="0.35" />
      <circle cx="32" cy="32" r="30" fill="url(#soylRing)" />
      <path
        d="M22 22 C 30 14, 44 18, 46 30 C 48 42, 36 50, 28 46 C 18 42, 16 30, 22 22 Z"
        fill="#F5F5FD"
        opacity="0.92"
      />
      <path
        d="M30 26 C 36 24, 42 28, 41 34 C 40 40, 32 42, 28 38 C 24 34, 26 28, 30 26 Z"
        fill="#030709"
      />
    </svg>
  );
}

export function LogoLockup({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark />
      <div className="leading-tight">
        <div className="font-display text-bone tracking-wide">
          SOYL <span className="opacity-80">AI</span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-mint/80">
          Story of your life
        </div>
      </div>
    </div>
  );
}
