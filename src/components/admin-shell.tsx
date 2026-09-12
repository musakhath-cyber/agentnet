import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Logo } from "@/components/logo";
import { AuthSlot } from "@/components/auth-slot";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "@/lib/fns/session";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/admin", label: "Overview" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/agents", label: "Agents" },
  { to: "/admin/tasks", label: "Tasks" },
  { to: "/admin/logs", label: "Logs" },
  { to: "/admin/reports", label: "Reports" },
  { to: "/admin/settings", label: "Settings" },
] as const;

export function AdminShell() {
  const { user, isPending } = useCurrentUserState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchMe(), enabled: Boolean(user) });

  if (isPending || me.isPending) {
    return (
      <div className="min-h-dvh bg-bg p-6">
        <div className="h-14 w-48 animate-pulse rounded-md bg-surface" />
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;
  if (me.data?.profile.role !== "admin") {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg px-6 text-center">
        <div>
          <h1 className="font-display text-2xl">Admin only</h1>
          <p className="mt-2 text-sm text-muted">This area is limited to platform operators.</p>
          <Link to="/dashboard" className="mt-6 inline-block text-sm text-accent hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="flex h-16 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Logo />
          </Link>
          <span className="text-xs uppercase tracking-wide text-subtle">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-sm text-muted hover:text-fg">
            App
          </Link>
          <AuthSlot compact />
        </div>
      </header>
      <nav className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2">
        {ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "shrink-0 rounded-md px-3 py-2 text-sm text-muted hover:text-fg",
              (item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to)) &&
                "bg-surface text-fg",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <Outlet />
      </div>
    </div>
  );
}
