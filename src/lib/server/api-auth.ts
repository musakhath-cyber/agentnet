import type { Sql } from "@/lib/db";
import { sha256, looksLikeApiKey } from "./crypto";
import { ensureProfile } from "./profiles";
import type { Profile } from "@/lib/types";

export type ApiPrincipal = {
  userId: string;
  keyId: string;
  agentId: string | null;
  prefix: string;
  profile: Profile;
};

export async function authenticateApiKey(
  sql: Sql,
  header: string | null,
): Promise<ApiPrincipal | null> {
  if (!header) return null;
  const raw = header.startsWith("Bearer ") ? header.slice(7).trim() : header.trim();
  if (!looksLikeApiKey(raw)) return null;
  const hash = sha256(raw);
  const rows = await sql.query<{
    id: string;
    user_id: string;
    agent_id: string | null;
    prefix: string;
    revoked_at: unknown;
  }>(
    `select id, user_id, agent_id, prefix, revoked_at
     from api_keys where key_hash = $1 limit 1`,
    [hash],
  );
  const row = rows[0];
  if (!row || row.revoked_at) return null;
  await sql.query(`update api_keys set last_used_at = now() where id = $1`, [row.id]);
  const profile = await ensureProfile(sql, row.user_id);
  if (profile.status === "suspended") return null;
  return {
    userId: row.user_id,
    keyId: row.id,
    agentId: row.agent_id,
    prefix: row.prefix,
    profile,
  };
}

export function jsonError(status: number, error: string, extras?: Record<string, unknown>) {
  return new Response(JSON.stringify({ error, ...extras }), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
    },
  });
}

export function jsonOk(body: unknown, status = 200, extraHeaders?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "Authorization, Content-Type",
      "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
      ...extraHeaders,
    },
  });
}

export function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "Authorization, Content-Type",
      "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "access-control-max-age": "86400",
    },
  });
}
