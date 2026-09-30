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
        ORDER BY c.created_at DESC LIMIT 200
      `;
      return json({ data: rows });
    }
    if (request.method === "POST") {
      const body = await readJson<Record<string, any>>(request);
      const name = String(body.name || [body.first_name, body.last_name].filter(Boolean).join(" ")).trim();
      const email = String(body.email || "").trim();
      const companyId = body.company_id ? String(body.company_id).trim() : null;
      let company = String(body.company || "").trim();
      if (!company && companyId) {
        const c = await sql`SELECT name FROM companies WHERE id=${companyId} LIMIT 1`;
        company = c[0]?.name || "";
      }
      const source = String(body.source || "manual").trim();
      if (!name || !email || !company || !source) return json({ error: "name, email, company and source are required" }, 400);
      const now = Date.now();
      const rows = await sql`
        INSERT INTO contacts (name,email,company,phone,source,lead_id,company_id,job_title,website,notes,tags,created_at,updated_at)
        VALUES (${name},${email},${company},${body.phone ? String(body.phone).trim() : null},${source},${body.lead_id ? String(body.lead_id).trim() : null},${companyId},${body.job_title ? String(body.job_title).trim() : null},${body.website ? String(body.website).trim() : null},${body.notes ? String(body.notes).trim() : null},${body.tags ?? null},${now},${now})
        RETURNING *
      `;
      return json({ data: rows[0] }, 201);
    }
    if (request.method === "PATCH") {
      const body = await readJson<Record<string, any>>(request);
      const id = String(body.id || "").trim();
      if (!id) return json({ error: "id is required" }, 400);
      const current = await sql`SELECT * FROM contacts WHERE id=${id} LIMIT 1`;
      if (!current.length) return json({ error: "Contact not found" }, 404);
      const name = body.name !== undefined ? String(body.name).trim() : current[0].name;
      const email = body.email !== undefined ? String(body.email).trim() : current[0].email;
      let company = body.company !== undefined ? String(body.company).trim() : current[0].company;
      const companyId = body.company_id !== undefined ? (body.company_id ? String(body.company_id).trim() : null) : current[0].company_id;
      if (!company && companyId) { const c = await sql`SELECT name FROM companies WHERE id=${companyId} LIMIT 1`; company = c[0]?.name || ""; }
      if (!name || !email || !company) return json({ error: "name, email and company are required" }, 400);
      const rows = await sql`
        UPDATE contacts SET name=${name}, email=${email}, company=${company}, phone=${body.phone !== undefined ? (body.phone ? String(body.phone).trim() : null) : current[0].phone}, source=${body.source !== undefined ? String(body.source).trim() : current[0].source}, company_id=${companyId}, job_title=${body.job_title !== undefined ? (body.job_title ? String(body.job_title).trim() : null) : current[0].job_title}, website=${body.website !== undefined ? (body.website ? String(body.website).trim() : null) : current[0].website}, notes=${body.notes !== undefined ? (body.notes ? String(body.notes).trim() : null) : current[0].notes}, tags=${body.tags !== undefined ? body.tags : current[0].tags}, updated_at=${Date.now()} WHERE id=${id}
        RETURNING *
      `;
      return json({ data: rows[0] });
    }
    return methodNotAllowed(["GET", "POST", "PATCH"]);
  } catch (error) {
    console.error(error);
    return json({ error: "Unable to process contacts request" }, 500);
  }
}
export const config: Config = { path: "/api/contacts" };
