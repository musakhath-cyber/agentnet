import type { Sql } from "../db.ts";
import { newId } from "../ids.ts";
import type { Json } from "../json.ts";

const MEMORY = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 60_000;

const PLAN_LIMITS: Record<string, number> = {
  free: 60,
  agent: 180,
  pro: 600,
  business: 2400,
};

export function limitForPlan(planId: string | null | undefined): number {
  return PLAN_LIMITS[planId ?? "free"] ?? PLAN_LIMITS.free;
}

export async function consumeRateLimit(
  sql: Sql,
  key: string,
  limit: number,
): Promise<{ ok: true; remaining: number } | { ok: false; retryAfterMs: number }> {
  const now = Date.now();
  const mem = MEMORY.get(key);
  if (!mem || now - mem.windowStart >= WINDOW_MS) {
    MEMORY.set(key, { count: 1, windowStart: now });
    try {
      await sql.query(
        `insert into rate_limits (key, count, window_start)
         values ($1, 1, now())
         on conflict (key) do update set count = 1, window_start = now()`,
        [key],
      );
    } catch {
      /* preview DB may be racing — memory still enforces */
    }
    return { ok: true, remaining: limit - 1 };
  }
  if (mem.count >= limit) {
    return { ok: false, retryAfterMs: WINDOW_MS - (now - mem.windowStart) };
  }
  mem.count += 1;
  return { ok: true, remaining: Math.max(0, limit - mem.count) };
}

export async function recordUsage(
  sql: Sql,
  input: {
    userId: string;
    agentId?: string | null;
    kind: string;
    units?: number;
    meta?: Json;
  },
) {
  await sql.query(
    `insert into usage_events (id, user_id, agent_id, kind, units, meta)
     values ($1, $2, $3, $4, $5, $6::jsonb)`,
    [
      newId("use"),
      input.userId,
      input.agentId ?? null,
      input.kind,
      input.units ?? 1,
      JSON.stringify(input.meta ?? {}),
    ],
  );
}
