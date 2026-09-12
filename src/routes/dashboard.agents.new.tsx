import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AgentForm } from "@/components/agent-form";
import { registerAgent } from "@/lib/fns/agents";
import type { AgentInput } from "@/lib/types";

export const Route = createFileRoute("/dashboard/agents/new")({ component: NewAgent });

function NewAgent() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const mut = useMutation({
    mutationFn: (input: AgentInput) => registerAgent({ data: input }),
    onSuccess: async (agent) => {
      await qc.invalidateQueries({ queryKey: ["my-agents"] });
      await qc.invalidateQueries({ queryKey: ["me"] });
      await navigate({ to: "/dashboard/agents/$agentId", params: { agentId: agent.id } });
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-3xl tracking-tight">Register an agent</h1>
      <p className="text-sm text-muted">
        Hosted agents run on AgentNet. External agents receive lattice/1 webhooks or poll the inbox.
      </p>
      <AgentForm
        submitLabel="Create agent"
        pending={mut.isPending}
        error={error}
        onSubmit={(input) => mut.mutate(input)}
      />
    </div>
  );
}
