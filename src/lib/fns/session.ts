import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { newApiKeySecret } from "@/lib/server/crypto";
import { ensureProfile, getPlan, listPlans, assertActiveUser } from "@/lib/server/profiles";
import { changePlan } from "@/lib/server/billing";
import { newId } from "@/lib/ids";
import { iso } from "@/lib/server/serialize";
import { sanitizeText } from "@/lib/server/ssrf";
import { audit } from "@/lib/server/audit";

export const fetchMe = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    const plan = await getPlan(sql, profile.planId);
    const [agents, active, sent, completed, failed, api] = await Promise.all([
      sql.query<{ n: number }>(`select count(*)::int as n from agents where user_id = $1`, [context.userId]),
      sql.query<{ n: number }>(`select count(*)::int as n from agents where user_id = $1 and status = 'online'`, [context.userId]),
      sql.query<{ n: number }>(`select count(*)::int as n from tasks where user_id = $1`, [context.userId]),
      sql.query<{ n: number }>(`select count(*)::int as n from tasks where user_id = $1 and status = 'completed'`, [context.userId]),
      sql.query<{ n: number }>(`select count(*)::int as n from tasks where user_id = $1 and status = 'failed'`, [context.userId]),
      sql.query<{ n: number }>(
        `select coalesce(sum(units),0)::int as n from usage_events where user_id = $1 and kind = 'api_request' and created_at >= date_trunc('month', now())`,
        [context.userId],
      ),
    ]);
    return {
      profile,
      plan,
      stats: {
        agents: agents[0]?.n ?? 0,
        activeAgents: active[0]?.n ?? 0,
        tasksSent: sent[0]?.n ?? 0,
        tasksCompleted: completed[0]?.n ?? 0,
        tasksFailed: failed[0]?.n ?? 0,
        apiRequests: api[0]?.n ?? 0,
        planId: profile.planId,
        agentLimit: plan?.agentLimit ?? 2,
        taskLimit: plan?.taskLimit ?? 50,
      },
    };
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { displayName?: string; company?: string; website?: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    assertActiveUser(profile);
    await sql.query(
      `update profiles set display_name = coalesce($2, display_name), company = $3, website = $4, updated_at = now()
       where user_id = $1`,
      [
        context.userId,
        data.displayName ? sanitizeText(data.displayName, 80) : null,
        data.company ? sanitizeText(data.company, 80) : null,
        data.website ? sanitizeText(data.website, 300) : null,
      ],
    );
    return ensureProfile(sql, context.userId);
  });

export const fetchKeys = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql.query<{
      id: string;
      name: string;
      prefix: string;
      agent_id: string | null;
      last_used_at: unknown;
      revoked_at: unknown;
      created_at: unknown;
    }>(
      `select id, name, prefix, agent_id, last_used_at, revoked_at, created_at
       from api_keys where user_id = $1 order by created_at desc`,
      [context.userId],
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      prefix: r.prefix,
      agentId: r.agent_id,
      lastUsedAt: iso(r.last_used_at),
      revokedAt: iso(r.revoked_at),
      createdAt: iso(r.created_at) ?? "",
    }));
  });

export const createKey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name: string; agentId?: string | null }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    assertActiveUser(profile);
    let agentId = data.agentId ?? null;
    if (agentId) {
      const owned = await sql.query<{ id: string }>(
        `select id from agents where id = $1 and user_id = $2`,
        [agentId, context.userId],
      );
      if (!owned[0]) throw new Error("You can only bind a key to an agent you own.");
    }
    const secret = newApiKeySecret();
    const id = newId("key");
    await sql.query(
      `insert into api_keys (id, user_id, agent_id, name, prefix, key_hash)
       values ($1,$2,$3,$4,$5,$6)`,
      [id, context.userId, agentId, sanitizeText(data.name || "Default", 60), secret.prefix, secret.hash],
    );
    await audit(sql, { userId: context.userId, action: "apikey.create", resourceType: "api_key", resourceId: id });
    return { id, prefix: secret.prefix, plaintext: secret.plaintext };
  });

export const revokeKey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    assertActiveUser(profile);
    await sql.query(
      `update api_keys set revoked_at = now() where id = $1 and user_id = $2 and revoked_at is null`,
      [id, context.userId],
    );
    await audit(sql, { userId: context.userId, action: "apikey.revoke", resourceType: "api_key", resourceId: id });
    return { ok: true };
  });

export const fetchBilling = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    const plans = await listPlans(sql);
    const payments = await sql.query<{
      id: string;
      amount_cents: number;
      currency: string;
      status: string;
      created_at: unknown;
    }>(
      `select id, amount_cents, currency, status, created_at from payments where user_id = $1 order by created_at desc limit 12`,
      [context.userId],
    );
    const agents = await sql.query<{ n: number }>(`select count(*)::int as n from agents where user_id = $1 and status <> 'suspended'`, [
      context.userId,
    ]);
    return {
      profile,
      plans,
      agentCount: agents[0]?.n ?? 0,
      paystackReady: Boolean(process.env.PAYSTACK_SECRET_KEY?.trim()),
      payments: payments.map((p) => ({
        id: p.id,
        amountCents: p.amount_cents,
        currency: p.currency,
        status: p.status,
        createdAt: iso(p.created_at) ?? "",
      })),
    };
  });

export const selectPlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((planId: string) => planId)
  .handler(async ({ context, data: planId }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    assertActiveUser(profile);
    return changePlan(sql, context.userId, planId);
  });

export const fetchUsage = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql.query<{ day: unknown; kind: string; n: number }>(
      `select date_trunc('day', created_at) as day, kind, sum(units)::int as n
       from usage_events
       where user_id = $1 and created_at >= now() - interval '30 days'
       group by 1, 2
       order by 1 asc`,
      [context.userId],
    );
    return rows.map((r) => ({
      day: iso(r.day)?.slice(0, 10) ?? "",
      kind: r.kind,
      n: r.n,
    }));
  });
