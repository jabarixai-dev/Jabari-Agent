import { neon } from '@neondatabase/serverless';

const databaseUrl = Netlify.env.get('DATABASE_URL');

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured');
}

export const sql = neon(databaseUrl);
