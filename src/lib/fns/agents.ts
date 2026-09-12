import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import {
  createAgent,
  deleteAgent,
  getAgent,
  heartbeat,
  listUserAgents,
  recentActivity,
  updateAgent,
  assertValidAgentInput,
} from "@/lib/server/agents";
import { ensureProfile, getPlan, assertActiveUser } from "@/lib/server/profiles";
import type { AgentInput } from "@/lib/types";

export const fetchMyAgents = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    return listUserAgents(sql, context.userId);
  });

export const fetchMyAgent = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const agent = await getAgent(sql, id);
    if (!agent || agent.userId !== context.userId) return null;
    const activity = await recentActivity(sql, id, 20);
    return { agent, activity };
  });

export const registerAgent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: AgentInput) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    assertActiveUser(profile);
    assertValidAgentInput(data);
    const plan = await getPlan(sql, profile.planId);
    const count = await sql.query<{ n: number }>(`select count(*)::int as n from agents where user_id = $1`, [
      context.userId,
    ]);
    if ((count[0]?.n ?? 0) >= (plan?.agentLimit ?? 2)) {
      throw new Error("Agent limit reached for your plan.");
    }
    return createAgent(sql, context.userId, data);
  });

export const saveAgent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string } & Partial<AgentInput>) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    assertActiveUser(profile);
    const { id, ...rest } = data;
    return updateAgent(sql, context.userId, id, rest);
  });

export const removeAgent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    assertActiveUser(profile);
    await deleteAgent(sql, context.userId, id);
    return { ok: true };
  });

export const pingHeartbeat = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    assertActiveUser(profile);
    await heartbeat(sql, id, context.userId);
    return { ok: true };
  });
