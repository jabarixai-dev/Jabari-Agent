import type { Config } from "@netlify/functions";
import { sql } from "./lib/db";
import { json, methodNotAllowed, readJson } from "./lib/http";

export default async function handler(request: Request) {
  try {
    if (request.method === "GET") {
      const rows = await sql`SELECT * FROM companies ORDER BY created_at DESC LIMIT 200`;
      return json({ data: rows });
    }
    if (request.method === "POST") {
      const body = await readJson<Record<string, any>>(request);
      const name = String(body.name || "").trim();
      if (!name) return json({ error: "name is required" }, 400);
      const now = Date.now();
      const rows = await sql`INSERT INTO companies (name,website,industry,notes,created_at,updated_at) VALUES (${name},${body.website ? String(body.website).trim() : null},${body.industry ? String(body.industry).trim() : null},${body.notes ? String(body.notes).trim() : null},${now},${now}) RETURNING *`;
      return json({ data: rows[0] }, 201);
    }
    if (request.method === "PATCH") {
      const body = await readJson<Record<string, any>>(request);
      const id = String(body.id || "").trim();
      if (!id) return json({ error: "id is required" }, 400);
      const current = await sql`SELECT * FROM companies WHERE id=${id} LIMIT 1`;
      if (!current.length) return json({ error: "Company not found" }, 404);
      const name = body.name !== undefined ? String(body.name).trim() : current[0].name;
      if (!name) return json({ error: "name is required" }, 400);
      const rows = await sql`UPDATE companies SET name=${name}, website=${body.website !== undefined ? (body.website ? String(body.website).trim() : null) : current[0].website}, industry=${body.industry !== undefined ? (body.industry ? String(body.industry).trim() : null) : current[0].industry}, notes=${body.notes !== undefined ? (body.notes ? String(body.notes).trim() : null) : current[0].notes}, updated_at=${Date.now()} WHERE id=${id} RETURNING *`;
      return json({ data: rows[0] });
    }
    return methodNotAllowed(["GET", "POST", "PATCH"]);
  } catch (error) {
    console.error(error);
    return json({ error: "Unable to process companies request" }, 500);
  }
}
export const config: Config = { path: "/api/companies" };
