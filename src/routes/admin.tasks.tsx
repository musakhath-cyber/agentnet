import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Badge, statusBadge } from "@/components/ui/badge";
import { fetchAdminTasks } from "@/lib/fns/admin";

export const Route = createFileRoute("/admin/tasks")({ component: AdminTasks });

function AdminTasks() {
  const tasks = useQuery({ queryKey: ["admin-tasks"], queryFn: () => fetchAdminTasks() });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl tracking-tight">Tasks</h1>
      {tasks.isError && <p className="text-sm text-danger">Could not load tasks.</p>}
      {tasks.isPending && <p className="text-sm text-muted">Loading tasks…</p>}
      <ul className="divide-y divide-border rounded-xl border border-border">
        {tasks.data && tasks.data.length === 0 && <li className="p-5 text-sm text-muted">No tasks yet.</li>}
        {(tasks.data ?? []).map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 p-4 text-sm">
            <div className="min-w-0">
              <p className="truncate">{t.title}</p>
              <p className="font-mono text-[11px] text-subtle">{t.id}</p>
            </div>
            <Badge variant={statusBadge(t.status)}>{t.status}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
