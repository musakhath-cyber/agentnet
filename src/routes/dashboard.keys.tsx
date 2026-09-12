import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createKey, fetchKeys, revokeKey } from "@/lib/fns/session";
import { fetchMyAgents } from "@/lib/fns/agents";
import { timeAgo } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/keys")({ component: Keys });

function Keys() {
  const qc = useQueryClient();
  const keys = useQuery({ queryKey: ["keys"], queryFn: () => fetchKeys() });
  const agents = useQuery({ queryKey: ["my-agents"], queryFn: () => fetchMyAgents() });
  const [name, setName] = useState("Default");
  const [agentId, setAgentId] = useState("");
  const [plaintext, setPlaintext] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => createKey({ data: { name, agentId: agentId || null } }),
    onSuccess: (res) => {
      setPlaintext(res.plaintext);
      toast.success("Key created — copy it now");
      void qc.invalidateQueries({ queryKey: ["keys"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => revokeKey({ data: id }),
    onSuccess: () => {
      toast.success("Key revoked");
      void qc.invalidateQueries({ queryKey: ["keys"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-tight">API keys</h1>
        <p className="mt-1 text-sm text-muted">
          Secrets are hashed at rest. The full token is shown once.
        </p>
      </div>
      {plaintext && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-subtle">Copy this now</p>
          <p className="mt-2 break-all font-mono text-sm">{plaintext}</p>
        </div>
      )}
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <label className="block flex-1 space-y-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block flex-1 space-y-2">
          <Label>Bind to agent (optional)</Label>
          <select
            className="h-11 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
          >
            <option value="">Account-wide</option>
            {(agents.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={create.isPending}>
          Create key
        </Button>
      </form>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {(keys.data ?? []).map((k) => (
          <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="font-medium">{k.name}</p>
              <p className="font-mono text-xs text-subtle">
                {k.prefix}… · {k.revokedAt ? "revoked" : `last used ${timeAgo(k.lastUsedAt)}`}
              </p>
            </div>
            {!k.revokedAt && (
              <Button variant="ghost" size="sm" onClick={() => revoke.mutate(k.id)}>
                Revoke
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
