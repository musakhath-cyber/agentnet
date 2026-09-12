import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchTask, mutateTask } from "@/lib/fns/tasks";
import { fetchMyAgents } from "@/lib/fns/agents";
import { timeAgo } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/tasks/$taskId")({ component: TaskDetail });

function TaskDetail() {
  const { taskId } = Route.useParams();
  const qc = useQueryClient();
  const detail = useQuery({ queryKey: ["task", taskId], queryFn: () => fetchTask({ data: taskId }) });
  const mine = useQuery({ queryKey: ["my-agents"], queryFn: () => fetchMyAgents() });
  const act = useMutation({
    mutationFn: (input: { status: "accepted" | "processing" | "completed" | "failed" | "cancelled"; agentId: string }) =>
      mutateTask({ data: { id: taskId, ...input } }),
    onSuccess: () => {
      toast.success("Task updated");
      void qc.invalidateQueries({ queryKey: ["task", taskId] });
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (detail.isPending) return <div className="h-40 animate-pulse rounded-xl bg-surface" />;
  if (!detail.data) return <p className="text-sm text-muted">Task not found.</p>;
  const { task, from, to } = detail.data;
  const ownedReceiver = (mine.data ?? []).some((a) => a.id === task.toAgentId);
  const ownedSender = (mine.data ?? []).some((a) => a.id === task.fromAgentId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-tight">{task.title}</h1>
          <p className="mt-1 font-mono text-xs text-subtle">{task.id}</p>
        </div>
        <Badge variant={statusBadge(task.status)}>{task.status}</Badge>
      </div>
      <p className="text-sm text-muted">
        {from?.name} → {to?.name} · {timeAgo(task.createdAt)}
      </p>
      <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface p-5">
        <h2 className="text-xs uppercase tracking-wide text-subtle">Input</h2>
        <pre className="mt-3 max-w-full overflow-x-auto font-mono text-xs break-all text-muted sm:break-normal">
          {JSON.stringify(task.input, null, 2)}
        </pre>
      </section>
      <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface p-5">
        <h2 className="text-xs uppercase tracking-wide text-subtle">Result</h2>
        {task.error && <p className="mt-3 text-sm text-danger">{task.error}</p>}
        <pre className="mt-3 max-w-full overflow-x-auto font-mono text-xs break-all text-muted sm:break-normal">
          {task.result ? JSON.stringify(task.result, null, 2) : "No result yet."}
        </pre>
      </section>
      <div className="flex flex-wrap gap-2">
        {ownedReceiver && task.status === "pending" && (
          <Button
            variant="secondary"
            onClick={() => act.mutate({ status: "accepted", agentId: task.toAgentId })}
            disabled={act.isPending}
          >
            Accept
          </Button>
        )}
        {ownedReceiver && (task.status === "accepted" || task.status === "pending" || task.status === "processing") && (
          <>
            <Button
              onClick={() =>
                act.mutate({
                  status: "completed",
                  agentId: task.toAgentId,
                })
              }
              disabled={act.isPending}
            >
              Mark completed
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                act.mutate({
                  status: "failed",
                  agentId: task.toAgentId,
                })
              }
              disabled={act.isPending}
            >
              Mark failed
            </Button>
          </>
        )}
        {ownedSender && !["completed", "failed", "cancelled"].includes(task.status) && (
          <Button
            variant="ghost"
            onClick={() => act.mutate({ status: "cancelled", agentId: task.fromAgentId })}
            disabled={act.isPending}
          >
            Cancel
          </Button>
        )}
        <Button variant="link" asChild>
          <Link to="/dashboard/tasks">All tasks</Link>
        </Button>
      </div>
    </div>
  );
}
