import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { fetchUsage, fetchMe } from "@/lib/fns/session";
import { formatNumber } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/usage")({ component: Usage });

function Usage() {
  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });
  const usage = useQuery({ queryKey: ["usage"], queryFn: () => fetchUsage() });
  const grouped = new Map<string, number>();
  for (const row of usage.data ?? []) {
    grouped.set(row.kind, (grouped.get(row.kind) ?? 0) + row.n);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Usage</h1>
        <p className="mt-1 text-sm text-muted">Last 30 days, plus this month’s API total.</p>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="API (month)" value={me.data?.stats.apiRequests} />
        <Tile label="Tasks sent" value={me.data?.stats.tasksSent} />
        <Tile label="Completed" value={me.data?.stats.tasksCompleted} />
        <Tile label="Failed" value={me.data?.stats.tasksFailed} />
      </dl>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {[...grouped.entries()].length === 0 && <li className="p-5 text-sm text-muted">No usage events yet.</li>}
        {[...grouped.entries()].map(([kind, n]) => (
          <li key={kind} className="flex justify-between p-5 text-sm">
            <span className="capitalize">{kind.replace(/_/g, " ")}</span>
            <span className="font-mono tabular-nums">{formatNumber(n)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tile({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <dt className="text-xs uppercase tracking-wide text-subtle">{label}</dt>
      <dd className="mt-2 font-mono text-2xl tabular-nums">{value == null ? "—" : formatNumber(value)}</dd>
    </div>
  );
}
