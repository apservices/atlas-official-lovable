We will not fix these 250 errors individually.

The project lost its fake data layer from Lovable, and now pages are trying to call functions that no longer exist.

Your task is to rebuild a clean data access layer based ONLY on Supabase.

1) Create a new file:

lib/repositories.ts

2) Implement real Supabase functions for the operations the pages need, such as:

- getModels
- getModelById
- getForges
- getForgeById
- getCapturesByForge
- getLicenses
- getAuditLogs
- getAssets
- getSystemHealthMetrics

Each function must directly query Supabase using:

src/lib/supabase/client.ts
and types from:
src/types/supabase.ts

3) Then refactor all pages and components to use these repository functions instead of the deleted data-store and system-logger.

4) Do not recreate old abstractions.
5) Do not create fake types.
6) Continue until:

pnpm tsc --noEmit

returns zero errors.
