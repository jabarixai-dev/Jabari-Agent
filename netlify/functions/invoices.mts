import type { Config } from "@netlify/functions";
import { sql } from "./lib/db";
import { json, methodNotAllowed } from "./lib/http";

const now = () => Date.now();

export default async function handler(request: Request) {
  try {
    if (request.method === "GET") {
      const rows = await sql`
        SELECT i.*, COALESCE(COUNT(DISTINCT ii.id), 0)::int AS item_count,
          COALESCE(SUM(DISTINCT CASE WHEN p.status = 'success' THEN p.amount ELSE 0 END), 0) AS paid_amount
        FROM invoices i
        LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
        LEFT JOIN paystack_payments p ON p.invoice_id = i.id
        GROUP BY i.id ORDER BY i.created_at DESC LIMIT 200
      `;
      return json({ data: rows });
    }
    if (request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const customerName = String(body.customer_name ?? "").trim();
      const customerEmail = String(body.customer_email ?? "").trim();
      const currency = String(body.currency ?? "NGN").trim().toUpperCase();
      const notes = String(body.notes ?? "").trim();
      const items = Array.isArray(body.items) ? body.items : [];
      const subtotal = items.reduce((sum:number, item:any) => sum + ((Number(item.quantity)||0) * (Number(item.unit_price)||0)), 0);
      const total = Number(body.total ?? subtotal);
      if (!customerName || !customerEmail) return json({ error: "Customer name and email are required" }, 400);
      if (!Number.isFinite(total) || total < 0) return json({ error: "Invalid invoice total" }, 400);
      const stamp = now();
      const prefix = `INV-${new Date(stamp).getFullYear()}`;
      const countRows = await sql`SELECT COUNT(*)::int AS count FROM invoices WHERE number LIKE ${prefix + '-%'}`;
      const number = `${prefix}-${String(Number(countRows[0]?.count ?? 0)+1).padStart(4,"0")}`;
      const invoiceRows = await sql`
        INSERT INTO invoices (number, customer_name, customer_email, contact_id, lead_id, opportunity_id, status, currency, subtotal, total, due_at, notes, created_at, updated_at)
        VALUES (${number}, ${customerName}, ${customerEmail}, ${body.contact_id || null}, ${body.lead_id || null}, ${body.opportunity_id || null}, 'draft', ${currency}, ${subtotal}, ${total}, ${body.due_at ? Number(body.due_at) : null}, ${notes}, ${stamp}, ${stamp}) RETURNING *
      `;
      const invoice = invoiceRows[0];
      for (const item of items) {
        const description = String(item.description ?? "").trim();
        const quantity = Number(item.quantity)||0; const unitPrice = Number(item.unit_price)||0;
        if (!description || quantity <= 0) continue;
        await sql`INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, amount, created_at) VALUES (${invoice.id}, ${item.product_id || null}, ${description}, ${quantity}, ${unitPrice}, ${quantity*unitPrice}, ${stamp})`;
      }
      return json({ data: invoice }, 201);
    }
    if (request.method === "PATCH") {
      const body = await request.json().catch(() => ({})); const id = String(body.id ?? "").trim(); const status = String(body.status ?? "").trim();
      if (!id || !status) return json({ error: "Invoice id and status are required" }, 400);
      const stamp=now(); const rows=await sql`UPDATE invoices SET status=${status}, paid_at=${status === "paid" ? stamp : null}, updated_at=${stamp} WHERE id=${id} RETURNING *`;
      if (!rows.length) return json({ error:"Invoice not found" },404); return json({data:rows[0]});
    }
    return methodNotAllowed(["GET","POST","PATCH"]);
  } catch (error) { console.error(error); return json({ error: "Unable to process invoices" }, 500); }
}
export const config: Config = { path: "/api/invoices" };
