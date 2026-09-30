import type { Config } from "@netlify/functions";
import { sql } from "./lib/db";
import { json, methodNotAllowed, readJson } from "./lib/http";

export default async function handler(request: Request) {
  try {
    if (request.method === "GET") {
      const rows = await sql`
        SELECT
          a.*,
          c.name AS contact_name,
          l.name AS lead_name
        FROM appointments a
        LEFT JOIN contacts c ON c.id = a.contact_id
        LEFT JOIN leads l ON l.id = a.lead_id
        ORDER BY a.start_at ASC
        LIMIT 200
      `;
      return json({ data: rows });
    }

    if (request.method === "POST") {
      const body = await readJson<{
        contact_id?: string;
        lead_id?: string;
        title: string;
        description?: string;
        start_at: number;
        end_at: number;
        status?: string;
        location?: string;
        meeting_url?: string;
      }>(request);

      if (!body.title?.trim()) return json({ error: "title is required" }, 400);
      if (!Number.isFinite(body.start_at)) return json({ error: "start_at is required" }, 400);
      if (!Number.isFinite(body.end_at)) return json({ error: "end_at is required" }, 400);
      if (body.end_at <= body.start_at) return json({ error: "end_at must be after start_at" }, 400);

      const now = Date.now();

      const rows = await sql`
        INSERT INTO appointments
          (contact_id,lead_id,title,description,start_at,end_at,status,location,meeting_url,created_at,updated_at)
        VALUES
          (${body.contact_id ?? null},
           ${body.lead_id ?? null},
           ${body.title.trim()},
           ${body.description?.trim() ?? ""},
           ${body.start_at},
           ${body.end_at},
           ${body.status?.trim() || "scheduled"},
           ${body.location?.trim() || "online"},
           ${body.meeting_url?.trim() || null},
           ${now},
           ${now})
        RETURNING *
      `;

      return json({ data: rows[0] }, 201);
    }

    return methodNotAllowed(["GET", "POST"]);
  } catch (error) {
    console.error(error);
    return json({ error: "Unable to process appointments request" }, 500);
  }
}

export const config: Config = { path: "/api/appointments" };
