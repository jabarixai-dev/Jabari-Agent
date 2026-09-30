import type { Config } from "@netlify/functions";
import { sql } from "./lib/db";
import { json, methodNotAllowed, readJson } from "./lib/http";

export default async function handler(request: Request) {
  try {
    if (request.method === "GET") {
      const rows = await sql`
        SELECT * FROM leads
        ORDER BY created_at DESC
        LIMIT 200
      `;
      return json({ data: rows });
    }

    if (request.method === "POST") {
      const body = await readJson<{
        thread_id?: string;
        name: string;
        email: string;
        company: string;
        request: string;
        budget: string;
        timeline: string;
        status?: string;
      }>(request);

      if (!body.thread_id?.trim()) return json({ error: "thread_id is required" }, 400);
      if (!body.name?.trim()) return json({ error: "name is required" }, 400);
      if (!body.email?.trim()) return json({ error: "email is required" }, 400);
      if (!body.company?.trim()) return json({ error: "company is required" }, 400);
      if (!body.request?.trim()) return json({ error: "request is required" }, 400);
      if (!body.budget?.trim()) return json({ error: "budget is required" }, 400);
      if (!body.timeline?.trim()) return json({ error: "timeline is required" }, 400);

      const status = body.status ?? "new";

      if (!["new", "contacted", "qualified", "won", "lost"].includes(status)) {
        return json({ error: "invalid status" }, 400);
      }

      const now = Date.now();

      const rows = await sql`
        INSERT INTO leads
          (thread_id,name,email,company,request,budget,timeline,status,created_at,updated_at)
        VALUES
          (${body.thread_id.trim()},${body.name.trim()},${body.email.trim()},
           ${body.company.trim()},${body.request.trim()},${body.budget.trim()},
           ${body.timeline.trim()},${status},${now},${now})
        RETURNING *
      `;

      return json({ data: rows[0] }, 201);
    }

    if (request.method === "PATCH") {
      const body = await request.json().catch(() => ({}));
      const id = String(body.id || "").trim();
      const status = String(body.status || "").trim();
      if (!id || !status) return json({ error: "id and status are required" }, 400);
      if (!["new", "contacted", "qualified", "won", "lost"].includes(status)) return json({ error: "invalid status" }, 400);
      const rows = await sql`
        UPDATE leads SET status=${status}, updated_at=${Date.now()} WHERE id=${id}
        RETURNING *
      `;
      if (!rows.length) return json({ error: "Lead not found" }, 404);
      return json({ data: rows[0] });
    }

    return methodNotAllowed(["GET", "POST", "PATCH"]);
  } catch (error) {
    console.error(error);
    return json({ error: "Unable to process leads request" }, 500);
  }
}

export const config: Config = { path: "/api/leads" };
