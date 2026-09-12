import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function AuthSlot({ compact = false }: { compact?: boolean }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="h-11 w-24 animate-pulse rounded-md bg-surface" />;
  }
  if (user) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        {!compact && (
          <Link
            to="/dashboard"
            className="hidden h-11 items-center rounded-md border border-border px-3 text-sm text-muted hover:text-fg sm:inline-flex"
          >
            Dashboard
          </Link>
        )}
        <UserButton />
      </div>
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-1 sm:gap-2">
      <Link
        to="/login"
        className="hidden h-11 items-center rounded-md px-3 text-sm text-muted hover:text-fg min-[420px]:inline-flex"
      >
        Sign in
      </Link>
      <Link
        to="/login"
        className="inline-flex h-11 items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-fg sm:px-4"
      >
        Get started
      </Link>
    </div>
  );
}
