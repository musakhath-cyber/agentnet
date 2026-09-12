import type { Sql } from "@/lib/db";
import { newId, taskId } from "@/lib/ids";
import type { Json } from "@/lib/json";
import type { Agent, TaskRecord } from "@/lib/types";
import { audit } from "./audit";
import { executeHosted, executeLlm, validateTaskInput } from "./protocol";
import { recordUsage } from "./rate-limit";
import { mapTask, type TaskRow } from "./rows";
import { sanitizeText } from "./ssrf";
import { deliverTaskWebhook } from "./webhooks";
import { log } from "./logging";

const TASK_SELECT = `
  t.id, t.from_agent_id, t.to_agent_id, t.user_id, t.title, t.input, t.status,
  t.result, t.error, t.priority, t.ack_at, t.started_at, t.completed_at,
  t.created_at, t.updated_at,
  fa.name as from_agent_name,
  ta.name as to_agent_name
`;

export async function getTask(sql: Sql, id: string): Promise<TaskRecord | null> {
  const rows = await sql.query<TaskRow>(
    `select ${TASK_SELECT}
     from tasks t
     join agents fa on fa.id = t.from_agent_id
     join agents ta on ta.id = t.to_agent_id
     where t.id = $1`,
    [id],
  );
  return rows[0] ? mapTask(rows[0]) : null;
}

export async function listTasksForUser(
  sql: Sql,
  userId: string,
  filters: { status?: string; agentId?: string; limit?: number } = {},
): Promise<TaskRecord[]> {
  const where = [`(t.user_id = $1 or fa.user_id = $1 or ta.user_id = $1)`];
  const params: unknown[] = [userId];
  if (filters.status) {
    params.push(filters.status);
    where.push(`t.status = $${params.length}`);
  }
  if (filters.agentId) {
    params.push(filters.agentId);
    where.push(`(t.from_agent_id = $${params.length} or t.to_agent_id = $${params.length})`);
  }
  const limit = Math.min(filters.limit ?? 50, 200);
  params.push(limit);
  const rows = await sql.query<TaskRow>(
    `select ${TASK_SELECT}
     from tasks t
     join agents fa on fa.id = t.from_agent_id
     join agents ta on ta.id = t.to_agent_id
     where ${where.join(" and ")}
     order by t.created_at desc
     limit $${params.length}`,
    params,
  );
  return rows.map(mapTask);
}

export async function inboxForAgent(sql: Sql, agentIdValue: string, status?: string) {
  const params: unknown[] = [agentIdValue];
  let extra = "";
  if (status) {
    params.push(status);
    extra = ` and t.status = $2`;
  }
  const rows = await sql.query<TaskRow>(
    `select ${TASK_SELECT}
     from tasks t
     join agents fa on fa.id = t.from_agent_id
     join agents ta on ta.id = t.to_agent_id
     where t.to_agent_id = $1${extra}
     order by t.created_at desc
     limit 50`,
    params,
  );
  return rows.map(mapTask);
}

async function monthTaskCount(sql: Sql, userId: string): Promise<number> {
  const rows = await sql.query<{ n: number }>(
    `select count(*)::int as n from tasks
     where user_id = $1 and created_at >= date_trunc('month', now())`,
    [userId],
  );
  return rows[0]?.n ?? 0;
}

export async function sendTask(
  sql: Sql,
  opts: {
    userId: string;
    fromAgent: Agent;
    toAgent: Agent;
    title: string;
    input: Json;
    taskLimit: number;
  },
): Promise<TaskRecord> {
  if (opts.fromAgent.userId !== opts.userId) throw new Error("You do not own the sending agent.");
  if (opts.fromAgent.status === "suspended" || opts.toAgent.status === "suspended") {
    throw new Error("A suspended agent cannot participate in tasks.");
  }
  if (opts.toAgent.visibility === "private" && opts.toAgent.userId !== opts.userId) {
    throw new Error("That agent is private.");
  }
  const valid = validateTaskInput(opts.input);
  if (!valid.ok) throw new Error(valid.error);
  const used = await monthTaskCount(sql, opts.userId);
  if (used >= opts.taskLimit) {
    throw new Error("Monthly task limit reached. Upgrade your plan to send more.");
  }

  const id = taskId();
  const title = sanitizeText(opts.title || extractTitle(opts.input), 120) || "Untitled task";
  await sql.query(
    `insert into tasks (id, from_agent_id, to_agent_id, user_id, title, input, status)
     values ($1,$2,$3,$4,$5,$6::jsonb,'pending')`,
    [id, opts.fromAgent.id, opts.toAgent.id, opts.userId, title, JSON.stringify(opts.input ?? {})],
  );
  await recordUsage(sql, {
    userId: opts.userId,
    agentId: opts.fromAgent.id,
    kind: "task_sent",
    meta: { to: opts.toAgent.id },
  });
  await audit(sql, {
    userId: opts.userId,
    actorType: "agent",
    action: "task.send",
    resourceType: "task",
    resourceId: id,
    meta: { from: opts.fromAgent.id, to: opts.toAgent.id },
  });
  await sql.query(
    `insert into messages (id, from_agent_id, to_agent_id, user_id, task_id, body)
     values ($1,$2,$3,$4,$5,$6)`,
    [
      newId("msg"),
      opts.fromAgent.id,
      opts.toAgent.id,
      opts.userId,
      id,
      `${opts.fromAgent.name} sent “${title}” to ${opts.toAgent.name}.`,
    ],
  );

  log.task({ event: "created", taskId: id, from: opts.fromAgent.id, to: opts.toAgent.id });

  if (opts.toAgent.hosted) {
    return runHosted(sql, id, opts.toAgent);
  }

  if (opts.toAgent.endpointUrl) {
    const created = await getTask(sql, id);
    if (created) {
      void deliverTaskWebhook({
        url: opts.toAgent.endpointUrl,
        task: {
          id: created.id,
          from: created.fromAgentId,
          to: created.toAgentId,
          title: created.title,
          input: created.input,
          status: created.status,
          created_at: created.createdAt,
        },
      });
    }
  }

  const created = await getTask(sql, id);
  if (!created) throw new Error("Failed to load task");
  return created;
}

function extractTitle(input: Json): string {
  if (typeof input === "string") return input.slice(0, 80);
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const rec = input;
    for (const k of ["title", "instruction", "query", "prompt"]) {
      const v = rec[k];
      if (typeof v === "string") return v.slice(0, 80);
    }
  }
  return "Task";
}

async function runHosted(sql: Sql, id: string, agent: Agent): Promise<TaskRecord> {
  await sql.query(
    `update tasks set status = 'processing', ack_at = now(), started_at = now(), updated_at = now()
     where id = $1`,
    [id],
  );
  const current = await getTask(sql, id);
  if (!current) throw new Error("Task missing");
  const kind = agent.hostedKind || "echo";
  const executed = kind === "llm" ? await executeLlm(current.input) : executeHosted(kind, current.input);
  if (executed.ok) {
    await sql.query(
      `update tasks set status = 'completed', result = $2::jsonb, completed_at = now(), updated_at = now()
       where id = $1`,
      [id, JSON.stringify(executed.result)],
    );
    await sql.query(
      `insert into task_results (id, task_id, payload) values ($1,$2,$3::jsonb)`,
      [newId("res"), id, JSON.stringify(executed.result)],
    );
    await sql.query(
      `update agents set tasks_completed = tasks_completed + 1,
         reputation_score = least(99, reputation_score + 0.2), updated_at = now()
       where id = $1`,
      [agent.id],
    );
    await recordUsage(sql, {
      userId: current.userId,
      agentId: agent.id,
      kind: "task_completed",
    });
    log.task({ event: "completed", taskId: id, hosted: true });
  } else {
    await sql.query(
      `update tasks set status = 'failed', error = $2, completed_at = now(), updated_at = now()
       where id = $1`,
      [id, executed.error],
    );
    await sql.query(
      `update agents set tasks_failed = tasks_failed + 1,
         reputation_score = greatest(1, reputation_score - 0.5), updated_at = now()
       where id = $1`,
      [agent.id],
    );
    await recordUsage(sql, {
      userId: current.userId,
      agentId: agent.id,
      kind: "task_failed",
    });
    log.task({ event: "failed", taskId: id, error: executed.error });
  }
  const done = await getTask(sql, id);
  if (!done) throw new Error("Failed to load task");
  return done;
}

export async function updateTaskStatus(
  sql: Sql,
  opts: {
    task: TaskRecord;
    actorUserId: string;
    actorAgentId: string;
    status: "accepted" | "processing" | "completed" | "failed" | "cancelled";
    result?: Json;
    error?: string;
  },
): Promise<TaskRecord> {
  const { task } = opts;
  const isReceiver = opts.actorAgentId === task.toAgentId;
  const isSender = opts.actorAgentId === task.fromAgentId;
  if (opts.status === "cancelled") {
    if (!isSender) throw new Error("Only the sender can cancel.");
    if (["completed", "failed", "cancelled"].includes(task.status)) {
      throw new Error("Task can no longer be cancelled.");
    }
  } else if (!isReceiver) {
    throw new Error("Only the receiving agent can update this task.");
  }

  const fields: string[] = [`status = $2`, `updated_at = now()`];
  const params: unknown[] = [task.id, opts.status];
  if (opts.status === "accepted") fields.push(`ack_at = now()`);
  if (opts.status === "processing") fields.push(`started_at = coalesce(started_at, now())`);
  if (opts.status === "completed" || opts.status === "failed" || opts.status === "cancelled") {
    fields.push(`completed_at = now()`);
  }
  if (opts.result !== undefined) {
    params.push(JSON.stringify(opts.result ?? {}));
    fields.push(`result = $${params.length}::jsonb`);
  }
  if (opts.error) {
    params.push(opts.error.slice(0, 1000));
    fields.push(`error = $${params.length}`);
  }
  await sql.query(`update tasks set ${fields.join(", ")} where id = $1`, params);

  if (opts.status === "completed" && opts.result !== undefined) {
    await sql.query(
      `insert into task_results (id, task_id, payload) values ($1,$2,$3::jsonb)`,
      [newId("res"), task.id, JSON.stringify(opts.result)],
    );
    await sql.query(
      `update agents set tasks_completed = tasks_completed + 1,
         reputation_score = least(99, reputation_score + 0.2) where id = $1`,
      [task.toAgentId],
    );
  }
  if (opts.status === "failed") {
    await sql.query(
      `update agents set tasks_failed = tasks_failed + 1,
         reputation_score = greatest(1, reputation_score - 0.5) where id = $1`,
      [task.toAgentId],
    );
  }
  log.task({ event: opts.status, taskId: task.id, actor: opts.actorAgentId });
  const updated = await getTask(sql, task.id);
  if (!updated) throw new Error("Failed to load task");
  return updated;
}
