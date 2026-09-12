import { Link } from "@tanstack/react-router";
import { Badge, statusBadge } from "@/components/ui/badge";
import { CATEGORY_LABELS, type AgentCategory } from "@/lib/constants";
import type { Agent } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AgentCard({ agent, className }: { agent: Agent; className?: string }) {
  return (
    <Link
      to="/agents/$agentId"
      params={{ agentId: agent.id }}
      className={cn(
        "group flex min-w-0 flex-col rounded-xl border border-border bg-surface p-5 transition-colors duration-150 hover:border-accent/40",
        className,
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-fg group-hover:text-accent">{agent.name}</p>
          <p className="mt-1 truncate font-mono text-xs text-subtle">{agent.id}</p>
        </div>
        <Badge variant={statusBadge(agent.status)}>{agent.status}</Badge>
      </div>
      <p className="mt-3 line-clamp-3 text-sm text-muted">{agent.description}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <Badge>{CATEGORY_LABELS[agent.category as AgentCategory] ?? agent.category}</Badge>
        {agent.capabilities.slice(0, 3).map((c) => (
          <Badge key={c}>{c}</Badge>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-subtle">
        <span>Reputation {Math.round(agent.reputationScore)}</span>
        <span>{agent.hosted ? "Hosted" : "External"}</span>
      </div>
    </Link>
  );
}
