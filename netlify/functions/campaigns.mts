import type { Config } from "@netlify/functions";
import { sql } from "./lib/db";
import { json, methodNotAllowed } from "./lib/http";

export default async function handler(request: Request) {
  try {
    if (request.method === "GET") {
      const rows = await sql`
        SELECT c.*,
          COALESCE(s.step_count, 0) AS step_count,
          COALESCE(e.enrollment_count, 0) AS enrollment_count,
          COALESCE(e.active_count, 0) AS active_count
        FROM campaigns c
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS step_count FROM campaign_steps cs WHERE cs.campaign_id = c.id
        ) s ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS enrollment_count,
                 COUNT(*) FILTER (WHERE ce.status NOT IN ('completed','stopped'))::int AS active_count
          FROM campaign_enrollments ce WHERE ce.campaign_id = c.id
        ) e ON true
        ORDER BY c.updated_at DESC
        LIMIT 200
      `;
      return json({ data: rows });
    }

    if (request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const name = String(body.name || "").trim();
      const description = String(body.description || "").trim();
      const status = String(body.status || "draft").trim();
      if (!name) return json({ error: "Campaign name is required" }, 400);

      const now = Date.now();
      const campaignRows = await sql`
        INSERT INTO campaigns (name, description, status, created_at, updated_at)
        VALUES (${name}, ${description}, ${status}, ${now}, ${now})
        RETURNING *
      `;
      const campaign = campaignRows[0];
      const steps = Array.isArray(body.steps) ? body.steps : [];
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i] || {};
        const bodyText = String(step.body || "").trim();
        if (!bodyText) continue;
        await sql`
          INSERT INTO campaign_steps (campaign_id, step_order, type, delay_minutes, subject, body, created_at)
          VALUES (${campaign.id}, ${i + 1}, ${String(step.type || "email")}, ${Math.max(0, Number(step.delay_minutes || 0))}, ${step.subject ? String(step.subject) : null}, ${bodyText}, ${now})
        `;
      }
      return json({ data: campaign }, 201);
    }

    return methodNotAllowed(["GET", "POST"]);
  } catch (error) {
    console.error(error);
    return json({ error: "Unable to load campaigns" }, 500);
  }
}

export const config: Config = { path: "/api/campaigns" };
