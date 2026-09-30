import type { Config } from "@netlify/functions";
import { sql } from "./lib/db.mts";
import { json, methodNotAllowed, readJson } from "./lib/http.mts";

export default async function handler(request: Request) {
  try {
    if (request.method === "GET") {
      const rows = await sql`
        SELECT c.*, co.name AS company_name
        FROM contacts c
        LEFT JOIN companies co ON co.id = c.company_id
        ORDER BY c.created_at DESC
        LIMIT 200
      `;
      return json({ data: rows });
    }

    if (request.method === "POST") {
      const body = await readJson<{
        first_name: string; last_name?: string; email?: string; phone?: string;
        job_title?: string; source?: string; company_id?: string; owner_id?: string; notes?: string;
      }>(request);

      if (!body.first_name?.trim()) return json({ error: "first_name is required" }, 400);

      const rows = await sql`
        INSERT INTO contacts
          (first_name,last_name,email,phone,job_title,source,company_id,owner_id,notes)
        VALUES
          (${body.first_name.trim()},${body.last_name ?? null},${body.email ?? null},
           ${body.phone ?? null},${body.job_title ?? null},${body.source ?? null},
           ${body.company_id ?? null},${body.owner_id ?? null},${body.notes ?? null})
        RETURNING *
      `;
      return json({ data: rows[0] }, 201);
    }

    return methodNotAllowed(["GET", "POST"]);
  } catch (error) {
    console.error(error);
    return json({ error: "Unable to process contacts request" }, 500);
  }
}

export const config: Config = { path: "/api/contacts" };
