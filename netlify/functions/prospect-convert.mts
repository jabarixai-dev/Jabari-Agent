import type { Config } from "@netlify/functions";
import { sql } from "./lib/db";
import { json, methodNotAllowed, readJson } from "./lib/http";

export default async function handler(request: Request) {
  if (request.method !== "POST") return methodNotAllowed(["POST"]);

  try {
    const body = await readJson<{
      prospect_id: string;
      company: string;
      company_id?: string;
      source?: string;
      job_title?: string;
      notes?: string;
    }>(request);

    if (!body.prospect_id?.trim()) return json({ error: "prospect_id is required" }, 400);
    if (!body.company?.trim() && !body.company_id) {
      return json({ error: "company or company_id is required" }, 400);
    }

    const prospectRows = await sql`
      SELECT id, name, contact_name, contact_email, contact_phone, url, pain_point, fit_reason
      FROM prospects
      WHERE id = ${body.prospect_id.trim()}
      LIMIT 1
    `;

    const prospect = prospectRows[0];
    if (!prospect) return json({ error: "prospect not found" }, 404);
    if (!prospect.contact_email) {
      return json({ error: "prospect has no contact email" }, 400);
    }

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
    const contactName = prospect.contact_name || prospect.name;

    const existing = await sql`
      SELECT id
      FROM contacts
      WHERE lower(email) = lower(${prospect.contact_email})
      LIMIT 1
    `;

    let contact;
    if (existing[0]) {
      const rows = await sql`
        UPDATE contacts
        SET company = ${companyName},
            company_id = ${body.company_id ?? null},
            phone = COALESCE(${prospect.contact_phone ?? null}, phone),
            source = COALESCE(${body.source?.trim() || "prospect"}, source),
            job_title = COALESCE(${body.job_title?.trim() || null}, job_title),
            notes = COALESCE(${body.notes?.trim() || null}, notes),
            updated_at = ${now}
        WHERE id = ${existing[0].id}
        RETURNING *
      `;
      contact = rows[0];
    } else {
      const rows = await sql`
        INSERT INTO contacts
          (name,email,company,phone,source,company_id,job_title,website,notes,created_at,updated_at)
        VALUES
          (${contactName},
           ${prospect.contact_email},
           ${companyName},
           ${prospect.contact_phone ?? null},
           ${body.source?.trim() || "prospect"},
           ${body.company_id ?? null},
           ${body.job_title?.trim() || null},
           ${prospect.url ?? null},
           ${body.notes?.trim() || prospect.pain_point || prospect.fit_reason || null},
           ${now},
           ${now})
        RETURNING *
      `;
      contact = rows[0];
    }

    await sql`
      UPDATE prospects
      SET contact_status = 'converted',
          contact_checked_at = ${now},
          updated_at = ${now}
      WHERE id = ${prospect.id}
    `;

    await sql`
      INSERT INTO crm_activities
        (contact_id,type,title,detail,created_at)
      VALUES
        (${contact.id},
         'prospect_conversion',
         'Prospect converted to contact',
         ${`Converted ${prospect.name} from prospecting into CRM contact.`},
         ${now})
    `;

    return json({ data: contact }, existing[0] ? 200 : 201);
  } catch (error) {
    console.error(error);
    return json({ error: "Unable to convert prospect" }, 500);
  }
}

export const config: Config = { path: "/api/prospects/convert" };
