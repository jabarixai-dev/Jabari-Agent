import type { Config } from "@netlify/functions";
import { sql } from "./lib/db.mts";
import { json, methodNotAllowed, readJson } from "./lib/http.mts";

export default async function handler(request: Request) {
  try {
    if (request.method === "GET") {
      const rows = await sql`
        SELECT o.*, co.name AS company_name, l.title AS lead_title
        FROM opportunities o
        LEFT JOIN companies co ON co.id = o.company_id
        LEFT JOIN leads l ON l.id = o.lead_id
        ORDER BY o.created_at DESC
        LIMIT 200
      `;
      return json({ data: rows });
    }

    if (request.method === "POST") {
      const body = await readJson<{
        name: string; lead_id?: string; company_id?: string; owner_id?: string;
        stage?: string; status?: string; value?: number; expected_close_date?: string;
        probability?: number; notes?: string;
      }>(request);

      if (!body.name?.trim()) return json({ error: "name is required" }, 400);

      const rows = await sql`
        INSERT INTO opportunities
          (name,lead_id,company_id,owner_id,stage,status,value,expected_close_date,probability,notes)
        VALUES
          (${body.name.trim()},${body.lead_id ?? null},${body.company_id ?? null},
           ${body.owner_id ?? null},${body.stage ?? "qualified"},${body.status ?? "open"},
           ${body.value ?? 0},${body.expected_close_date ?? null},${body.probability ?? 0},
           ${body.notes ?? null})
        RETURNING *
      `;
      return json({ data: rows[0] }, 201);
    }

    return methodNotAllowed(["GET", "POST"]);
  } catch (error) {
    console.error(error);
    return json({ error: "Unable to process opportunities request" }, 500);
  }
}

export const config: Config = { path: "/api/opportunities" };
