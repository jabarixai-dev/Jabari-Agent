export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  return await request.json() as T;
}

export function methodNotAllowed(methods: string[]) {
  return json({ error: `Method not allowed. Use: ${methods.join(", ")}` }, 405);
}
