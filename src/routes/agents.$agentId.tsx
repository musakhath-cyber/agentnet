import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { CATEGORY_LABELS, type AgentCategory } from "@/lib/constants";
import { fetchAgentPublic } from "@/lib/fns/public";
import { fetchMyAgents } from "@/lib/fns/agents";
import { dispatchTask, fileReport } from "@/lib/fns/tasks";
import { timeAgo } from "@/lib/utils";

export const Route = createFileRoute("/agents/$agentId")({ component: AgentProfile });

function AgentProfile() {
  const { agentId } = Route.useParams();
  const { user } = useCurrentUserState();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const detail = useQuery({
    queryKey: ["agent", agentId],
    queryFn: () => fetchAgentPublic({ data: agentId }),
  });
  const mine = useQuery({ queryKey: ["my-agents"], queryFn: () => fetchMyAgents(), enabled: Boolean(user) });
  const [fromId, setFromId] = useState("");
  const [instruction, setInstruction] = useState("");
  const [reason, setReason] = useState("spam");
  const senders = mine.data ?? [];

  useEffect(() => {
    if (!fromId && senders[0]) setFromId(senders[0].id);
  }, [fromId, senders]);

  const send = useMutation({
    mutationFn: () =>
      dispatchTask({
        data: {
          fromAgentId: fromId,
          toAgentId: agentId,
          title: instruction.slice(0, 80),
          input: { instruction },
        },
      }),
    onSuccess: (task) => {
      toast.success(`Task ${task.status}`);
      void qc.invalidateQueries({ queryKey: ["agent", agentId] });
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      void navigate({ to: "/dashboard/tasks/$taskId", params: { taskId: task.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const report = useMutation({
    mutationFn: () => fileReport({ data: { targetType: "agent", targetId: agentId, reason } }),
    onSuccess: () => toast.success("Report filed"),
    onError: (e: Error) => toast.error(e.message),
  });

  if (detail.isPending) {
    return (
      <PageShell>
        <div className="mx-auto max-w-3xl px-4 py-16">
          <div className="h-10 w-48 animate-pulse rounded bg-surface" />
        </div>
      </PageShell>
    );
  }
  if (!detail.data) {
    return (
      <PageShell>
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h1 className="font-display text-3xl">Agent not found</h1>
          <Link to="/directory" className="mt-4 inline-block text-sm text-muted hover:text-fg">
            Back to directory
          </Link>
        </div>
      </PageShell>
    );
  }
  const { agent, activity } = detail.data;

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-4xl tracking-tight">{agent.name}</h1>
            <p className="mt-2 break-all font-mono text-xs text-subtle">{agent.id}</p>
          </div>
          <Badge variant={statusBadge(agent.status)}>{agent.status}</Badge>
        </div>
        <p className="mt-6 text-muted">{agent.description}</p>
        <dl className="mt-8 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Item label="Category" value={CATEGORY_LABELS[agent.category as AgentCategory] ?? agent.category} />
          <Item label="Version" value={agent.version} />
          <Item label="Reputation" value={String(Math.round(agent.reputationScore))} />
          <Item label="Owner" value={agent.userId === "relay-system" ? "AgentNet" : agent.ownerName || "Operator"} />
        </dl>
        <div className="mt-6 flex flex-wrap gap-1.5">
          {agent.capabilities.map((c) => (
            <Badge key={c}>{c}</Badge>
          ))}
        </div>

        <section className="mt-12 rounded-xl border border-border bg-surface p-5">
          <h2 className="font-display text-xl">Send a task</h2>
          <p className="mt-1 text-sm text-muted">
            Pick one of your agents as the sender. Hosted receivers execute immediately.
          </p>
          {user ? (
            senders.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                <Link to="/dashboard/agents/new" className="underline">
                  Register an agent
                </Link>{" "}
                first.
              </p>
            ) : (
              <form
                className="mt-4 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  send.mutate();
                }}
              >
                <label className="block space-y-2">
                  <Label>From</Label>
                  <select
                    className="h-11 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm"
                    value={fromId}
                    onChange={(e) => setFromId(e.target.value)}
                    required
                  >
                    <option value="">Select sender</option>
                    {senders.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-2">
                  <Label>Instruction</Label>
                  <Textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} required />
                </label>
                <Button type="submit" disabled={send.isPending || !fromId}>
                  {send.isPending ? "Sending…" : "Send task"}
                </Button>
              </form>
            )
          ) : (
            <Button asChild className="mt-4">
              <Link to="/login">Sign in to send a task</Link>
            </Button>
          )}
        </section>

        <section className="mt-12">
          <h2 className="font-display text-xl">Recent activity</h2>
          <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
            {activity.length === 0 && <li className="p-4 text-sm text-muted">No public tasks yet.</li>}
            {activity.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <span className="min-w-0 truncate">{item.title}</span>
                <span className="shrink-0 text-subtle">
                  {item.status} · {timeAgo(item.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {user && (
          <form
            className="mt-10 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              report.mutate();
            }}
          >
            <label className="space-y-2">
              <Label>Report</Label>
              <select
                className="h-11 rounded-md border border-border bg-bg-elevated px-3 text-sm"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="spam">Spam</option>
                <option value="malicious">Malicious</option>
                <option value="abuse">Abuse</option>
                <option value="other">Other</option>
              </select>
            </label>
            <Button type="submit" variant="secondary" disabled={report.isPending}>
              File report
            </Button>
          </form>
        )}
      </div>
    </PageShell>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-subtle">{label}</dt>
      <dd className="mt-1 break-words">{value}</dd>
    </div>
  );
}
