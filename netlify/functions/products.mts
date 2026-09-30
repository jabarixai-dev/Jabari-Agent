import type { Config } from "@netlify/functions";
import { sql } from "./lib/db";
import { json, methodNotAllowed } from "./lib/http";
const now=()=>Date.now();
export default async function handler(request:Request){
  try{
    if(request.method==="GET"){
      const rows=await sql`SELECT * FROM products ORDER BY created_at DESC LIMIT 200`;
      return json({data:rows});
    }
    if(request.method==="POST"){
      const body=await request.json().catch(()=>({}));
      const name=String(body.name??"").trim(); const description=String(body.description??"").trim(); const currency=String(body.currency??"NGN").trim().toUpperCase(); const price=Number(body.price);
      if(!name) return json({error:"Product name is required"},400);
      if(!Number.isFinite(price)||price<0) return json({error:"Invalid product price"},400);
      const stamp=now(); const rows=await sql`INSERT INTO products (name,description,price,currency,status,created_at,updated_at) VALUES (${name},${description},${price},${currency},'active',${stamp},${stamp}) RETURNING *`;
      return json({data:rows[0]},201);
    }
    if(request.method==="PATCH"){
      const body=await request.json().catch(()=>({})); const id=String(body.id??"").trim(); const status=String(body.status??"").trim();
      if(!id||!status) return json({error:"Product id and status are required"},400);
      const stamp=now(); const rows=await sql`UPDATE products SET status=${status},updated_at=${stamp} WHERE id=${id} RETURNING *`;
      if(!rows.length) return json({error:"Product not found"},404); return json({data:rows[0]});
    }
    return methodNotAllowed(["GET","POST","PATCH"]);
  }catch(error){console.error(error);return json({error:"Unable to process products"},500)}
}
export const config:Config={path:"/api/products"};
