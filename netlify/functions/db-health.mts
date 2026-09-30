import type { Config } from '@netlify/functions';
import { sql } from './lib/db.mts';

export default async function () {
  try {
    const result = await sql`SELECT now() AS database_time`;

    return new Response(
      JSON.stringify({
        ok: true,
        service: 'jabari-agent',
        database: 'connected',
        databaseTime: result[0]?.database_time ?? null,
      }),
      { headers: { 'content-type': 'application/json' } },
    );
  } catch (error) {
    console.error('Database health check failed', error);

    return new Response(
      JSON.stringify({
        ok: false,
        service: 'jabari-agent',
        database: 'error',
      }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }
}

export const config: Config = { path: '/api/db-health' };
