import type { Config } from "@netlify/functions";
import { sql } from "./lib/db";
import { json, methodNotAllowed, readJson } from "./lib/http";

export default async function handler(request: Request) {
  try {
    if (request.method === "GET") {
      const rows = await sql`
        SELECT l.*, c.first_name, c.last_name, co.name AS company_name
        FROM leads l
        LEFT JOIN contacts c ON c.id = l.contact_id
        LEFT JOIN companies co ON co.id = l.company_id
        ORDER BY l.created_at DESC
        LIMIT 200
      `;
      return json({ data: rows });
    }

    if (request.method === "POST") {
      const body = await readJson<{
        title: string; contact_id?: string; company_id?: string; owner_id?: string;
        source?: string; stage?: string; status?: string; score?: number;
        estimated_value?: number; notes?: string;
      }>(request);

      if (!body.title?.trim()) return json({ error: "title is required" }, 400);

      const rows = await sql`
        INSERT INTO leads
          (title,contact_id,company_id,owner_id,source,stage,status,score,estimated_value,notes)
        VALUES
          (${body.title.trim()},${body.contact_id ?? null},${body.company_id ?? null},
           ${body.owner_id ?? null},${body.source ?? null},${body.stage ?? "new"},
           ${body.status ?? "open"},${body.score ?? 0},${body.estimated_value ?? null},
           ${body.notes ?? null})
        RETURNING *
      `;
      return json({ data: rows[0] }, 201);
    }

    return methodNotAllowed(["GET", "POST"]);
  } catch (error) {
    console.error(error);
    return json({ error: "Unable to process leads request" }, 500);
  }
}

export const config: Config = { path: "/api/leads" };
