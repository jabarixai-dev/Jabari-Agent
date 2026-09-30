import type { Config } from "@netlify/functions";
import { sql } from "./lib/db";
import { json, methodNotAllowed, readJson } from "./lib/http";

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
        name?: string;
        first_name?: string;
        last_name?: string;
        email?: string;
        company?: string;
        company_id?: string;
        phone?: string;
        source?: string;
        lead_id?: string;
        job_title?: string;
        website?: string;
        notes?: string;
        tags?: unknown;
      }>(request);

      const name =
        body.name?.trim() ||
        [body.first_name?.trim(), body.last_name?.trim()]
          .filter(Boolean)
          .join(" ")
          .trim();

      if (!name) return json({ error: "name is required" }, 400);
      if (!body.email?.trim()) return json({ error: "email is required" }, 400);
      if (!body.company?.trim() && !body.company_id) {
        return json({ error: "company or company_id is required" }, 400);
      }
      if (!body.source?.trim()) return json({ error: "source is required" }, 400);

      const companyName =
        body.company?.trim() ||
        (
          await sql`
            SELECT name FROM companies
            WHERE id = ${body.company_id}
            LIMIT 1
          `
        )[0]?.name;

      if (!companyName) return json({ error: "company not found" }, 400);

      const now = Date.now();

      const rows = await sql`
        INSERT INTO contacts
          (name,email,company,phone,source,lead_id,company_id,job_title,website,notes,tags,created_at,updated_at)
        VALUES
          (${name},${body.email.trim()},${companyName},${body.phone ?? null},
           ${body.source.trim()},${body.lead_id ?? null},${body.company_id ?? null},
           ${body.job_title ?? null},${body.website ?? null},${body.notes ?? null},
           ${body.tags ?? null},${now},${now})
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
