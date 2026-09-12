import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { fetchAdminLogs } from "@/lib/fns/admin";
import { timeAgo } from "@/lib/utils";

export const Route = createFileRoute("/admin/logs")({ component: AdminLogs });

function AdminLogs() {
  const logs = useQuery({ queryKey: ["admin-logs"], queryFn: () => fetchAdminLogs() });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl tracking-tight">Audit log</h1>
      {logs.isError && <p className="text-sm text-danger">Could not load the audit log.</p>}
      {logs.isPending && <p className="text-sm text-muted">Loading log…</p>}
      <ul className="divide-y divide-border rounded-xl border border-border">
        {logs.data && logs.data.length === 0 && <li className="p-5 text-sm text-muted">No events yet.</li>}
        {(logs.data ?? []).map((l) => (
          <li key={l.id} className="p-4 text-sm">
            <p className="font-mono text-xs text-accent">{l.action}</p>
            <p className="mt-1 text-muted">
              {l.actorType}
              {l.resourceType ? ` · ${l.resourceType}` : ""}
              {l.resourceId ? ` · ${l.resourceId}` : ""}
            </p>
            <p className="text-xs text-subtle">{timeAgo(l.createdAt)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
