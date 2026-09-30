import type { Config } from "@netlify/functions";
import { sql } from "./lib/db";
import { json, methodNotAllowed } from "./lib/http";

export default async function handler(request: Request) {
  try {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);

    const rows = await sql`
      SELECT
        t.id AS thread_id,
        t.title,
        t.created_at,
        t.updated_at,
        l.id AS lead_id,
        l.name AS lead_name,
        l.email AS lead_email,
        l.company AS lead_company,
        lm.message,
        lm.role AS last_role,
        lm.created_at AS last_message_at
      FROM chat_threads t
      LEFT JOIN leads l ON l.thread_id = t.id
      LEFT JOIN LATERAL (
        SELECT message, role, created_at
        FROM chat_messages m
        WHERE m.thread_id = t.id
        ORDER BY m."order" DESC, m.created_at DESC
        LIMIT 1
      ) lm ON true
      ORDER BY COALESCE(lm.created_at, t.updated_at) DESC
      LIMIT 200
    `;

    return json({ data: rows });
  } catch (error) {
    console.error(error);
    return json({ error: "Unable to load inbox conversations" }, 500);
  }
}

export const config: Config = { path: "/api/inbox" };
