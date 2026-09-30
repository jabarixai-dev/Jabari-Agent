import type { Config } from "@netlify/functions";
import { sql } from "./lib/db";
import { json, methodNotAllowed, readJson } from "./lib/http";

export default async function handler(request: Request) {
  try {
    if (request.method === "GET") {
      const rows = await sql`
        SELECT
          o.*,
          co.name AS company_name,
          l.name AS lead_name
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
        lead_id: string;
        contact_id?: string;
        company_id?: string;
        name: string;
        stage?: string;
        value?: number;
        probability?: number;
        expected_close_at?: number;
        owner?: string;
        notes?: string;
      }>(request);

      if (!body.lead_id?.trim()) {
        return json({ error: "lead_id is required" }, 400);
      }

      if (!body.name?.trim()) {
        return json({ error: "name is required" }, 400);
      }

      const now = Date.now();

      const rows = await sql`
        INSERT INTO opportunities
          (lead_id,contact_id,company_id,name,stage,value,probability,
           expected_close_at,owner,notes,created_at,updated_at)
        VALUES
          (${body.lead_id.trim()},${body.contact_id ?? null},${body.company_id ?? null},
           ${body.name.trim()},${body.stage ?? "qualified"},${body.value ?? 0},
           ${body.probability ?? 0},${body.expected_close_at ?? null},
           ${body.owner ?? "unassigned"},${body.notes ?? ""},
           ${now},${now})
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
