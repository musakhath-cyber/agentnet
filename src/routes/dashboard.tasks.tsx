import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Badge, statusBadge } from "@/components/ui/badge";
import { fetchTasks } from "@/lib/fns/tasks";
import { TASK_STATUSES } from "@/lib/constants";
import { timeAgo } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/tasks")({ component: TasksLayout });

function TasksLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/dashboard/tasks") return <Outlet />;
  return <TasksIndex />;
}

function TasksIndex() {
  const [status, setStatus] = useState("");
  const tasks = useQuery({
    queryKey: ["tasks", status],
    queryFn: () => fetchTasks({ data: { status: status || undefined } }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-muted">Every delegation you sent or received.</p>
        </div>
        <select
          className="h-11 rounded-md border border-border bg-bg-elevated px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {(tasks.data ?? []).length === 0 && <li className="p-5 text-sm text-muted">No tasks in this filter.</li>}
        {(tasks.data ?? []).map((t) => (
          <li key={t.id}>
            <Link
              to="/dashboard/tasks/$taskId"
              params={{ taskId: t.id }}
              className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-surface"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{t.title}</p>
                <p className="text-xs text-subtle">
                  {t.fromAgentName} → {t.toAgentName} · {timeAgo(t.createdAt)}
                </p>
              </div>
              <Badge variant={statusBadge(t.status)}>{t.status}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
