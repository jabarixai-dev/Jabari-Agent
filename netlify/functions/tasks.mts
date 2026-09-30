import type { Config } from "@netlify/functions";
import { sql } from "./lib/db";
import { json, methodNotAllowed } from "./lib/http";

export default async function handler(request: Request) {
  try {
    if (request.method === "GET") {
      const rows = await sql`
        SELECT t.*, l.name AS lead_name, l.email AS lead_email, l.company AS lead_company
        FROM workflow_tasks t
        LEFT JOIN leads l ON l.id = t.lead_id
        ORDER BY CASE WHEN t.status IN ('completed','done') THEN 1 ELSE 0 END, t.updated_at DESC
        LIMIT 200
      `;
      return json({ data: rows });
    }

    if (request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const leadId = String(body.lead_id || "").trim();
      const title = String(body.title || "").trim();
      const detail = String(body.detail || "").trim();
      if (!leadId || !title || !detail) return json({ error: "lead_id, title and detail are required" }, 400);
      const now = Date.now();
      const rows = await sql`
        INSERT INTO workflow_tasks (lead_id, title, detail, status, created_at, updated_at)
        VALUES (${leadId}, ${title}, ${detail}, ${String(body.status || "pending")}, ${now}, ${now})
        RETURNING *
      `;
      return json({ data: rows[0] }, 201);
    }

    if (request.method === "PATCH") {
      const body = await request.json().catch(() => ({}));
      const id = String(body.id || "").trim();
      const status = String(body.status || "").trim();
      if (!id || !status) return json({ error: "id and status are required" }, 400);
      const rows = await sql`UPDATE workflow_tasks SET status=${status}, updated_at=${Date.now()} WHERE id=${id} RETURNING *`;
      if (!rows.length) return json({ error: "Task not found" }, 404);
      return json({ data: rows[0] });
    }

    return methodNotAllowed(["GET", "POST", "PATCH"]);
  } catch (error) {
    console.error(error);
    return json({ error: "Unable to load tasks" }, 500);
  }
}

export const config: Config = { path: "/api/tasks" };
