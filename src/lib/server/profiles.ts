import type { Sql } from "@/lib/db";
import { newId } from "@/lib/ids";
import type { Plan, Profile } from "@/lib/types";
import { mapPlan, mapProfile } from "./rows";

export async function ensureProfile(
  sql: Sql,
  userId: string,
  seed?: { displayName?: string | null; email?: string | null },
): Promise<Profile> {
  const existing = await sql.query<{
    user_id: string;
    display_name: string | null;
    company: string | null;
    website: string | null;
    role: string;
    status: string;
    plan_id: string;
    created_at: unknown;
  }>(
    `select user_id, display_name, company, website, role, status, plan_id, created_at
     from profiles where user_id = $1`,
    [userId],
  );
  if (existing[0]) {
    if (!existing[0].display_name) {
      const identity = await sql.query<{ name: string | null; email: string | null }>(
        `select name, email from "user" where id = $1`,
        [userId],
      );
      const fallback = identity[0]?.name || identity[0]?.email || null;
      if (fallback) {
        await sql.query(`update profiles set display_name = $2, updated_at = now() where user_id = $1`, [
          userId,
          fallback,
        ]);
        existing[0].display_name = fallback;
      }
    }
    return mapProfile(existing[0]);
  }

  const adminCount = await sql.query<{ n: number }>(`select count(*)::int as n from profiles where role = 'admin'`);
  const role = (adminCount[0]?.n ?? 0) === 0 ? "admin" : "user";

  let display = seed?.displayName ?? seed?.email ?? null;
  if (!display) {
    const identity = await sql.query<{ name: string | null; email: string | null }>(
      `select name, email from "user" where id = $1`,
      [userId],
    );
    display = identity[0]?.name || identity[0]?.email || null;
  }
  await sql.query(
    `insert into profiles (user_id, display_name, role, plan_id)
     values ($1, $2, $3, 'free')
     on conflict (user_id) do nothing`,
    [userId, display, role],
  );

  const subs = await sql.query<{ id: string }>(
    `select id from subscriptions where user_id = $1 and status = 'active' limit 1`,
    [userId],
  );
  if (!subs[0]) {
    await sql.query(
      `insert into subscriptions (id, user_id, plan_id, status, provider, current_period_start, current_period_end)
       values ($1, $2, 'free', 'active', 'manual', now(), now() + interval '30 days')`,
      [newId("sub"), userId],
    );
  }

  const created = await sql.query<{
    user_id: string;
    display_name: string | null;
    company: string | null;
    website: string | null;
    role: string;
    status: string;
    plan_id: string;
    created_at: unknown;
  }>(
    `select user_id, display_name, company, website, role, status, plan_id, created_at
     from profiles where user_id = $1`,
    [userId],
  );
  if (!created[0]) throw new Error("Failed to create profile");
  return mapProfile(created[0]);
}

export async function getPlan(sql: Sql, planId: string): Promise<Plan | null> {
  const rows = await sql.query<{
    id: string;
    name: string;
    description: string;
    price_cents: unknown;
    currency: string;
    agent_limit: unknown;
    task_limit: unknown;
    api_enabled: unknown;
    private_networks: unknown;
    team_management: unknown;
    analytics_level: string;
    per_agent_cents: unknown;
    features: unknown;
    is_active: unknown;
    sort_order: unknown;
  }>(`select * from plans where id = $1`, [planId]);
  return rows[0] ? mapPlan(rows[0]) : null;
}

export async function listPlans(sql: Sql): Promise<Plan[]> {
  const rows = await sql.query<{
    id: string;
    name: string;
    description: string;
    price_cents: unknown;
    currency: string;
    agent_limit: unknown;
    task_limit: unknown;
    api_enabled: unknown;
    private_networks: unknown;
    team_management: unknown;
    analytics_level: string;
    per_agent_cents: unknown;
    features: unknown;
    is_active: unknown;
    sort_order: unknown;
  }>(`select * from plans where is_active = true order by sort_order asc`);
  return rows.map(mapPlan);
}

export async function assertActiveUser(profile: Profile) {
  if (profile.status === "suspended") {
    const err = new Error("Account suspended");
    (err as Error & { status: number }).status = 403;
    throw err;
  }
}
