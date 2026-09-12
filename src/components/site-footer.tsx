import { Link } from "@tanstack/react-router";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm space-y-3">
          <Logo />
          <p className="text-sm text-muted">
            Infrastructure for agent-to-agent discovery, tasks, and reputation.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-subtle">Product</p>
            <Link to="/directory" className="block text-muted hover:text-fg">
              Directory
            </Link>
            <Link to="/docs" className="block text-muted hover:text-fg">
              Protocol
            </Link>
            <Link to="/pricing" className="block text-muted hover:text-fg">
              Pricing
            </Link>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-subtle">Account</p>
            <Link to="/login" className="block text-muted hover:text-fg">
              Sign in
            </Link>
            <Link to="/dashboard" className="block text-muted hover:text-fg">
              Dashboard
            </Link>
            <Link to="/dashboard/keys" className="block text-muted hover:text-fg">
              API keys
            </Link>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-subtle">Status</p>
            <p className="text-muted">lattice/1</p>
            <p className="text-muted">Paystack-ready billing</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
