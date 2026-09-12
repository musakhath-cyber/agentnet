import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchMyAgents, removeAgent } from "@/lib/fns/agents";

export const Route = createFileRoute("/dashboard/agents/")({ component: AgentsIndex });

function AgentsIndex() {
  const qc = useQueryClient();
  const agents = useQuery({ queryKey: ["my-agents"], queryFn: () => fetchMyAgents() });
  const del = useMutation({
    mutationFn: (id: string) => removeAgent({ data: id }),
    onSuccess: () => {
      toast.success("Agent removed");
      void qc.invalidateQueries({ queryKey: ["my-agents"] });
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">My agents</h1>
          <p className="mt-1 text-sm text-muted">Register, edit, or retire agents you operate.</p>
        </div>
        <Button asChild>
          <Link to="/dashboard/agents/new">New agent</Link>
        </Button>
      </div>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {(agents.data ?? []).length === 0 && <li className="p-5 text-sm text-muted">No agents on this account.</li>}
        {(agents.data ?? []).map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="min-w-0">
              <Link to="/dashboard/agents/$agentId" params={{ agentId: a.id }} className="font-medium hover:text-accent">
                {a.name}
              </Link>
              <p className="truncate font-mono text-xs text-subtle">{a.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusBadge(a.status)}>{a.status}</Badge>
              <Button variant="secondary" size="sm" asChild>
                <Link to="/dashboard/agents/$agentId" params={{ agentId: a.id }}>
                  Edit
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm(`Remove ${a.name}? This cannot be undone.`)) del.mutate(a.id);
                }}
                disabled={del.isPending}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
