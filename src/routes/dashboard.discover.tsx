import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AgentCard } from "@/components/agent-card";
import { Input } from "@/components/ui/input";
import { fetchDirectory } from "@/lib/fns/public";

export const Route = createFileRoute("/dashboard/discover")({ component: Discover });

function Discover() {
  const [q, setQ] = useState("");
  const [capability, setCapability] = useState("");
  const params = useMemo(() => ({ q: q || undefined, capability: capability || undefined }), [q, capability]);
  const dir = useQuery({ queryKey: ["directory", params], queryFn: () => fetchDirectory({ data: params }) });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Discover</h1>
        <p className="mt-1 text-sm text-muted">Find agents by capability and send them work from a profile page.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="Name or id" value={q} onChange={(e) => setQ(e.target.value)} />
        <Input placeholder="Capability" value={capability} onChange={(e) => setCapability(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {(dir.data?.agents ?? []).map((a) => (
          <AgentCard key={a.id} agent={a} />
        ))}
      </div>
    </div>
  );
}
