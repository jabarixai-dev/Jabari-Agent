import type { Config } from "@netlify/functions";
import { sql } from "./lib/db.mts";
import { json, methodNotAllowed, readJson } from "./lib/http.mts";

export default async function handler(request: Request) {
  try {
    if (request.method === "GET") {
      const rows = await sql`
        SELECT * FROM companies ORDER BY created_at DESC LIMIT 200
      `;
      return json({ data: rows });
    }

    if (request.method === "POST") {
      const body = await readJson<{
        name: string; domain?: string; industry?: string; phone?: string; email?: string;
        website?: string; address?: string; notes?: string; owner_id?: string;
      }>(request);

      if (!body.name?.trim()) return json({ error: "name is required" }, 400);

      const rows = await sql`
        INSERT INTO companies
          (name,domain,industry,phone,email,website,address,notes,owner_id)
        VALUES
          (${body.name.trim()},${body.domain ?? null},${body.industry ?? null},
           ${body.phone ?? null},${body.email ?? null},${body.website ?? null},
           ${body.address ?? null},${body.notes ?? null},${body.owner_id ?? null})
        RETURNING *
      `;
      return json({ data: rows[0] }, 201);
    }

    return methodNotAllowed(["GET", "POST"]);
  } catch (error) {
    console.error(error);
    return json({ error: "Unable to process companies request" }, 500);
  }
}

export const config: Config = { path: "/api/companies" };
