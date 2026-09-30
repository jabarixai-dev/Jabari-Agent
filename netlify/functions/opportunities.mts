import type { Config } from "@netlify/functions";
import { sql } from "./lib/db";
import { json, methodNotAllowed } from "./lib/http";

const stages = ["qualified", "proposal", "negotiation", "closed_won", "closed_lost"];

export default async function handler(request: Request) {
  try {
    if (request.method === "GET") {
      const rows = await sql`
        SELECT o.*, c.name AS company_name, l.name AS lead_name
        FROM opportunities o
        LEFT JOIN companies c ON c.id = o.company_id
        LEFT JOIN leads l ON l.id = o.lead_id
        ORDER BY o.created_at DESC
      `;
      return json({ data: rows });
    }

    if (request.method === "POST") {
      const body = await request.json();
      if (!body.lead_id || !body.name) return json({ error: "lead_id and name are required" }, 400);
      const stage = stages.includes(body.stage) ? body.stage : "qualified";
      const now = Date.now();
      const rows = await sql`
        INSERT INTO opportunities
          (lead_id, contact_id, company_id, name, stage, value, probability, expected_close_at, owner, notes, created_at, updated_at)
        VALUES
          (${body.lead_id}, ${body.contact_id || null}, ${body.company_id || null}, ${body.name}, ${stage}, ${Number(body.value) || 0}, ${Number(body.probability) || 0}, ${body.expected_close_at ? Number(body.expected_close_at) : null}, ${body.owner || "unassigned"}, ${body.notes || ""}, ${now}, ${now})
        RETURNING *
      `;
      return json({ data: rows[0] }, 201);
    }

    if (request.method === "PATCH") {
      const body = await request.json();
      if (!body.id) return json({ error: "id is required" }, 400);
      if (body.stage && !stages.includes(body.stage)) return json({ error: "Invalid opportunity stage" }, 400);
      const now = Date.now();
      const rows = await sql`
        UPDATE opportunities
        SET
          stage = COALESCE(${body.stage || null}, stage),
          probability = COALESCE(${body.probability != null ? Number(body.probability) : null}, probability),
          value = COALESCE(${body.value != null ? Number(body.value) : null}, value),
          owner = COALESCE(${body.owner || null}, owner),
          notes = COALESCE(${body.notes || null}, notes),
          expected_close_at = COALESCE(${body.expected_close_at != null ? Number(body.expected_close_at) : null}, expected_close_at),
          updated_at = ${now}
        WHERE id = ${body.id}
        RETURNING *
      `;
      if (!rows.length) return json({ error: "Opportunity not found" }, 404);
      return json({ data: rows[0] });
    }

    return methodNotAllowed(["GET", "POST", "PATCH"]);
  } catch (error) {
    console.error(error);
    return json({ error: "Unable to process opportunities" }, 500);
  }
}

export const config: Config = { path: "/api/opportunities" };
