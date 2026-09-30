import type { Config } from "@netlify/functions";
import { sql } from "./lib/db";
import { json } from "./lib/http";

export default async function handler(request: Request) {
  if (request.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const [contacts, leads, opportunities, tasks, activity] = await Promise.all([
      sql`SELECT COUNT(*)::int AS count FROM contacts`,
      sql`SELECT COUNT(*)::int AS count FROM leads WHERE status = 'open'`,
      sql`SELECT COUNT(*)::int AS count FROM opportunities WHERE status = 'open'`,
      sql`SELECT COUNT(*)::int AS count FROM tasks WHERE status <> 'completed' AND (due_at IS NULL OR due_at <= now() + interval '7 days')`,
      sql`
        SELECT id, type, title, description, occurred_at
        FROM activities
        ORDER BY occurred_at DESC
        LIMIT 8
      `,
    ]);

    const [recentContacts, recentLeads, recentOpportunities] = await Promise.all([
      sql`
        SELECT id, first_name, last_name, email, job_title, status, created_at
        FROM contacts
        ORDER BY created_at DESC
        LIMIT 5
      `,
      sql`
        SELECT id, title, stage, status, score, estimated_value, created_at
        FROM leads
        ORDER BY created_at DESC
        LIMIT 5
      `,
      sql`
        SELECT id, name, stage, status, value, probability, expected_close_date, created_at
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
        tasksDue: tasks[0]?.count ?? 0,
      },
      recentContacts,
      recentLeads,
      recentOpportunities,
      activity,
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

export const config: Config = { path: "/api/dashboard" };
