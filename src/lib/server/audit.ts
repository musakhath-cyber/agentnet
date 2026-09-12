import type { Sql } from "@/lib/db";
import { newId } from "@/lib/ids";
import type { Json } from "@/lib/json";

export async function audit(
  sql: Sql,
  entry: {
    userId?: string | null;
    actorType?: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    ip?: string | null;
    meta?: Json;
  },
) {
  await sql.query(
    `insert into audit_logs (id, user_id, actor_type, action, resource_type, resource_id, ip, meta)
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [
      newId("log"),
      entry.userId ?? null,
      entry.actorType ?? "user",
      entry.action,
      entry.resourceType ?? null,
      entry.resourceId ?? null,
      entry.ip ?? null,
      JSON.stringify(entry.meta ?? {}),
    ],
  );
}
