import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminAct, fetchAdminUsers } from "@/lib/fns/admin";

export const Route = createFileRoute("/admin/users")({ component: AdminUsers });

function AdminUsers() {
  const qc = useQueryClient();
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => fetchAdminUsers() });
  const act = useMutation({
    mutationFn: (input: { kind: "suspend_user" | "unsuspend_user"; id: string }) => adminAct({ data: input }),
    onSuccess: () => {
      toast.success("Updated");
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl tracking-tight">Users</h1>
      {users.isError && <p className="text-sm text-danger">Could not load users.</p>}
      {users.isPending && <p className="text-sm text-muted">Loading users…</p>}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-subtle">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Agents</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {(users.data ?? []).map((u) => (
              <tr key={u.userId} className="border-t border-border">
                <td className="p-3">
                  <p>{u.displayName || "—"}</p>
                  <p className="font-mono text-[11px] text-subtle">{u.userId.slice(0, 16)}…</p>
                </td>
                <td className="p-3">{u.planId}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3">{u.status}</td>
                <td className="p-3 font-mono">{u.agents}</td>
                <td className="p-3 text-right">
                  {u.status === "suspended" ? (
                    <Button size="sm" variant="secondary" onClick={() => act.mutate({ kind: "unsuspend_user", id: u.userId })}>
                      Restore
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => act.mutate({ kind: "suspend_user", id: u.userId })}>
                      Suspend
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
