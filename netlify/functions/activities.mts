import type { Config } from "@netlify/functions";
import { sql } from "./lib/db";
import { json, methodNotAllowed } from "./lib/http";

export default async function handler(request: Request) {
  try {
    if (request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const contactId = body.contact_id ? String(body.contact_id).trim() : null;
      const leadId = body.lead_id ? String(body.lead_id).trim() : null;
      const type = String(body.type || "note").trim();
      const title = String(body.title || "CRM note").trim();
      const detail = String(body.detail || "").trim();
      if (!title || !detail) return json({ error: "title and detail are required" }, 400);
      if (!contactId && !leadId) return json({ error: "contact_id or lead_id is required" }, 400);
      const now = Date.now();
      const rows = await sql`
        INSERT INTO crm_activities (contact_id, lead_id, type, title, detail, created_at)
        VALUES (${contactId}, ${leadId}, ${type}, ${title}, ${detail}, ${now})
        RETURNING *
      `;
      return json({ data: rows[0] }, 201);
    }

    if (request.method !== "GET") return methodNotAllowed(["GET", "POST"]);

    const rows = await sql`
      SELECT
        a.*,
        c.name AS contact_name,
        l.name AS lead_name
      FROM crm_activities a
      LEFT JOIN contacts c ON c.id = a.contact_id
      LEFT JOIN leads l ON l.id = a.lead_id
      ORDER BY a.created_at DESC
      LIMIT 200
    `;

    return json({ data: rows });
  } catch (error) {
    console.error(error);
    return json({ error: "Unable to load CRM activities" }, 500);
  }
}

export const config: Config = { path: "/api/activities" };
