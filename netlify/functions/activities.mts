import type { Config } from "@netlify/functions";
import { sql } from "./lib/db";
import { json, methodNotAllowed } from "./lib/http";

export default async function handler(request: Request) {
  try {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);

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
