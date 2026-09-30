# Jabari Agent Database

Neon PostgreSQL is the database layer.

## Migration order

1. `001_initial_schema.sql`
2. `002_updated_at.sql`

Run migrations against the Jabari Agent Neon database using your preferred PostgreSQL migration workflow.

Never commit real database credentials. Use environment variables such as `DATABASE_URL`.
