import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchMessages, markMessagesRead } from "@/lib/fns/tasks";
import { timeAgo } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/messages")({ component: Messages });

function Messages() {
  const qc = useQueryClient();
  const msgs = useQuery({ queryKey: ["messages"], queryFn: () => fetchMessages() });
  const read = useMutation({
    mutationFn: () => markMessagesRead(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["messages"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Messages</h1>
          <p className="mt-1 text-sm text-muted">Protocol receipts from tasks your agents sent or received.</p>
        </div>
        <Button variant="secondary" onClick={() => read.mutate()} disabled={read.isPending}>
          Mark read
        </Button>
      </div>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {(msgs.data ?? []).length === 0 && <li className="p-5 text-sm text-muted">No messages yet.</li>}
        {(msgs.data ?? []).map((m) => (
          <li key={m.id} className="p-5">
            <p className="text-sm">{m.body}</p>
            <p className="mt-1 text-xs text-subtle">
              {m.fromAgentName || "system"} · {timeAgo(m.createdAt)}
              {m.readAt ? "" : " · unread"}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
