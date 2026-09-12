import type { Sql } from "@/lib/db";
import { CATEGORIES, SYSTEM_USER_ID, type AgentCategory } from "@/lib/constants";
import { agentId, newId } from "@/lib/ids";
import type { Agent, AgentInput } from "@/lib/types";
import { audit } from "./audit";
import { mapAgent, type AgentRow } from "./rows";
import { looksLikePromptInjection, sanitizeText, assertSafeEndpoint } from "./ssrf";

export type { AgentInput };

const AGENT_SELECT = `
  a.id, a.user_id, a.name, a.slug, a.description, a.category, a.endpoint_url,
  a.auth_method, a.website, a.version, a.status, a.visibility, a.reputation_score,
  a.tasks_completed, a.tasks_failed, a.heartbeat_at, a.last_seen_at, a.hosted,
  a.hosted_kind, a.created_at, a.updated_at,
  p.display_name as owner_name,
  coalesce((
    select json_agg(c.capability order by c.capability)
    from agent_capabilities c where c.agent_id = a.id
  ), '[]'::json) as capabilities
`;

export function assertValidAgentInput(input: Pick<AgentInput, "name" | "description" | "endpointUrl">): void {
  const name = sanitizeText(input.name || "", 80);
  if (name.length < 2) throw new Error("Agent name is required.");
  if (looksLikePromptInjection(name) || looksLikePromptInjection(input.description || "")) {
    throw new Error("Agent registration rejected.");
  }
  const endpoint = input.endpointUrl?.trim();
  if (endpoint) {
    const safe = assertSafeEndpoint(endpoint);
    if (!safe.ok) throw new Error(safe.error);
  }
}

function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return s || "agent";
}

export async function listPublicAgents(
  sql: Sql,
  filters: {
    q?: string;
    category?: string;
    status?: string;
    capability?: string;
    minReputation?: number;
    limit?: number;
    offset?: number;
  },
): Promise<{ agents: Agent[]; total: number }> {
  const where: string[] = [`a.visibility = 'public'`, `a.status <> 'suspended'`];
  const params: unknown[] = [];
  const add = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (filters.q) {
    const q = `%${filters.q.toLowerCase()}%`;
    const p = add(q);
    where.push(`(lower(a.name) like ${p} or lower(a.description) like ${p} or a.id like ${p})`);
  }
  if (filters.category && CATEGORIES.includes(filters.category as AgentCategory)) {
    where.push(`a.category = ${add(filters.category)}`);
  }
  if (filters.status === "online" || filters.status === "offline") {
    where.push(`a.status = ${add(filters.status)}`);
  }
  if (filters.capability) {
    where.push(
      `exists (select 1 from agent_capabilities c where c.agent_id = a.id and lower(c.capability) like ${add(`%${filters.capability.toLowerCase()}%`)})`,
    );
  }
  if (filters.minReputation && filters.minReputation > 0) {
    where.push(`a.reputation_score >= ${add(filters.minReputation)}`);
  }

  const limit = Math.min(Math.max(filters.limit ?? 24, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);
  const whereSql = where.join(" and ");

  const count = await sql.query<{ n: number }>(
    `select count(*)::int as n from agents a where ${whereSql}`,
    params,
  );
  const rows = await sql.query<AgentRow>(
    `select ${AGENT_SELECT}
     from agents a
     left join profiles p on p.user_id = a.user_id
     where ${whereSql}
     order by a.reputation_score desc, a.created_at desc
     limit ${add(limit)} offset ${add(offset)}`,
    params,
  );
  return { agents: rows.map((r) => mapAgent(r)), total: count[0]?.n ?? 0 };
}

export async function getAgent(sql: Sql, id: string): Promise<Agent | null> {
  const rows = await sql.query<AgentRow>(
    `select ${AGENT_SELECT}
     from agents a
     left join profiles p on p.user_id = a.user_id
     where a.id = $1`,
    [id],
  );
  return rows[0] ? mapAgent(rows[0]) : null;
}

export async function listUserAgents(sql: Sql, userId: string): Promise<Agent[]> {
  const rows = await sql.query<AgentRow>(
    `select ${AGENT_SELECT}
     from agents a
     left join profiles p on p.user_id = a.user_id
     where a.user_id = $1
     order by a.created_at desc`,
    [userId],
  );
  return rows.map((r) => mapAgent(r));
}

export async function createAgent(
  sql: Sql,
  userId: string,
  input: AgentInput,
): Promise<Agent> {
  assertValidAgentInput(input);
  const name = sanitizeText(input.name, 80);
  const description = sanitizeText(input.description, 2000);
  const category = CATEGORIES.includes(input.category as AgentCategory)
    ? input.category
    : "other";
  let endpoint: string | null = input.endpointUrl?.trim() || null;
  if (endpoint) {
    const safe = assertSafeEndpoint(endpoint);
    if (!safe.ok) throw new Error(safe.error);
    endpoint = safe.url;
  }
  const hosted = input.hosted === true || (input.hosted !== false && !endpoint);
  const hostedKind = hosted ? (input.hostedKind || "echo") : null;
  const id = agentId();
  let slug = slugify(name);
  const clash = await sql.query<{ n: number }>(
    `select count(*)::int as n from agents where user_id = $1 and slug = $2`,
    [userId, slug],
  );
  if ((clash[0]?.n ?? 0) > 0) slug = `${slug}-${id.slice(-4).toLowerCase()}`;

  await sql.query(
    `insert into agents (
      id, user_id, name, slug, description, category, endpoint_url, auth_method,
      website, version, status, visibility, hosted, hosted_kind
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      id,
      userId,
      name,
      slug,
      description,
      category,
      endpoint,
      input.authMethod && ["none", "bearer", "api_key", "hmac"].includes(input.authMethod)
        ? input.authMethod
        : "none",
      input.website ? sanitizeText(input.website, 300) : null,
      sanitizeText(input.version || "1.0.0", 32),
      hosted ? "online" : (input.status === "online" ? "online" : "offline"),
      input.visibility === "private" || input.visibility === "network" ? input.visibility : "public",
      hosted,
      hostedKind,
    ],
  );

  const caps = [...new Set(input.capabilities.map((c) => sanitizeText(c, 48)).filter(Boolean))].slice(0, 12);
  for (const cap of caps) {
    await sql.query(
      `insert into agent_capabilities (id, agent_id, capability) values ($1,$2,$3)`,
      [newId("cap"), id, cap],
    );
  }
  if (endpoint) {
    await sql.query(
      `insert into agent_endpoints (id, agent_id, url, auth_method, is_primary)
       values ($1,$2,$3,$4,true)`,
      [newId("ep"), id, endpoint, input.authMethod || "none"],
    );
  }
  await audit(sql, {
    userId,
    action: "agent.create",
    resourceType: "agent",
    resourceId: id,
    meta: { name, category },
  });
  const created = await getAgent(sql, id);
  if (!created) throw new Error("Failed to load agent");
  return created;
}

export async function updateAgent(
  sql: Sql,
  userId: string,
  id: string,
  input: Partial<AgentInput>,
): Promise<Agent> {
  const existing = await sql.query<{ id: string; user_id: string; status: string }>(
    `select id, user_id, status from agents where id = $1`,
    [id],
  );
  if (!existing[0] || existing[0].user_id !== userId) throw new Error("Agent not found.");
  if (existing[0].status === "suspended") throw new Error("Suspended agents cannot be edited.");
  if (input.name && looksLikePromptInjection(input.name)) throw new Error("Agent update rejected.");
  if (input.description && looksLikePromptInjection(input.description)) throw new Error("Agent update rejected.");

  const fields: string[] = [];
  const params: unknown[] = [];
  const set = (col: string, value: unknown) => {
    params.push(value);
    fields.push(`${col} = $${params.length}`);
  };
  if (input.name) set("name", sanitizeText(input.name, 80));
  if (input.description != null) set("description", sanitizeText(input.description, 2000));
  if (input.category && CATEGORIES.includes(input.category as AgentCategory)) set("category", input.category);
  if (input.endpointUrl !== undefined) {
    if (input.endpointUrl) {
      const safe = assertSafeEndpoint(input.endpointUrl);
      if (!safe.ok) throw new Error(safe.error);
      set("endpoint_url", safe.url);
    } else {
      set("endpoint_url", null);
    }
  }
  if (input.authMethod && ["none", "bearer", "api_key", "hmac"].includes(input.authMethod)) {
    set("auth_method", input.authMethod);
  }
  if (input.website !== undefined) set("website", input.website ? sanitizeText(input.website, 300) : null);
  if (input.version) set("version", sanitizeText(input.version, 32));
  if (input.visibility && ["public", "private", "network"].includes(input.visibility)) {
    set("visibility", input.visibility);
  }
  if (input.status === "online" || input.status === "offline") set("status", input.status);
  if (input.hosted != null) set("hosted", input.hosted);
  if (input.hostedKind !== undefined) set("hosted_kind", input.hostedKind);
  set("updated_at", new Date().toISOString());
  params.push(id, userId);
  await sql.query(
    `update agents set ${fields.join(", ")} where id = $${params.length - 1} and user_id = $${params.length}`,
    params,
  );

  if (input.capabilities) {
    await sql.query(`delete from agent_capabilities where agent_id = $1`, [id]);
    const caps = [...new Set(input.capabilities.map((c) => sanitizeText(c, 48)).filter(Boolean))].slice(0, 12);
    for (const cap of caps) {
      await sql.query(
        `insert into agent_capabilities (id, agent_id, capability) values ($1,$2,$3)`,
        [newId("cap"), id, cap],
      );
    }
  }
  await audit(sql, { userId, action: "agent.update", resourceType: "agent", resourceId: id });
  const updated = await getAgent(sql, id);
  if (!updated) throw new Error("Failed to load agent");
  return updated;
}

export async function deleteAgent(sql: Sql, userId: string, id: string): Promise<void> {
  const rows = await sql.query<{ id: string }>(
    `select id from agents where id = $1 and user_id = $2`,
    [id, userId],
  );
  if (!rows[0]) throw new Error("Agent not found.");
  if (userId === SYSTEM_USER_ID) throw new Error("Platform agents cannot be deleted.");
  await purgeAgent(sql, id);
  await audit(sql, { userId, action: "agent.delete", resourceType: "agent", resourceId: id });
}

/** Remove an agent and the tasks that reference it (FK otherwise blocks delete). */
export async function purgeAgent(sql: Sql, id: string): Promise<void> {
  await sql.query(
    `delete from task_results where task_id in (
       select id from tasks where from_agent_id = $1 or to_agent_id = $1
     )`,
    [id],
  );
  await sql.query(`delete from tasks where from_agent_id = $1 or to_agent_id = $1`, [id]);
  await sql.query(`delete from agents where id = $1`, [id]);
}

export async function heartbeat(sql: Sql, agentIdValue: string, ownerId: string): Promise<void> {
  const existing = await sql.query<{ id: string; status: string }>(
    `select id, status from agents where id = $1 and user_id = $2`,
    [agentIdValue, ownerId],
  );
  if (!existing[0]) throw new Error("Agent not found.");
  if (existing[0].status === "suspended") throw new Error("Suspended agents cannot send a heartbeat.");
  await sql.query(
    `update agents set status = 'online', heartbeat_at = now(), last_seen_at = now(), updated_at = now()
     where id = $1 and user_id = $2 and status <> 'suspended'`,
    [agentIdValue, ownerId],
  );
}

export async function recentActivity(sql: Sql, agentIdValue: string, limit = 8) {
  const rows = await sql.query<{
    id: string;
    title: string;
    status: string;
    created_at: unknown;
  }>(
    `select id, title, status, created_at from tasks
     where from_agent_id = $1 or to_agent_id = $1
     order by created_at desc limit $2`,
    [agentIdValue, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }));
}
