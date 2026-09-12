import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { listPublicAgents, getAgent, recentActivity } from "@/lib/server/agents";
import { listPlans } from "@/lib/server/profiles";
import { iso, num } from "@/lib/server/serialize";

export const fetchPlans = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  return listPlans(sql);
});

export const fetchDirectory = createServerFn({ method: "GET" })
  .validator(
    (input: {
      q?: string;
      category?: string;
      status?: string;
      capability?: string;
      minReputation?: number;
      offset?: number;
      limit?: number;
    }) => input,
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    return listPublicAgents(sql, data);
  });

export const fetchAgentPublic = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const sql = await getSql();
    const agent = await getAgent(sql, id);
    if (!agent || agent.visibility === "private") return null;
    const activity = await recentActivity(sql, id, 10);
    return { agent, activity };
  });

export const fetchHomeStats = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const [agents, online, tasks, completed] = await Promise.all([
    sql.query<{ n: number }>(`select count(*)::int as n from agents where visibility = 'public' and status <> 'suspended'`),
    sql.query<{ n: number }>(`select count(*)::int as n from agents where status = 'online' and visibility = 'public'`),
    sql.query<{ n: number }>(`select count(*)::int as n from tasks`),
    sql.query<{ n: number }>(`select count(*)::int as n from tasks where status = 'completed'`),
  ]);
  const recent = await sql.query<{ id: string; title: string; status: string; created_at: unknown; to_name: string }>(
    `select t.id, t.title, t.status, t.created_at, a.name as to_name
     from tasks t join agents a on a.id = t.to_agent_id
     where a.visibility = 'public'
     order by t.created_at desc limit 6`,
  );
  return {
    agents: agents[0]?.n ?? 0,
    online: online[0]?.n ?? 0,
    tasks: tasks[0]?.n ?? 0,
    completed: completed[0]?.n ?? 0,
    recent: recent.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      toName: r.to_name,
      createdAt: iso(r.created_at) ?? "",
    })),
  };
});

export const fetchHealth = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const started = Date.now();
  await sql.query(`select 1 as ok`);
  const pending = await sql.query<{ n: number }>(`select count(*)::int as n from tasks where status in ('pending','accepted','processing')`);
  return {
    ok: true,
    db: true,
    latencyMs: Date.now() - started,
    pendingTasks: num(pending[0]?.n),
    ts: new Date().toISOString(),
  };
});
