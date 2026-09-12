import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { ensureProfile, listPlans } from "@/lib/server/profiles";
import { audit } from "@/lib/server/audit";
import { iso, jsonValue, num } from "@/lib/server/serialize";
import { getAgent, purgeAgent } from "@/lib/server/agents";
import { SYSTEM_USER_ID } from "@/lib/constants";
import type { Json } from "@/lib/json";

async function requireAdmin(userId: string) {
  const sql = await getSql();
  const profile = await ensureProfile(sql, userId);
  if (profile.role !== "admin") {
    const err = new Error("Forbidden");
    (err as Error & { status: number }).status = 403;
    throw err;
  }
  return { sql, profile };
}

export const fetchAdminOverview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { sql } = await requireAdmin(context.userId);
    const q = async (text: string) => {
      const rows = await sql.query<{ n: number }>(text);
      return rows[0]?.n ?? 0;
    };
    const [users, agents, active, tasks, api, errors, openReports] = await Promise.all([
      q(`select count(*)::int as n from profiles`),
      q(`select count(*)::int as n from agents`),
      q(`select count(*)::int as n from agents where status = 'online'`),
      q(`select count(*)::int as n from tasks`),
      q(`select coalesce(sum(units),0)::int as n from usage_events where kind = 'api_request'`),
      q(`select count(*)::int as n from tasks where status = 'failed'`),
      q(`select count(*)::int as n from reports where status = 'open'`),
    ]);
    const revenue = await sql.query<{ n: number }>(
      `select coalesce(sum(amount_cents),0)::int as n from payments where status = 'paid'`,
    );
    const plans = await sql.query<{ plan_id: string; n: number }>(
      `select plan_id, count(*)::int as n from profiles group by plan_id`,
    );
    const health = await sql.query(`select 1 as ok`);
    return {
      users,
      agents,
      active,
      tasks,
      api,
      errors,
      openReports,
      revenueCents: revenue[0]?.n ?? 0,
      subscriptions: plans,
      db: health.length > 0,
    };
  });

export const fetchAdminUsers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { sql } = await requireAdmin(context.userId);
    const rows = await sql.query<{
      user_id: string;
      display_name: string | null;
      role: string;
      status: string;
      plan_id: string;
      created_at: unknown;
      agents: number;
    }>(
      `select p.user_id, p.display_name, p.role, p.status, p.plan_id, p.created_at,
              (select count(*)::int from agents a where a.user_id = p.user_id) as agents
       from profiles p order by p.created_at desc limit 200`,
    );
    return rows.map((r) => ({
      userId: r.user_id,
      displayName: r.display_name,
      role: r.role,
      status: r.status,
      planId: r.plan_id,
      createdAt: iso(r.created_at) ?? "",
      agents: num(r.agents),
    }));
  });

export const fetchAdminAgents = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { sql } = await requireAdmin(context.userId);
    const all = await sql.query<{
      id: string;
      name: string;
      user_id: string;
      status: string;
      category: string;
      reputation_score: unknown;
      created_at: unknown;
    }>(
      `select id, name, user_id, status, category, reputation_score, created_at from agents order by created_at desc limit 200`,
    );
    return all.map((a) => ({
      id: a.id,
      name: a.name,
      userId: a.user_id,
      status: a.status,
      category: a.category,
      reputation: num(a.reputation_score),
      createdAt: iso(a.created_at) ?? "",
    }));
  });

export const fetchAdminTasks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { sql } = await requireAdmin(context.userId);
    const rows = await sql.query<{
      id: string;
      title: string;
      status: string;
      created_at: unknown;
      from_agent_id: string;
      to_agent_id: string;
    }>(`select id, title, status, created_at, from_agent_id, to_agent_id from tasks order by created_at desc limit 200`);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      createdAt: iso(r.created_at) ?? "",
      fromAgentId: r.from_agent_id,
      toAgentId: r.to_agent_id,
    }));
  });

export const fetchAdminLogs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { sql } = await requireAdmin(context.userId);
    const rows = await sql.query<{
      id: string;
      user_id: string | null;
      actor_type: string;
      action: string;
      resource_type: string | null;
      resource_id: string | null;
      created_at: unknown;
    }>(
      `select id, user_id, actor_type, action, resource_type, resource_id, created_at
       from audit_logs order by created_at desc limit 200`,
    );
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      actorType: r.actor_type,
      action: r.action,
      resourceType: r.resource_type,
      resourceId: r.resource_id,
      createdAt: iso(r.created_at) ?? "",
    }));
  });

export const fetchAdminReports = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { sql } = await requireAdmin(context.userId);
    const rows = await sql.query<{
      id: string;
      reporter_user_id: string;
      target_type: string;
      target_id: string;
      reason: string;
      details: string | null;
      status: string;
      created_at: unknown;
    }>(`select * from reports order by created_at desc limit 100`);
    return rows.map((r) => ({
      id: r.id,
      reporterUserId: r.reporter_user_id,
      targetType: r.target_type,
      targetId: r.target_id,
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: iso(r.created_at) ?? "",
    }));
  });

export const adminAct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      kind:
        | "suspend_user"
        | "unsuspend_user"
        | "suspend_agent"
        | "unsuspend_agent"
        | "remove_agent"
        | "resolve_report"
        | "dismiss_report"
        | "update_plan"
        | "update_setting";
      id?: string;
      planId?: string;
      patch?: { price_cents?: number; agent_limit?: number; task_limit?: number; per_agent_cents?: number };
      key?: string;
      value?: Json;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const { sql } = await requireAdmin(context.userId);
    switch (data.kind) {
      case "suspend_user":
        if (data.id === context.userId) throw new Error("You cannot suspend your own account.");
        await sql.query(`update profiles set status = 'suspended', updated_at = now() where user_id = $1`, [data.id]);
        break;
      case "unsuspend_user":
        await sql.query(`update profiles set status = 'active', updated_at = now() where user_id = $1`, [data.id]);
        break;
      case "suspend_agent":
        await sql.query(`update agents set status = 'suspended', updated_at = now() where id = $1`, [data.id]);
        break;
      case "unsuspend_agent": {
        const agent = data.id ? await getAgent(sql, data.id) : null;
        const next = agent?.hosted ? "online" : "offline";
        await sql.query(`update agents set status = $2, updated_at = now() where id = $1`, [data.id, next]);
        break;
      }
      case "remove_agent": {
        if (!data.id) throw new Error("Agent id is required.");
        const agent = await getAgent(sql, data.id);
        if (!agent) throw new Error("Agent not found.");
        if (agent.userId === SYSTEM_USER_ID) {
          throw new Error("Platform catalog agents cannot be removed. Suspend them instead.");
        }
        await purgeAgent(sql, data.id);
        break;
      }
      case "resolve_report":
        await sql.query(`update reports set status = 'actioned' where id = $1`, [data.id]);
        break;
      case "dismiss_report":
        await sql.query(`update reports set status = 'dismissed' where id = $1`, [data.id]);
        break;
      case "update_plan":
        if (data.planId && data.patch) {
          if (typeof data.patch.price_cents === "number") {
            await sql.query(`update plans set price_cents = $2, updated_at = now() where id = $1`, [
              data.planId,
              data.patch.price_cents,
            ]);
          }
          if (typeof data.patch.agent_limit === "number") {
            await sql.query(`update plans set agent_limit = $2, updated_at = now() where id = $1`, [
              data.planId,
              data.patch.agent_limit,
            ]);
          }
          if (typeof data.patch.task_limit === "number") {
            await sql.query(`update plans set task_limit = $2, updated_at = now() where id = $1`, [
              data.planId,
              data.patch.task_limit,
            ]);
          }
          if (typeof data.patch.per_agent_cents === "number") {
            await sql.query(`update plans set per_agent_cents = $2, updated_at = now() where id = $1`, [
              data.planId,
              data.patch.per_agent_cents,
            ]);
          }
        }
        break;
      case "update_setting":
        if (data.key) {
          await sql.query(
            `insert into platform_settings (key, value, updated_at) values ($1, $2::jsonb, now())
             on conflict (key) do update set value = $2::jsonb, updated_at = now()`,
            [data.key, JSON.stringify(data.value ?? null)],
          );
        }
        break;
      default:
        break;
    }
    await audit(sql, {
      userId: context.userId,
      actorType: "admin",
      action: `admin.${data.kind}`,
      resourceId: data.id,
      meta: { kind: data.kind, id: data.id ?? null, planId: data.planId ?? null },
    });
    return { ok: true };
  });

export const fetchAdminSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { sql } = await requireAdmin(context.userId);
    const plans = await listPlans(sql);
    const settings = await sql.query<{ key: string; value: unknown }>(`select key, value from platform_settings`);
    const map: Record<string, Json> = {};
    for (const s of settings) map[s.key] = jsonValue(s.value);
    return { plans, settings: map };
  });
