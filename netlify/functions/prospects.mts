import type { Config } from "@netlify/functions";
import { sql } from "./lib/db";
import { json, methodNotAllowed } from "./lib/http";

export default async function handler(request: Request) {
  try {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);

    const rows = await sql`
      SELECT
        id,
        name,
        url,
        snippet,
        source,
        status,
        target_service,
        target_niche,
        target_location,
        qualification_status,
        qualification_reason,
        website_status,
        contact_name,
        contact_email,
        contact_phone,
        fit_reason,
        pain_point,
        outreach_subject,
        analysis_status,
        contact_status,
        contact_source,
        website_found,
        created_at,
        updated_at
      FROM prospects
      ORDER BY created_at DESC
      LIMIT 200
    `;

    return json({ data: rows });
  } catch (error) {
    console.error(error);
    return json({ error: "Unable to load prospects" }, 500);
  }
}

export const config: Config = { path: "/api/prospects" };
