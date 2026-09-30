import type { Config } from "@netlify/functions";
import { sql } from "./lib/db";
import { json, methodNotAllowed, readJson } from "./lib/http";

export default async function handler(request: Request) {
  try {
    if (request.method === "GET") {
      const url = new URL(request.url);
      const threadId = url.searchParams.get("thread_id");
      if (threadId) {
        const rows = await sql`
          SELECT id, thread_id, message_id, role, message, "order", created_at
          FROM chat_messages
          WHERE thread_id = ${threadId}
          ORDER BY "order" ASC, created_at ASC
        `;
        return json({ data: rows });
      }
      const rows = await sql`
        SELECT
          t.id AS thread_id, t.title, t.created_at, t.updated_at,
          l.id AS lead_id, l.name AS lead_name, l.email AS lead_email, l.company AS lead_company,
          lm.message, lm.role AS last_role, lm.created_at AS last_message_at
        FROM chat_threads t
        LEFT JOIN leads l ON l.thread_id = t.id
        LEFT JOIN LATERAL (
          SELECT message, role, created_at FROM chat_messages m
          WHERE m.thread_id = t.id
          ORDER BY m."order" DESC, m.created_at DESC LIMIT 1
        ) lm ON true
        ORDER BY COALESCE(lm.created_at, t.updated_at) DESC
        LIMIT 200
      `;
      return json({ data: rows });
    }

    if (request.method === "POST") {
      const body = await readJson<Record<string, unknown>>(request);
      const threadId = String(body.thread_id || "").trim();
      const content = String(body.message || "").trim();
      if (!threadId || !content) return json({ error: "thread_id and message are required" }, 400);

      const thread = await sql`SELECT id FROM chat_threads WHERE id = ${threadId} LIMIT 1`;
      if (!thread.length) return json({ error: "Conversation not found" }, 404);

      const orderRows = await sql`SELECT COALESCE(MAX("order"), -1) + 1 AS next_order FROM chat_messages WHERE thread_id = ${threadId}`;
      const nextOrder = Number(orderRows[0]?.next_order ?? 0);
      const now = Date.now();
      const rows = await sql`
        INSERT INTO chat_messages (thread_id, message_id, role, message, "order", created_at)
        VALUES (${threadId}, ${crypto.randomUUID()}, 'assistant', ${JSON.stringify({ text: content })}::jsonb, ${nextOrder}, ${now})
        RETURNING id, thread_id, message_id, role, message, "order", created_at
      `;
      await sql`UPDATE chat_threads SET updated_at = ${now} WHERE id = ${threadId}`;

      const leadRows = await sql`SELECT id FROM leads WHERE thread_id = ${threadId} LIMIT 1`;
      if (leadRows.length) {
        await sql`
          INSERT INTO crm_activities (lead_id, type, title, detail, created_at)
          VALUES (${leadRows[0].id}, 'message_sent', 'Outbound message sent', ${content}, ${now})
        `;
      }
      return json({ data: rows[0] }, 201);
    }

    return methodNotAllowed(["GET", "POST"]);
  } catch (error) {
    console.error(error);
    return json({ error: "Unable to process inbox conversation" }, 500);
  }
}

export const config: Config = { path: "/api/inbox" };
