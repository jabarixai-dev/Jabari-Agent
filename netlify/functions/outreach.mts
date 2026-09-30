import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not configured");
const sql = neon(databaseUrl);

export default async function handler(request: Request) {
  try {
    const url = new URL(request.url);
    const draftId = url.searchParams.get("draft_id");

    if (request.method === "GET") {
      if (draftId) {
        const events = await sql`
          SELECT id, kind, lead_id, prospect_id, draft_id, metadata, created_at
          FROM outreach_events
          WHERE draft_id = ${draftId}
          ORDER BY created_at DESC
          LIMIT 100
        `;
        return Response.json({ events });
      }

      const rows = await sql`
        SELECT
          d.id, d.lead_id, d.subject, d.body_text, d.status, d.sent_at,
          d.created_at, d.updated_at,
          l.name AS lead_name, l.email AS lead_email, l.company AS lead_company,
          COUNT(e.id)::int AS event_count,
          MAX(e.created_at) AS last_event_at,
          (ARRAY_AGG(e.kind ORDER BY e.created_at DESC))[1] AS last_event_type
        FROM outreach_drafts d
        JOIN leads l ON l.id = d.lead_id
        LEFT JOIN outreach_events e ON e.draft_id = d.id
        GROUP BY d.id, l.name, l.email, l.company
        ORDER BY d.updated_at DESC
        LIMIT 200
      `;
      return Response.json({ data: rows });
    }

    const body = await request.json();

    if (request.method === "POST") {
      const { lead_id, subject, body_text, status = "draft" } = body;

      if (!lead_id || !subject?.trim() || !body_text?.trim()) {
        return Response.json(
          { error: "lead_id, subject and body_text are required" },
          { status: 400 }
        );
      }

      const lead = await sql`
        SELECT id FROM leads WHERE id = ${lead_id} LIMIT 1
      `;
      if (!lead.length) {
        return Response.json({ error: "Lead not found" }, { status: 404 });
      }

      const now = Date.now();
      const id = crypto.randomUUID();

      const rows = await sql`
        INSERT INTO outreach_drafts
          (id, lead_id, subject, body_text, status, created_at, updated_at)
        VALUES
          (${id}, ${lead_id}, ${subject.trim()}, ${body_text.trim()}, ${status}, ${now}, ${now})
        RETURNING *
      `;

      await sql`
        INSERT INTO outreach_events
          (id, kind, lead_id, draft_id, metadata, created_at)
        VALUES
          (${crypto.randomUUID()}, 'draft_created', ${lead_id}, ${id},
           ${JSON.stringify({ status })}::jsonb, ${now})
      `;

      return Response.json({ data: rows[0] }, { status: 201 });
    }

    if (request.method === "PATCH") {
      const { id, lead_id, subject, body_text, status } = body;

      if (!id) {
        return Response.json({ error: "id is required" }, { status: 400 });
      }

      const existing = await sql`
        SELECT id FROM outreach_drafts WHERE id = ${id} LIMIT 1
      `;
      if (!existing.length) {
        return Response.json({ error: "Draft not found" }, { status: 404 });
      }

      const now = Date.now();

      const rows = await sql`
        UPDATE outreach_drafts
        SET
          lead_id = COALESCE(${lead_id || null}, lead_id),
          subject = COALESCE(${subject || null}, subject),
          body_text = COALESCE(${body_text || null}, body_text),
          status = COALESCE(${status || null}, status),
          updated_at = ${now}
        WHERE id = ${id}
        RETURNING *
      `;

      await sql`
        INSERT INTO outreach_events
          (id, kind, lead_id, draft_id, metadata, created_at)
        VALUES
          (${crypto.randomUUID()},
           ${status === "queued" ? "queued" : "draft_updated"},
           ${rows[0].lead_id}, ${id},
           ${JSON.stringify({ status: rows[0].status })}::jsonb,
           ${now})
      `;

      return Response.json({ data: rows[0] });
    }

    return Response.json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Outreach request failed" },
      { status: 500 }
    );
  }
}
