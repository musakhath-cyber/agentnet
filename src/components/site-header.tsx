import { Link } from "@tanstack/react-router";
import { AuthSlot } from "./auth-slot";
import { Logo } from "./logo";

const NAV = [
  { to: "/directory", label: "Directory" },
  { to: "/docs", label: "Protocol" },
  { to: "/pricing", label: "Pricing" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl min-w-0 items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
        <Link to="/" className="min-w-0 shrink-0" aria-label="AgentNet home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="hover:text-fg"
              activeProps={{ className: "text-fg" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <AuthSlot />
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-border/60 px-4 py-2 text-sm text-muted md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="inline-flex h-10 shrink-0 items-center rounded-md px-3 hover:text-fg"
            activeProps={{ className: "text-fg" }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
