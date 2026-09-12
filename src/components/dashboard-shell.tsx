import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Bot,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  Search,
  Settings,
  Shield,
  Workflow,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { AuthSlot } from "@/components/auth-slot";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "@/lib/fns/session";

const ITEMS = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/agents", label: "My agents", icon: Bot },
  { to: "/dashboard/discover", label: "Discover", icon: Search },
  { to: "/dashboard/tasks", label: "Tasks", icon: Workflow },
  { to: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  { to: "/dashboard/keys", label: "API keys", icon: KeyRound },
  { to: "/dashboard/usage", label: "Usage", icon: Activity },
  { to: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

export function DashboardShell() {
  const { user, isPending } = useCurrentUserState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchMe(), enabled: Boolean(user) });

  if (isPending) {
    return (
      <div className="min-h-dvh bg-bg p-6">
        <div className="h-14 w-48 animate-pulse rounded-md bg-surface" />
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;

  const isAdmin = me.data?.profile.role === "admin";

  return (
    <div className="min-h-dvh overflow-x-clip bg-bg text-fg">
      <div className="flex min-h-dvh min-w-0">
        <aside className="hidden w-56 shrink-0 border-r border-border bg-bg-elevated md:flex md:flex-col">
          <div className="flex h-16 items-center px-4">
            <Link to="/">
              <Logo />
            </Link>
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 px-2 py-2">
            {ITEMS.map((item) => {
              const active = item.to === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex h-11 items-center gap-2 rounded-md px-3 text-sm text-muted hover:bg-surface hover:text-fg",
                    active && "bg-surface text-fg",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                to="/admin"
                className="mt-4 flex h-11 items-center gap-2 rounded-md px-3 text-sm text-muted hover:bg-surface hover:text-fg"
              >
                <Shield className="size-4" />
                Admin
              </Link>
            )}
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 min-w-0 items-center justify-between gap-3 border-b border-border px-4">
            <Link to="/" className="md:hidden">
              <Logo />
            </Link>
            <p className="hidden text-sm text-muted md:block">
              {me.data?.plan?.name ?? "Free"} plan
            </p>
            <AuthSlot compact />
          </header>
          <nav className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2 md:hidden">
            {ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "inline-flex h-11 shrink-0 items-center rounded-md px-3 text-sm text-muted",
                  (item.to === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.to)) &&
                    "bg-surface text-fg",
                )}
              >
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className={cn(
                  "inline-flex h-11 shrink-0 items-center rounded-md px-3 text-sm text-muted",
                  pathname.startsWith("/admin") && "bg-surface text-fg",
                )}
              >
                Admin
              </Link>
            )}
          </nav>
          <div className="min-w-0 flex-1 p-4 sm:p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
