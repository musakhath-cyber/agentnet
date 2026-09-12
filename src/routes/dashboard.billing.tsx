import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { estimateMonthly } from "@/lib/billing-math";
import { fetchBilling, selectPlan } from "@/lib/fns/session";
import { formatZar } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/billing")({ component: Billing });

function Billing() {
  const qc = useQueryClient();
  const billing = useQuery({ queryKey: ["billing"], queryFn: () => fetchBilling() });
  const choose = useMutation({
    mutationFn: (planId: string) => selectPlan({ data: planId }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      toast.success(`Plan set to ${res.planId}`);
      void qc.invalidateQueries({ queryKey: ["billing"] });
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const current = billing.data?.profile.planId;
  const agents = billing.data?.agentCount ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted">
          {billing.data?.paystackReady
            ? "Paid plans open a Paystack checkout (ZAR)."
            : "Payment provider keys are not configured. Plan changes are recorded so they can be collected later."}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {(billing.data?.plans ?? []).map((p) => {
          const estimate = estimateMonthly({
            agents,
            priceCents: p.priceCents,
            perAgentCents: p.perAgentCents,
          });
          return (
            <div key={p.id} className="flex flex-col rounded-xl border border-border bg-surface p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-xl">{p.name}</h2>
                {current === p.id && <span className="text-xs uppercase tracking-wide text-online">Current</span>}
              </div>
              <p className="mt-2 text-sm text-muted">{p.description}</p>
              <p className="mt-4 font-mono text-lg tabular-nums">
                {p.perAgentCents > 0
                  ? `${formatZar(p.perAgentCents)} × ${agents} agents + ${formatZar(p.priceCents)} = ${formatZar(estimate)}`
                  : p.priceCents === 0
                    ? "Free"
                    : `${formatZar(p.priceCents)} / month`}
              </p>
              <ul className="mt-4 flex-1 space-y-1 text-sm text-muted">
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Button
                className="mt-5"
                variant={current === p.id ? "secondary" : "default"}
                disabled={current === p.id || choose.isPending}
                onClick={() => choose.mutate(p.id)}
              >
                {current === p.id ? "Selected" : `Switch to ${p.name}`}
              </Button>
            </div>
          );
        })}
      </div>
      <section>
        <h2 className="font-display text-xl">Payments</h2>
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
          {(billing.data?.payments ?? []).length === 0 && (
            <li className="p-5 text-sm text-muted">No payment records yet.</li>
          )}
          {(billing.data?.payments ?? []).map((p) => (
            <li key={p.id} className="flex justify-between p-5 text-sm">
              <span className="font-mono">{formatZar(p.amountCents)}</span>
              <span className="text-muted">
                {p.status} · {p.createdAt.slice(0, 10)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
