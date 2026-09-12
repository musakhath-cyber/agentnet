import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AgentForm } from "@/components/agent-form";
import { Button } from "@/components/ui/button";
import { fetchMyAgent, pingHeartbeat, removeAgent, saveAgent } from "@/lib/fns/agents";
import type { AgentInput } from "@/lib/types";

export const Route = createFileRoute("/dashboard/agents/$agentId")({ component: EditAgent });

function EditAgent() {
  const { agentId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const detail = useQuery({ queryKey: ["my-agent", agentId], queryFn: () => fetchMyAgent({ data: agentId }) });
  const mut = useMutation({
    mutationFn: (input: Partial<AgentInput>) => saveAgent({ data: { id: agentId, ...input } }),
    onSuccess: async () => {
      toast.success("Agent updated");
      await qc.invalidateQueries({ queryKey: ["my-agent", agentId] });
      await qc.invalidateQueries({ queryKey: ["my-agents"] });
    },
    onError: (e: Error) => setError(e.message),
  });
  const beat = useMutation({
    mutationFn: () => pingHeartbeat({ data: agentId }),
    onSuccess: async () => {
      toast.success("Heartbeat recorded — agent is online");
      await qc.invalidateQueries({ queryKey: ["my-agent", agentId] });
      await qc.invalidateQueries({ queryKey: ["my-agents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: () => removeAgent({ data: agentId }),
    onSuccess: async () => {
      toast.success("Agent removed");
      await qc.invalidateQueries({ queryKey: ["my-agents"] });
      await qc.invalidateQueries({ queryKey: ["me"] });
      await navigate({ to: "/dashboard/agents" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (detail.isPending) return <div className="h-32 animate-pulse rounded-xl bg-surface" />;
  if (!detail.data) return <p className="text-sm text-muted">Agent not found on this account.</p>;
  const { agent } = detail.data;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl tracking-tight">{agent.name}</h1>
          <p className="mt-1 break-all font-mono text-xs text-subtle">{agent.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => beat.mutate()} disabled={beat.isPending}>
            Heartbeat
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (window.confirm(`Remove ${agent.name}? This cannot be undone.`)) del.mutate();
            }}
            disabled={del.isPending}
          >
            Delete
          </Button>
        </div>
      </div>
      <AgentForm
        initial={{
          name: agent.name,
          description: agent.description,
          category: agent.category,
          capabilities: agent.capabilities,
          endpointUrl: agent.endpointUrl,
          website: agent.website ?? "",
          version: agent.version,
          hosted: agent.hosted,
          hostedKind: agent.hostedKind,
          visibility: agent.visibility,
          authMethod: agent.authMethod,
        }}
        submitLabel="Save changes"
        pending={mut.isPending}
        error={error}
        onSubmit={(input) => mut.mutate(input)}
      />
    </div>
  );
}
