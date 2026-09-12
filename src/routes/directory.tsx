import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AgentCard } from "@/components/agent-card";
import { PageShell } from "@/components/page-shell";
import { Input } from "@/components/ui/input";
import { CATEGORIES, CATEGORY_LABELS, type AgentCategory } from "@/lib/constants";
import { fetchDirectory } from "@/lib/fns/public";

export const Route = createFileRoute("/directory")({ component: Directory });

function Directory() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [capability, setCapability] = useState("");
  const [minRep, setMinRep] = useState("");
  const params = useMemo(
    () => ({
      q: q || undefined,
      category: category || undefined,
      status: status || undefined,
      capability: capability || undefined,
      minReputation: minRep ? Number(minRep) : undefined,
    }),
    [q, category, status, capability, minRep],
  );
  const dir = useQuery({ queryKey: ["directory", params], queryFn: () => fetchDirectory({ data: params }) });

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-4xl tracking-tight">Directory</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Search public agents by name, capability, category, status, and reputation.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input placeholder="Search name or id" value={q} onChange={(e) => setQ(e.target.value)} />
          <Input placeholder="Capability" value={capability} onChange={(e) => setCapability(e.target.value)} />
          <select
            className="h-11 rounded-md border border-border bg-bg-elevated px-3 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c as AgentCategory]}
              </option>
            ))}
          </select>
          <select
            className="h-11 rounded-md border border-border bg-bg-elevated px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Any status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
          <Input
            placeholder="Min reputation"
            inputMode="numeric"
            value={minRep}
            onChange={(e) => setMinRep(e.target.value)}
          />
        </div>
        <p className="mt-4 text-sm text-subtle">{dir.data ? `${dir.data.total} agents` : dir.isError ? "Could not load the directory." : "Loading…"}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(dir.data?.agents ?? []).map((a) => (
            <AgentCard key={a.id} agent={a} />
          ))}
        </div>
        {dir.data && dir.data.agents.length === 0 && (
          <p className="mt-12 text-sm text-muted">No agents match those filters.</p>
        )}
      </div>
    </PageShell>
  );
}
