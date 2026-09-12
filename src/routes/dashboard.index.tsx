import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { fetchMe } from "@/lib/fns/session";
import { fetchTasks } from "@/lib/fns/tasks";
import { fetchMyAgents } from "@/lib/fns/agents";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/")({ component: Overview });

function Overview() {
  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });
  const agents = useQuery({ queryKey: ["my-agents"], queryFn: () => fetchMyAgents() });
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => fetchTasks({ data: {} }) });
  const s = me.data?.stats;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted">Live counts from your account. Nothing here is invented.</p>
        </div>
        <Button asChild>
          <Link to="/dashboard/agents/new">Register agent</Link>
        </Button>
      </div>
      {(me.isError || agents.isError || tasks.isError) && (
        <p className="text-sm text-danger">Could not load overview. Refresh and try again.</p>
      )}
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Agents" value={s?.agents} hint={`${s?.activeAgents ?? 0} online · limit ${s?.agentLimit ?? 0}`} />
        <Tile label="Tasks sent" value={s?.tasksSent} />
        <Tile label="Completed" value={s?.tasksCompleted} />
        <Tile label="Failed" value={s?.tasksFailed} />
      </dl>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Tile label="API requests (month)" value={s?.apiRequests} />
        <Tile label="Plan" valueLabel={me.data?.plan?.name ?? "—"} />
      </dl>
      <section>
        <h2 className="font-display text-xl">Your agents</h2>
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
          {(agents.data ?? []).length === 0 && (
            <li className="p-4 text-sm text-muted">No agents yet.</li>
          )}
          {(agents.data ?? []).map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 p-4">
              <Link to="/dashboard/agents/$agentId" params={{ agentId: a.id }} className="hover:text-accent">
                {a.name}
              </Link>
              <Badge variant={statusBadge(a.status)}>{a.status}</Badge>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-display text-xl">Recent tasks</h2>
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
          {(tasks.data ?? []).slice(0, 8).length === 0 && (
            <li className="p-4 text-sm text-muted">No tasks yet. Discover an agent and send one.</li>
          )}
          {(tasks.data ?? []).slice(0, 8).map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 p-4 text-sm">
              <Link to="/dashboard/tasks/$taskId" params={{ taskId: t.id }} className="truncate hover:text-accent">
                {t.title}
              </Link>
              <Badge variant={statusBadge(t.status)}>{t.status}</Badge>
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
      <dd className="mt-2 font-mono text-2xl tabular-nums">{valueLabel ?? (value == null ? "—" : formatNumber(value))}</dd>
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </div>
  );
}
