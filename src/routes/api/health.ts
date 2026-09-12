import { createFileRoute } from "@tanstack/react-router";
import { dbSource, getSql } from "@/lib/db";
import { num } from "@/lib/server/serialize";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const sql = await getSql();
          const started = Date.now();
          await sql.query(`select 1 as ok`);
          const pending = await sql.query<{ n: number }>(
            `select count(*)::int as n from tasks where status in ('pending','accepted','processing')`,
          );
          const online = await sql.query<{ n: number }>(
            `select count(*)::int as n from agents where status = 'online'`,
          );
          return Response.json({
            ok: true,
            service: "agentnet",
            db: true,
            db_backend: dbSource,
            latency_ms: Date.now() - started,
            pending_tasks: num(pending[0]?.n),
            agents_online: num(online[0]?.n),
            ts: new Date().toISOString(),
          });
        } catch (err) {
          return Response.json(
            {
              ok: false,
              service: "agentnet",
              error: err instanceof Error ? err.message : "unhealthy",
            },
            { status: 503 },
          );
        }
      },
    },
  },
});
