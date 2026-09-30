import type { Config } from "@netlify/functions";
import { sql } from "./lib/db";
import { json, methodNotAllowed } from "./lib/http";

const stages = ["qualified", "proposal", "negotiation", "closed_won", "closed_lost"];
export default async function handler(request: Request) {
  try {
    if (request.method === "GET") {
      const rows = await sql`SELECT o.*, c.name AS company_name, l.name AS lead_name FROM opportunities o LEFT JOIN companies c ON c.id=o.company_id LEFT JOIN leads l ON l.id=o.lead_id ORDER BY o.created_at DESC LIMIT 200`;
      return json({ data: rows });
    }
    if (request.method === "POST") {
      const body = await request.json();
      if (!body.lead_id || !body.name) return json({ error: "lead_id and name are required" }, 400);
      const lead = await sql`SELECT id FROM leads WHERE id=${String(body.lead_id)} LIMIT 1`;
      if (!lead.length) return json({ error: "Lead not found" }, 404);
      const stage = stages.includes(body.stage) ? body.stage : "qualified";
      const now = Date.now();
      const rows = await sql`INSERT INTO opportunities (lead_id,contact_id,company_id,name,stage,value,probability,expected_close_at,owner,notes,created_at,updated_at) VALUES (${body.lead_id},${body.contact_id||null},${body.company_id||null},${String(body.name).trim()},${stage},${Number(body.value)||0},${Number(body.probability)||0},${body.expected_close_at?Number(body.expected_close_at):null},${body.owner||"unassigned"},${body.notes||""},${now},${now}) RETURNING *`;
      await sql`INSERT INTO crm_activities (contact_id,lead_id,type,title,detail,created_at) VALUES (${body.contact_id||null},${body.lead_id},'opportunity_created','Opportunity created',${`Opportunity “${String(body.name).trim()}” created in ${stage.replaceAll('_',' ')}.`},${now})`;
      return json({ data: rows[0] }, 201);
    }
    if (request.method === "PATCH") {
      const body = await request.json();
      const id = String(body.id||"").trim();
      if (!id) return json({ error: "id is required" }, 400);
      if (body.stage && !stages.includes(body.stage)) return json({ error: "Invalid opportunity stage" }, 400);
      const before = await sql`SELECT * FROM opportunities WHERE id=${id} LIMIT 1`;
      if (!before.length) return json({ error: "Opportunity not found" }, 404);
      const old = before[0];
      const now = Date.now();
      const rows = await sql`UPDATE opportunities SET stage=COALESCE(${body.stage||null},stage), probability=COALESCE(${body.probability!=null?Number(body.probability):null},probability), value=COALESCE(${body.value!=null?Number(body.value):null},value), owner=COALESCE(${body.owner||null},owner), notes=COALESCE(${body.notes!==undefined?String(body.notes):null},notes), expected_close_at=COALESCE(${body.expected_close_at!=null?Number(body.expected_close_at):null},expected_close_at), updated_at=${now} WHERE id=${id} RETURNING *`;
      if (body.stage && body.stage !== old.stage) {
        await sql`INSERT INTO crm_activities (contact_id,lead_id,type,title,detail,created_at) VALUES (${old.contact_id||null},${old.lead_id},'opportunity_stage_changed','Opportunity stage changed',${`${old.name}: ${String(old.stage).replaceAll('_',' ')} → ${String(body.stage).replaceAll('_',' ')}.`},${now})`;
      }
      return json({ data: rows[0] });
    }
    return methodNotAllowed(["GET", "POST", "PATCH"]);
  } catch (error) {
    console.error(error);
    return json({ error: "Unable to process opportunities" }, 500);
  }
}
export const config: Config = { path: "/api/opportunities" };
