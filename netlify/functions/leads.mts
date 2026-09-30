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
      if (!id) return json({ error: "id is required" }, 400);
      const current = await sql`SELECT * FROM leads WHERE id=${id} LIMIT 1`;
      if (!current.length) return json({ error: "Lead not found" }, 404);
      const status = body.status !== undefined ? String(body.status).trim() : current[0].status;
      if (!["new", "contacted", "qualified", "won", "lost"].includes(status)) return json({ error: "invalid status" }, 400);
      const name = body.name !== undefined ? String(body.name).trim() : current[0].name;
      const email = body.email !== undefined ? String(body.email).trim() : current[0].email;
      const company = body.company !== undefined ? String(body.company).trim() : current[0].company;
      const requestText = body.request !== undefined ? String(body.request).trim() : current[0].request;
      const budget = body.budget !== undefined ? String(body.budget).trim() : current[0].budget;
      const timeline = body.timeline !== undefined ? String(body.timeline).trim() : current[0].timeline;
      if (!name || !email || !company || !requestText || !budget || !timeline) return json({ error: "name, email, company, request, budget and timeline are required" }, 400);
      const rows = await sql`
        UPDATE leads SET name=${name}, email=${email}, company=${company}, request=${requestText}, budget=${budget}, timeline=${timeline}, status=${status}, updated_at=${Date.now()} WHERE id=${id}
        RETURNING *
      `;
      return json({ data: rows[0] });
    }

    return methodNotAllowed(["GET", "POST", "PATCH"]);
  } catch (error) {
    console.error(error);
    return json({ error: "Unable to process leads request" }, 500);
  }
}

export const config: Config = { path: "/api/leads" };
