import type { Config } from "@netlify/functions";
import { sql } from "./lib/db";
import { json, methodNotAllowed } from "./lib/http";

export default async function handler(request: Request) {
  try {
    if (request.method === "GET") {
      const rows = await sql`
        SELECT w.*,
          COALESCE(x.execution_count, 0) AS execution_count,
          COALESCE(x.active_count, 0) AS active_count
        FROM workflows w
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS execution_count,
                 COUNT(*) FILTER (WHERE status NOT IN ('completed','failed','stopped'))::int AS active_count
          FROM workflow_executions e WHERE e.workflow_id = w.id
        ) x ON true
        ORDER BY w.updated_at DESC
        LIMIT 200
      `;
      return json({ data: rows });
    }

    if (request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const name = String(body.name || "").trim();
      if (!name) return json({ error: "Workflow name is required" }, 400);
      const now = Date.now();
      const rows = await sql`
        INSERT INTO workflows (name, trigger, condition, action, action_value, steps, goal, enabled, created_at, updated_at)
        VALUES (
          ${name}, ${String(body.trigger || "lead_created")}, ${String(body.condition || "always")},
          ${String(body.action || "create_task")}, ${String(body.action_value || "Follow up with lead")},
          ${body.steps ? JSON.stringify(body.steps) : null}, ${body.goal ? String(body.goal) : null},
          ${Boolean(body.enabled)}, ${now}, ${now}
        )
        RETURNING *
      `;
      return json({ data: rows[0] }, 201);
    }

    if (request.method === "PATCH") {
      const body = await request.json().catch(() => ({}));
      const id = String(body.id || "").trim();
      if (!id) return json({ error: "Workflow id is required" }, 400);
      const enabled = Boolean(body.enabled);
      const rows = await sql`UPDATE workflows SET enabled=${enabled}, updated_at=${Date.now()} WHERE id=${id} RETURNING *`;
      if (!rows.length) return json({ error: "Workflow not found" }, 404);
      return json({ data: rows[0] });
    }

    return methodNotAllowed(["GET", "POST", "PATCH"]);
  } catch (error) {
    console.error(error);
    return json({ error: "Unable to load workflows" }, 500);
  }
}

export const config: Config = { path: "/api/workflows" };
