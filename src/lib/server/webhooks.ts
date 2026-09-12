import type { Json } from "@/lib/json";
import { hmacSha256 } from "./crypto";
import { log } from "./logging";
import { envelope } from "./protocol";
import { assertSafeEndpoint } from "./ssrf";

export async function deliverTaskWebhook(opts: {
  url: string;
  secret?: string | null;
  task: {
    id: string;
    from: string;
    to: string;
    title: string;
    input: Json;
    status: string;
    created_at: string;
  };
}): Promise<{ delivered: boolean; status?: number; error?: string }> {
  const safe = assertSafeEndpoint(opts.url);
  if (!safe.ok) return { delivered: false, error: safe.error };

  const body = envelope("task.created", opts.task);
  const payload = JSON.stringify(body);
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = opts.secret ? hmacSha256(opts.secret, `${ts}.${payload}`) : "";

  try {
    const res = await fetch(safe.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "AgentNet-Protocol/1.0",
        "x-relay-timestamp": ts,
        "x-relay-signature": sig ? `sha256=${sig}` : "",
        "x-relay-task-id": opts.task.id,
      },
      body: payload,
      signal: AbortSignal.timeout(5000),
    });
    log.info("webhook.delivered", { url: safe.url, status: res.status, taskId: opts.task.id });
    return { delivered: res.ok || res.status === 202, status: res.status };
  } catch (err) {
    log.warn("webhook.failed", {
      url: safe.url,
      taskId: opts.task.id,
      error: err instanceof Error ? err.message : "failed",
    });
    return { delivered: false, error: err instanceof Error ? err.message : "delivery failed" };
  }
}
