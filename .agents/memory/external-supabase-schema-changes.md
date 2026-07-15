---
name: External Supabase schema changes
description: The agent cannot run DDL directly against a user's external (bring-your-own) Supabase project; migrations must be handed to the user to run.
---

For projects using a user-provided Supabase project (not a Replit-managed connector), the agent only has the project URL, anon key, and service-role key as secrets — never the Postgres database password. The service-role key authorizes PostgREST/Storage REST calls (bypassing RLS) but does not allow arbitrary SQL/DDL execution; there's no `exec_sql`-style RPC by default, and the Supabase Management API (which could run SQL) needs a separate personal access token the agent doesn't have.

**Why:** Needed to add a new column (`products.images`) to support a feature; confirmed via a REST probe (`GET /rest/v1/products?select=<col>`) that the column didn't exist, and had no way to run `ALTER TABLE` programmatically.

**How to apply:** When a feature needs a schema change on an external Supabase DB, add the migration to the project's existing "safe to re-run" SQL file/setup flow (e.g. `supabase/schema.sql`, a `/setup` page) and clearly tell the user the exact SQL to run in the Supabase SQL editor. Don't assume the service-role key can apply DDL — verify column/table existence via a lightweight REST probe before building a feature that depends on it.
