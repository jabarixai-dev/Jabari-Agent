import type { Config } from "@netlify/functions";
import { sql } from "./lib/db";
import { json } from "./lib/http";

export default async function handler(request: Request) {
  if (request.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const [contacts, leads, opportunities, recentActivity] = await Promise.all([
      sql`SELECT COUNT(*)::int AS count FROM contacts`,
      sql`SELECT COUNT(*)::int AS count FROM leads WHERE status IN ('new', 'contacted', 'qualified')`,
      sql`SELECT COUNT(*)::int AS count FROM opportunities`,
      sql`
        SELECT
          id,
          type,
          title,
          detail AS description,
          to_timestamp(created_at / 1000.0) AS occurred_at
        FROM crm_activities
        ORDER BY created_at DESC
        LIMIT 8
      `,
    ]);

    const [recentContacts, recentLeads, recentOpportunities] = await Promise.all([
      sql`
        SELECT
          id,
          split_part(name, ' ', 1) AS first_name,
          NULLIF(split_part(name, ' ', 2), '') AS last_name,
          email,
          job_title,
          'active' AS status,
          to_timestamp(created_at / 1000.0) AS created_at
        FROM contacts
        ORDER BY created_at DESC
        LIMIT 5
      `,
      sql`
        SELECT
          id,
          name AS title,
          NULL::text AS stage,
          status,
          NULL::numeric AS score,
          NULL::numeric AS estimated_value,
          to_timestamp(created_at / 1000.0) AS created_at
        FROM leads
        ORDER BY created_at DESC
        LIMIT 5
      `,
      sql`
        SELECT
          id,
          name,
          stage,
          'open' AS status,
          value,
          probability,
          to_timestamp(expected_close_at / 1000.0) AS expected_close_date,
          to_timestamp(created_at / 1000.0) AS created_at
        FROM opportunities
        ORDER BY created_at DESC
        LIMIT 5
      `,
    ]);

    return json({
      metrics: {
        contacts: contacts[0]?.count ?? 0,
        openLeads: leads[0]?.count ?? 0,
        openOpportunities: opportunities[0]?.count ?? 0,
        tasksDue: 0,
      },
      recentContacts,
      recentLeads,
      recentOpportunities,
      activity: recentActivity,
    });
  } catch (error) {
    console.error("Dashboard query failed", error);

    const message =
      error instanceof Error ? error.message : "Unknown database error";

    return json(
      {
        error: "Unable to load dashboard data",
        diagnostic: message,
      },
      500,
    );
  }
}

export const config: Config = { path: "/api/dashboard" };
