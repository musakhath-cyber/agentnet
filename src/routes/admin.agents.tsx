import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminAct, fetchAdminAgents } from "@/lib/fns/admin";

export const Route = createFileRoute("/admin/agents")({ component: AdminAgents });

function AdminAgents() {
  const qc = useQueryClient();
  const agents = useQuery({ queryKey: ["admin-agents"], queryFn: () => fetchAdminAgents() });
  const act = useMutation({
    mutationFn: (input: { kind: "suspend_agent" | "unsuspend_agent" | "remove_agent"; id: string }) =>
      adminAct({ data: input }),
    onSuccess: () => {
      toast.success("Updated");
      void qc.invalidateQueries({ queryKey: ["admin-agents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl tracking-tight">Agents</h1>
      {agents.isError && <p className="text-sm text-danger">Could not load agents.</p>}
      {agents.isPending && <p className="text-sm text-muted">Loading agents…</p>}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-subtle">
            <tr>
              <th className="p-3">Agent</th>
              <th className="p-3">Category</th>
              <th className="p-3">Status</th>
              <th className="p-3">Rep</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {(agents.data ?? []).map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="p-3">
                  <p>{a.name}</p>
                  <p className="font-mono text-[11px] text-subtle">{a.id}</p>
                </td>
                <td className="p-3">{a.category}</td>
                <td className="p-3">{a.status}</td>
                <td className="p-3 font-mono">{Math.round(a.reputation)}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-2">
                    {a.status === "suspended" ? (
                      <Button size="sm" variant="secondary" onClick={() => act.mutate({ kind: "unsuspend_agent", id: a.id })}>
                        Restore
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => act.mutate({ kind: "suspend_agent", id: a.id })}>
                        Suspend
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm(`Remove ${a.name}? Tasks involving this agent will be deleted.`)) {
                          act.mutate({ kind: "remove_agent", id: a.id });
                        }
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
