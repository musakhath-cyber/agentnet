import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminAct, fetchAdminSettings } from "@/lib/fns/admin";

export const Route = createFileRoute("/admin/settings")({ component: AdminSettings });

function AdminSettings() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["admin-settings"], queryFn: () => fetchAdminSettings() });
  const [edits, setEdits] = useState<Record<string, { price: string; agents: string; tasks: string; perAgent: string }>>(
    {},
  );
  const act = useMutation({
    mutationFn: (input: {
      kind: "update_plan";
      planId: string;
      patch: { price_cents: number; agent_limit: number; task_limit: number; per_agent_cents: number };
    }) => adminAct({ data: input }),
    onSuccess: () => {
      toast.success("Saved");
      void qc.invalidateQueries({ queryKey: ["admin-settings"] });
      void qc.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl tracking-tight">Platform settings</h1>
      <p className="text-sm text-muted">Edit plan limits and ZAR amounts without shipping new code.</p>
      <div className="space-y-4">
        {(settings.data?.plans ?? []).map((p) => {
          const edit = edits[p.id] ?? {
            price: String(p.priceCents),
            agents: String(p.agentLimit),
            tasks: String(p.taskLimit),
            perAgent: String(p.perAgentCents),
          };
          return (
            <form
              key={p.id}
              className="rounded-xl border border-border bg-surface p-5"
              onSubmit={(e) => {
                e.preventDefault();
                act.mutate({
                  kind: "update_plan",
                  planId: p.id,
                  patch: {
                    price_cents: Number(edit.price),
                    agent_limit: Number(edit.agents),
                    task_limit: Number(edit.tasks),
                    per_agent_cents: Number(edit.perAgent),
                  },
                });
              }}
            >
              <h2 className="font-display text-xl">{p.name}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <Field
                  label="Price (cents)"
                  value={edit.price}
                  onChange={(v) => setEdits({ ...edits, [p.id]: { ...edit, price: v } })}
                />
                <Field
                  label="Per agent (cents)"
                  value={edit.perAgent}
                  onChange={(v) => setEdits({ ...edits, [p.id]: { ...edit, perAgent: v } })}
                />
                <Field
                  label="Agent limit"
                  value={edit.agents}
                  onChange={(v) => setEdits({ ...edits, [p.id]: { ...edit, agents: v } })}
                />
                <Field
                  label="Task limit"
                  value={edit.tasks}
                  onChange={(v) => setEdits({ ...edits, [p.id]: { ...edit, tasks: v } })}
                />
              </div>
              <Button className="mt-4" type="submit" size="sm" disabled={act.isPending}>
                Save {p.name}
              </Button>
            </form>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} inputMode="numeric" />
    </label>
  );
}
