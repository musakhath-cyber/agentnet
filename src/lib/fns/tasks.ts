import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { getAgent } from "@/lib/server/agents";
import { getTask, listTasksForUser, sendTask, updateTaskStatus } from "@/lib/server/tasks";
import { ensureProfile, getPlan, assertActiveUser } from "@/lib/server/profiles";
import { newId } from "@/lib/ids";
import type { Json } from "@/lib/json";
import { sanitizeText } from "@/lib/server/ssrf";
import { mapMessage } from "@/lib/server/rows";

export const fetchTasks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { status?: string; agentId?: string } = {}) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    return listTasksForUser(sql, context.userId, data);
  });

export const fetchTask = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const task = await getTask(sql, id);
    if (!task) return null;
    const from = await getAgent(sql, task.fromAgentId);
    const to = await getAgent(sql, task.toAgentId);
    if (from?.userId !== context.userId && to?.userId !== context.userId && task.userId !== context.userId) {
      return null;
    }
    return { task, from, to };
  });

export const dispatchTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { fromAgentId: string; toAgentId: string; title: string; input: Json }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    assertActiveUser(profile);
    const plan = await getPlan(sql, profile.planId);
    const from = await getAgent(sql, data.fromAgentId);
    const to = await getAgent(sql, data.toAgentId);
    if (!from || !to) throw new Error("Agent not found.");
    return sendTask(sql, {
      userId: context.userId,
      fromAgent: from,
      toAgent: to,
      title: data.title,
      input: data.input,
      taskLimit: plan?.taskLimit ?? 50,
    });
  });

export const mutateTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      id: string;
      agentId: string;
      status: "accepted" | "processing" | "completed" | "failed" | "cancelled";
      result?: Json;
      error?: string;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    assertActiveUser(profile);
    const task = await getTask(sql, data.id);
    if (!task) throw new Error("Task not found.");
    const actor = await getAgent(sql, data.agentId);
    if (!actor || actor.userId !== context.userId) throw new Error("You do not own that agent.");
    return updateTaskStatus(sql, {
      task,
      actorUserId: context.userId,
      actorAgentId: actor.id,
      status: data.status,
      result: data.result,
      error: data.error,
    });
  });

export const fetchMessages = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql.query<{
      id: string;
      from_agent_id: string | null;
      to_agent_id: string | null;
      user_id: string;
      task_id: string | null;
      body: string;
      read_at: unknown;
      created_at: unknown;
      from_agent_name?: string | null;
      to_agent_name?: string | null;
    }>(
      `select m.*, fa.name as from_agent_name, ta.name as to_agent_name
       from messages m
       left join agents fa on fa.id = m.from_agent_id
       left join agents ta on ta.id = m.to_agent_id
       where m.user_id = $1
          or m.from_agent_id in (select id from agents where user_id = $1)
          or m.to_agent_id in (select id from agents where user_id = $1)
       order by m.created_at desc
       limit 80`,
      [context.userId],
    );
    return rows.map(mapMessage);
  });

export const markMessagesRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql.query(`update messages set read_at = now() where user_id = $1 and read_at is null`, [
      context.userId,
    ]);
    return { ok: true };
  });

export const fileReport = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { targetType: string; targetId: string; reason: string; details?: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    assertActiveUser(profile);
    const id = newId("rep");
    await sql.query(
      `insert into reports (id, reporter_user_id, target_type, target_id, reason, details)
       values ($1,$2,$3,$4,$5,$6)`,
      [
        id,
        context.userId,
        data.targetType,
        data.targetId,
        sanitizeText(data.reason, 80),
        data.details ? sanitizeText(data.details, 2000) : null,
      ],
    );
    return { id };
  });
