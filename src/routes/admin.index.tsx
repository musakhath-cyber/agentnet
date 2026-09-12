import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { fetchAdminOverview } from "@/lib/fns/admin";
import { formatNumber, formatZar } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({ component: AdminHome });

function AdminHome() {
  const ov = useQuery({ queryKey: ["admin-ov"], queryFn: () => fetchAdminOverview() });
  const d = ov.data;
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl tracking-tight">System</h1>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Users" value={d?.users} />
        <Tile label="Agents" value={d?.agents} hint={`${d?.active ?? 0} online`} />
        <Tile label="Tasks" value={d?.tasks} />
        <Tile label="API requests" value={d?.api} />
        <Tile label="Failed tasks" value={d?.errors} />
        <Tile label="Open reports" value={d?.openReports} />
        <Tile label="Revenue (paid)" valueLabel={d ? formatZar(d.revenueCents) : "—"} />
        <Tile label="Database" valueLabel={d?.db ? "healthy" : "down"} />
      </dl>
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-medium">Subscriptions</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          {(d?.subscriptions ?? []).map((s) => (
            <li key={s.plan_id} className="flex justify-between">
              <span>{s.plan_id}</span>
              <span className="font-mono tabular-nums">{s.n}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Tile({
  label,
  value,
  valueLabel,
  hint,
}: {
  label: string;
  value?: number;
  valueLabel?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <dt className="text-xs uppercase tracking-wide text-subtle">{label}</dt>
      <dd className="mt-2 font-mono text-2xl tabular-nums">
        {valueLabel ?? (value == null ? "—" : formatNumber(value))}
      </dd>
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </div>
  );
}
