import type { Handler } from "@netlify/functions";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

type OutreachPayload = {
  id?: string;
  lead_id?: string;
  subject?: string;
  body_text?: string;
  status?: string;
};

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

function now() {
  return Date.now();
}

function normalizeDraft(row: any) {
  return {
    id: String(row.id),
    lead_id: String(row.lead_id),
    subject: row.subject || "",
    body_text: row.body_text || "",
    status: row.status || "draft",
    sent_at: row.sent_at
      ? Number(row.sent_at)
      : undefined,
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),

    lead_name: row.lead_name || undefined,
    lead_email: row.lead_email || undefined,
    lead_company: row.lead_company || undefined,

    event_count: Number(row.event_count || 0),
    last_event_type:
      row.last_event_type || undefined,
    last_event_at: row.last_event_at
      ? Number(row.last_event_at)
      : undefined,
  };
}

const handler: Handler = async (event) => {
  try {
    const method = event.httpMethod.toUpperCase();

    /*
     * GET
     *
     * GET /api/outreach
     * Returns all outreach drafts.
     *
     * GET /api/outreach?draft_id=123
     * Returns one draft plus its events.
     */
    if (method === "GET") {
      const draftId =
        event.queryStringParameters?.draft_id;

      if (draftId) {
        const rows = await sql`
          SELECT
            d.id,
            d.lead_id,
            d.subject,
            d.body_text,
            d.status,
            d.sent_at,
            d.created_at,
            d.updated_at,
            l.name AS lead_name,
            l.email AS lead_email,
            l.company AS lead_company,
            COUNT(e.id)::int AS event_count,
            (
              SELECT e2.kind
              FROM outreach_events e2
              WHERE e2.draft_id = d.id
              ORDER BY e2.created_at DESC
              LIMIT 1
            ) AS last_event_type,
            (
              SELECT e3.created_at
              FROM outreach_events e3
              WHERE e3.draft_id = d.id
              ORDER BY e3.created_at DESC
              LIMIT 1
            ) AS last_event_at
          FROM outreach_drafts d
          LEFT JOIN leads l
            ON l.id = d.lead_id
          LEFT JOIN outreach_events e
            ON e.draft_id = d.id
          WHERE d.id = ${draftId}
          GROUP BY
            d.id,
            l.name,
            l.email,
            l.company
          LIMIT 1
        `;

        if (!rows.length) {
          return json(404, {
            error: "Outreach draft not found",
          });
        }

        const events = await sql`
          SELECT
            id,
            kind,
            created_at
          FROM outreach_events
          WHERE draft_id = ${draftId}
          ORDER BY created_at DESC
        `;

        return json(200, {
          data: normalizeDraft(rows[0]),
          events: events.map((row: any) => ({
            id: String(row.id),
            kind: row.kind,
            created_at: Number(row.created_at),
          })),
        });
      }

      const rows = await sql`
        SELECT
          d.id,
          d.lead_id,
          d.subject,
          d.body_text,
          d.status,
          d.sent_at,
          d.created_at,
          d.updated_at,
          l.name AS lead_name,
          l.email AS lead_email,
          l.company AS lead_company,
          COUNT(e.id)::int AS event_count,
          (
            SELECT e2.kind
            FROM outreach_events e2
            WHERE e2.draft_id = d.id
            ORDER BY e2.created_at DESC
            LIMIT 1
          ) AS last_event_type,
          (
            SELECT e3.created_at
            FROM outreach_events e3
            WHERE e3.draft_id = d.id
            ORDER BY e3.created_at DESC
            LIMIT 1
          ) AS last_event_at
        FROM outreach_drafts d
        LEFT JOIN leads l
          ON l.id = d.lead_id
        LEFT JOIN outreach_events e
          ON e.draft_id = d.id
        GROUP BY
          d.id,
          l.name,
          l.email,
          l.company
        ORDER BY d.updated_at DESC
      `;

      return json(200, {
        data: rows.map(normalizeDraft),
      });
    }

    /*
     * POST
     *
     * Creates a new outreach draft.
     */
    if (method === "POST") {
      const payload =
        JSON.parse(event.body || "{}") as OutreachPayload;

      const leadId =
        payload.lead_id?.trim();

      const subject =
        payload.subject?.trim();

      const bodyText =
        payload.body_text?.trim();

      const status =
        payload.status?.trim() || "draft";

      if (
        !leadId ||
        !subject ||
        !bodyText
      ) {
        return json(400, {
          error:
            "lead_id, subject and body_text are required.",
        });
      }

      if (
        !["draft", "queued"].includes(status)
      ) {
        return json(400, {
          error:
            "Invalid outreach status.",
        });
      }

      const lead = await sql`
        SELECT id
        FROM leads
        WHERE id = ${leadId}
        LIMIT 1
      `;

      if (!lead.length) {
        return json(404, {
          error: "Lead not found.",
        });
      }

      const id = crypto.randomUUID();
      const timestamp = now();

      await sql`
        INSERT INTO outreach_drafts (
          id,
          lead_id,
          subject,
          body_text,
          status,
          created_at,
          updated_at
        )
        VALUES (
          ${id},
          ${leadId},
          ${subject},
          ${bodyText},
          ${status},
          ${timestamp},
          ${timestamp}
        )
      `;

      await sql`
        INSERT INTO outreach_events (
          id,
          draft_id,
          kind,
          created_at
        )
        VALUES (
          ${crypto.randomUUID()},
          ${id},
          ${status === "queued"
            ? "queued"
            : "created"},
          ${timestamp}
        )
      `;

      const rows = await sql`
        SELECT
          d.id,
          d.lead_id,
          d.subject,
          d.body_text,
          d.status,
          d.sent_at,
          d.created_at,
          d.updated_at,
          l.name AS lead_name,
          l.email AS lead_email,
          l.company AS lead_company,
          COUNT(e.id)::int AS event_count
        FROM outreach_drafts d
        LEFT JOIN leads l
          ON l.id = d.lead_id
        LEFT JOIN outreach_events e
          ON e.draft_id = d.id
        WHERE d.id = ${id}
        GROUP BY
          d.id,
          l.name,
          l.email,
          l.company
        LIMIT 1
      `;

      return json(201, {
        data: normalizeDraft(rows[0]),
      });
    }

    /*
     * PATCH
     *
     * Updates an existing outreach draft.
     */
    if (method === "PATCH") {
      const payload =
        JSON.parse(event.body || "{}") as OutreachPayload;

      const id =
        payload.id?.trim();

      const leadId =
        payload.lead_id?.trim();

      const subject =
        payload.subject?.trim();

      const bodyText =
        payload.body_text?.trim();

      const status =
        payload.status?.trim() || "draft";

      if (!id) {
        return json(400, {
          error: "Draft id is required.",
        });
      }

      if (
        !leadId ||
        !subject ||
        !bodyText
      ) {
        return json(400, {
          error:
            "lead_id, subject and body_text are required.",
        });
      }

      if (
        !["draft", "queued"].includes(status)
      ) {
        return json(400, {
          error:
            "Invalid outreach status.",
        });
      }

      const existing = await sql`
        SELECT id, status
        FROM outreach_drafts
        WHERE id = ${id}
        LIMIT 1
      `;

      if (!existing.length) {
        return json(404, {
          error: "Outreach draft not found.",
        });
      }

      const lead = await sql`
        SELECT id
        FROM leads
        WHERE id = ${leadId}
        LIMIT 1
      `;

      if (!lead.length) {
        return json(404, {
          error: "Lead not found.",
        });
      }

      const timestamp = now();

      await sql`
        UPDATE outreach_drafts
        SET
          lead_id = ${leadId},
          subject = ${subject},
          body_text = ${bodyText},
          status = ${status},
          updated_at = ${timestamp}
        WHERE id = ${id}
      `;

      /*
       * Only record a new event when the status
       * changes to queued.
       */
      if (
        status === "queued" &&
        existing[0].status !== "queued"
      ) {
        await sql`
          INSERT INTO outreach_events (
            id,
            draft_id,
            kind,
            created_at
          )
          VALUES (
            ${crypto.randomUUID()},
            ${id},
            'queued',
            ${timestamp}
          )
        `;
      }

      const rows = await sql`
        SELECT
          d.id,
          d.lead_id,
          d.subject,
          d.body_text,
          d.status,
          d.sent_at,
          d.created_at,
          d.updated_at,
          l.name AS lead_name,
          l.email AS lead_email,
          l.company AS lead_company,
          COUNT(e.id)::int AS event_count
        FROM outreach_drafts d
        LEFT JOIN leads l
          ON l.id = d.lead_id
        LEFT JOIN outreach_events e
          ON e.draft_id = d.id
        WHERE d.id = ${id}
        GROUP BY
          d.id,
          l.name,
          l.email,
          l.company
        LIMIT 1
      `;

      return json(200, {
        data: normalizeDraft(rows[0]),
      });
    }

    return json(405, {
      error: "Method not allowed.",
    });
  } catch (error) {
    console.error("Outreach API error:", error);

    return json(500, {
      error:
        error instanceof Error
          ? error.message
          : "Internal server error.",
    });
  }
};

export { handler };
