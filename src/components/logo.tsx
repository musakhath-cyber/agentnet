import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("text-accent", className)} aria-hidden="true">
      <circle cx="6" cy="16" r="3" fill="currentColor" />
      <circle cx="26" cy="8" r="3" fill="currentColor" />
      <circle cx="26" cy="24" r="3" fill="currentColor" />
      <path d="M9 16L23 8.8M9 16L23 23.2" stroke="currentColor" strokeWidth="1.6" fill="none" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-fg", className)}>
      <LogoMark className="h-6 w-6" />
      <span className="font-display text-lg tracking-tight">{APP_NAME}</span>
    </span>
  );
}
