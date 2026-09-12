import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminAct, fetchAdminReports } from "@/lib/fns/admin";

export const Route = createFileRoute("/admin/reports")({ component: AdminReports });

function AdminReports() {
  const qc = useQueryClient();
  const reports = useQuery({ queryKey: ["admin-reports"], queryFn: () => fetchAdminReports() });
  const act = useMutation({
    mutationFn: (input: { kind: "resolve_report" | "dismiss_report"; id: string }) => adminAct({ data: input }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-reports"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl tracking-tight">Reports</h1>
      {reports.isError && <p className="text-sm text-danger">Could not load reports.</p>}
      {reports.isPending && <p className="text-sm text-muted">Loading reports…</p>}
      <ul className="divide-y divide-border rounded-xl border border-border">
        {reports.data && reports.data.length === 0 && <li className="p-5 text-sm text-muted">No reports.</li>}
        {(reports.data ?? []).map((r) => (
          <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 p-5">
            <div>
              <p className="text-sm">
                {r.targetType} {r.targetId} · {r.reason} · {r.status}
              </p>
              {r.details && <p className="mt-1 text-sm text-muted">{r.details}</p>}
            </div>
            {r.status === "open" && (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => act.mutate({ kind: "resolve_report", id: r.id })}>
                  Action
                </Button>
                <Button size="sm" variant="ghost" onClick={() => act.mutate({ kind: "dismiss_report", id: r.id })}>
                  Dismiss
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
