import { getSql } from "@/lib/db";
import { asJson } from "@/lib/json";
import { authenticateApiKey, corsPreflight, jsonError, jsonOk } from "./api-auth";
import { consumeRateLimit, limitForPlan, recordUsage } from "./rate-limit";
import { createAgent, deleteAgent, getAgent, heartbeat, listPublicAgents, listUserAgents, updateAgent, assertValidAgentInput } from "./agents";
import { assertActiveUser, ensureProfile, getPlan } from "./profiles";
import { getTask, inboxForAgent, listTasksForUser, sendTask, updateTaskStatus } from "./tasks";
import { log } from "./logging";
import { randomToken } from "./crypto";

function pathOf(request: Request): string {
  const url = new URL(request.url);
  return url.pathname.replace(/\/+$/, "") || "/";
}

function ipOf(request: Request): string {
  const vercel = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercel) return vercel;
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((h) => h.trim()).filter(Boolean);
    return hops[hops.length - 1] || "unknown";
  }
  return "unknown";
}

function requestIdOf(request: Request): string {
  return (
    request.headers.get("x-vercel-id") ||
    request.headers.get("x-request-id") ||
    randomToken(8)
  );
}

function attachRequestId(res: Response, requestId: string): Response {
  const headers = new Headers(res.headers);
  headers.set("x-request-id", requestId);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Invalid JSON");
  }
}

export async function handleV1(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return corsPreflight();
  const url = new URL(request.url);
  const path = pathOf(request);
  const started = Date.now();
  const requestId = requestIdOf(request);

  const done = (res: Response, extra?: Record<string, unknown>) => {
    log.api({
      path,
      method: request.method,
      status: res.status,
      ms: Date.now() - started,
      request_id: requestId,
      ...extra,
    });
    return attachRequestId(res, requestId);
  };

  try {
    if (path === "/api/v1" || path === "/api/v1/meta") {
      return done(
        jsonOk({
          name: "AgentNet Protocol",
          version: "1.0",
          protocol: "lattice/1",
          docs: "/docs",
        }),
      );
    }

    const sql = await getSql();
    const principal = await authenticateApiKey(sql, request.headers.get("authorization"));
    const limit = limitForPlan(principal?.profile.planId);
    const bucket = principal ? `key:${principal.keyId}` : `ip:${ipOf(request)}`;
    const rl = await consumeRateLimit(sql, bucket, principal ? limit : 30);
    if (!rl.ok) {
      return done(jsonError(429, "Rate limit exceeded", { retry_after_ms: rl.retryAfterMs }), {
        key_prefix: principal?.prefix,
      });
    }
    if (principal) {
      await recordUsage(sql, {
        userId: principal.userId,
        kind: "api_request",
        meta: { path, method: request.method },
      });
    }

    const requireAuth = () => {
      if (!principal) throw Object.assign(new Error("Unauthorized"), { status: 401 });
      return principal;
    };

    const requireActive = () => {
      const auth = requireAuth();
      assertActiveUser(auth.profile);
      return auth;
    };

    if (path === "/api/v1/search" && request.method === "GET") {
      const result = await listPublicAgents(sql, {
        q: url.searchParams.get("q") ?? undefined,
        category: url.searchParams.get("category") ?? undefined,
        capability: url.searchParams.get("capability") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
        minReputation: url.searchParams.get("min_reputation")
          ? Number(url.searchParams.get("min_reputation"))
          : undefined,
        limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 24,
        offset: url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : 0,
      });
      return done(jsonOk({ total: result.total, agents: result.agents.map(publicAgent) }));
    }

    if (path === "/api/v1/agents" && request.method === "GET") {
      if (url.searchParams.get("mine") === "1") {
        const auth = requireAuth();
        const mine = await listUserAgents(sql, auth.userId);
        return done(jsonOk({ agents: mine.map(publicAgent) }));
      }
      const result = await listPublicAgents(sql, {
        q: url.searchParams.get("q") ?? undefined,
        category: url.searchParams.get("category") ?? undefined,
        capability: url.searchParams.get("capability") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
        limit: 24,
        offset: 0,
      });
      return done(jsonOk({ total: result.total, agents: result.agents.map(publicAgent) }));
    }

    if (path === "/api/v1/agents" && request.method === "POST") {
      const auth = requireActive();
      const body = (await readJson(request)) as {
        name?: string;
        description?: string;
        category?: string;
        capabilities?: string[];
        endpoint?: string;
        auth_method?: string;
        website?: string;
        version?: string;
        hosted?: boolean;
        hosted_kind?: string;
      };
      if (!body.name) return done(jsonError(400, "name is required"));
      assertValidAgentInput({
        name: body.name,
        description: body.description || "",
        endpointUrl: body.endpoint,
      });
      const profile = await ensureProfile(sql, auth.userId);
      const plan = await getPlan(sql, profile.planId);
      const count = await sql.query<{ n: number }>(`select count(*)::int as n from agents where user_id = $1`, [
        auth.userId,
      ]);
      if ((count[0]?.n ?? 0) >= (plan?.agentLimit ?? 2)) {
        return done(jsonError(402, "Agent limit reached for your plan."));
      }
      const agent = await createAgent(sql, auth.userId, {
        name: body.name,
        description: body.description || "",
        category: body.category || "other",
        capabilities: body.capabilities || [],
        endpointUrl: body.endpoint,
        authMethod: body.auth_method,
        website: body.website,
        version: body.version,
        hosted: body.hosted,
        hostedKind: body.hosted_kind,
      });
      return done(jsonOk({ agent: publicAgent(agent) }, 201));
    }

    const agentMatch = path.match(/^\/api\/v1\/agents\/([^/]+)(?:\/(heartbeat))?$/);
    if (agentMatch) {
      const id = decodeURIComponent(agentMatch[1]);
      const sub = agentMatch[2];
      if (sub === "heartbeat" && request.method === "POST") {
        const auth = requireActive();
        await heartbeat(sql, id, auth.userId);
        return done(jsonOk({ ok: true, status: "online" }));
      }
      if (request.method === "GET") {
        const agent = await getAgent(sql, id);
        if (!agent) return done(jsonError(404, "Agent not found"));
        if (agent.visibility === "private" && principal?.userId !== agent.userId) {
          return done(jsonError(404, "Agent not found"));
        }
        return done(jsonOk({ agent: publicAgent(agent) }));
      }
      if (request.method === "PATCH") {
        const auth = requireActive();
        const body = (await readJson(request)) as Record<string, unknown>;
        const agent = await updateAgent(sql, auth.userId, id, {
          name: typeof body.name === "string" ? body.name : undefined,
          description: typeof body.description === "string" ? body.description : undefined,
          category: typeof body.category === "string" ? body.category : undefined,
          endpointUrl: typeof body.endpoint === "string" ? body.endpoint : undefined,
          website: typeof body.website === "string" ? body.website : undefined,
          version: typeof body.version === "string" ? body.version : undefined,
          status: typeof body.status === "string" ? body.status : undefined,
          visibility: typeof body.visibility === "string" ? body.visibility : undefined,
          capabilities: Array.isArray(body.capabilities) ? body.capabilities.map(String) : undefined,
        });
        return done(jsonOk({ agent: publicAgent(agent) }));
      }
      if (request.method === "DELETE") {
        const auth = requireActive();
        await deleteAgent(sql, auth.userId, id);
        return done(jsonOk({ ok: true }));
      }
    }

    if (path === "/api/v1/auth" && request.method === "POST") {
      const auth = requireAuth();
      return done(jsonOk({
        authenticated: true,
        user_id: auth.userId,
        key_prefix: auth.prefix,
        plan: auth.profile.planId,
      }));
    }

    if (path === "/api/v1/me" && request.method === "GET") {
      const auth = requireAuth();
      const plan = await getPlan(sql, auth.profile.planId);
      const agents = await listUserAgents(sql, auth.userId);
      return done(jsonOk({
        user_id: auth.userId,
        plan: auth.profile.planId,
        limits: { agents: plan?.agentLimit, tasks: plan?.taskLimit, rpm: limit },
        agents: agents.length,
      }));
    }

    if (path === "/api/v1/me/usage" && request.method === "GET") {
      const auth = requireAuth();
      const rows = await sql.query<{ kind: string; n: number }>(
        `select kind, coalesce(sum(units),0)::int as n from usage_events
         where user_id = $1 and created_at >= date_trunc('month', now())
         group by kind`,
        [auth.userId],
      );
      return done(jsonOk({ period: "month", usage: Object.fromEntries(rows.map((r) => [r.kind, r.n])) }));
    }

    if (path === "/api/v1/tasks" && request.method === "GET") {
      const auth = requireAuth();
      const agentId = url.searchParams.get("agent") || auth.agentId;
      const status = url.searchParams.get("status") ?? undefined;
      if (agentId) {
        const agent = await getAgent(sql, agentId);
        if (!agent || agent.userId !== auth.userId) return done(jsonError(404, "Agent not found"));
        const inbox = await inboxForAgent(sql, agentId, status ?? undefined);
        return done(jsonOk({ tasks: inbox }));
      }
      const tasks = await listTasksForUser(sql, auth.userId, { status: status ?? undefined });
      return done(jsonOk({ tasks }));
    }

    if (path === "/api/v1/tasks" && request.method === "POST") {
      const auth = requireActive();
      const body = (await readJson(request)) as {
        from?: string;
        to?: string;
        title?: string;
        input?: unknown;
      };
      if (!body.to) return done(jsonError(400, "to is required"));
      const fromId = body.from || auth.agentId;
      if (!fromId) return done(jsonError(400, "from is required (or bind the key to an agent)"));
      const from = await getAgent(sql, fromId);
      const to = await getAgent(sql, body.to);
      if (!from || !to) return done(jsonError(404, "Agent not found"));
      const plan = await getPlan(sql, auth.profile.planId);
      const task = await sendTask(sql, {
        userId: auth.userId,
        fromAgent: from,
        toAgent: to,
        title: body.title || "API task",
        input: asJson(body.input ?? {}),
        taskLimit: plan?.taskLimit ?? 50,
      });
      return done(jsonOk({ task, ack: true }, 202));
    }

    const taskMatch = path.match(/^\/api\/v1\/tasks\/([^/]+)(?:\/(result|accept|complete|fail|cancel))?$/);
    if (taskMatch) {
      const id = decodeURIComponent(taskMatch[1]);
      const sub = taskMatch[2];
      if (request.method === "GET" && !sub) {
        const auth = requireAuth();
        const task = await getTask(sql, id);
        if (!task) return done(jsonError(404, "Task not found"));
        const from = await getAgent(sql, task.fromAgentId);
        const to = await getAgent(sql, task.toAgentId);
        if (from?.userId !== auth.userId && to?.userId !== auth.userId) {
          return done(jsonError(404, "Task not found"));
        }
        return done(jsonOk({ task }));
      }
      if (request.method === "GET" && sub === "result") {
        const auth = requireAuth();
        const task = await getTask(sql, id);
        if (!task) return done(jsonError(404, "Task not found"));
        const from = await getAgent(sql, task.fromAgentId);
        const to = await getAgent(sql, task.toAgentId);
        if (from?.userId !== auth.userId && to?.userId !== auth.userId) {
          return done(jsonError(404, "Task not found"));
        }
        return done(jsonOk({ status: task.status, result: task.result, error: task.error }));
      }
      if (request.method === "POST" && sub) {
        const auth = requireActive();
        const task = await getTask(sql, id);
        if (!task) return done(jsonError(404, "Task not found"));
        const body = (await readJson(request).catch(() => ({}))) as {
          result?: unknown;
          error?: string;
          agent?: string;
        };
        const actorId =
          body.agent || auth.agentId || (sub === "cancel" ? task.fromAgentId : task.toAgentId);
        const actor = await getAgent(sql, actorId);
        if (!actor || actor.userId !== auth.userId) return done(jsonError(403, "Forbidden"));
        const statusMap = {
          accept: "accepted",
          complete: "completed",
          fail: "failed",
          cancel: "cancelled",
        } as const;
        const status = statusMap[sub as keyof typeof statusMap];
        if (!status) return done(jsonError(400, "Unknown action"));
        const updated = await updateTaskStatus(sql, {
          task,
          actorUserId: auth.userId,
          actorAgentId: actor.id,
          status,
          result: body.result === undefined ? undefined : asJson(body.result),
          error: body.error,
        });
        return done(jsonOk({ task: updated }));
      }
    }

    return done(jsonError(404, "Not found"));
  } catch (err) {
    const status =
      (err as { status?: number }).status ??
      (err instanceof Error && err.message === "Unauthorized" ? 401 : 400);
    const message = err instanceof Error ? err.message : "Request failed";
    return done(jsonError(status, message), { error: message });
  }
}

function publicAgent(agent: Awaited<ReturnType<typeof getAgent>>) {
  if (!agent) return null;
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    category: agent.category,
    capabilities: agent.capabilities,
    status: agent.status,
    version: agent.version,
    reputation: agent.reputationScore,
    visibility: agent.visibility,
    hosted: agent.hosted,
    website: agent.website,
    owner: agent.ownerName,
    heartbeat_at: agent.heartbeatAt,
  };
}
