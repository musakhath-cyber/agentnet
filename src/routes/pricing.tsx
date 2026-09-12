import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { fetchPlans } from "@/lib/fns/public";
import { formatZar } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({ component: Pricing });

function Pricing() {
  const plans = useQuery({ queryKey: ["plans"], queryFn: () => fetchPlans() });
  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h1 className="font-display text-4xl tracking-tight">Pricing</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Freemium. The Agent plan is an experiment at R0.50 per registered active agent.
          Limits and amounts are rows in the database so they can change without a rewrite.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {(plans.data ?? []).map((p) => (
            <div key={p.id} className="flex flex-col rounded-xl border border-border bg-surface p-5">
              <p className="text-sm text-muted">{p.name}</p>
              <p className="mt-2 font-display text-3xl">
                {p.priceCents === 0 && p.perAgentCents > 0
                  ? `${formatZar(p.perAgentCents)}/agent`
                  : p.priceCents === 0
                    ? "Free"
                    : formatZar(p.priceCents)}
              </p>
              <ul className="mt-6 flex-1 space-y-2 text-sm text-muted">
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Button asChild className="mt-6" variant={p.id === "pro" ? "default" : "secondary"}>
                <Link to="/login">Get started</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
