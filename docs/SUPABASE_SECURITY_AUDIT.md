# Supabase and AI security audit — development branch

## Audit status

**Repository-side review completed. Live Supabase database inspection is pending connection to the correct Supabase project.**

The repository currently contains no checked-in SQL migration history. The browser app expects the `reports` table to expose at least these fields:

- `id`, `submitted_by`, `kind`, `severity`, `description`
- `location_name`, `landmark`, `status`, `public_visible`, `created_at`
- Optional GPS fields used by the current branch: `latitude`, `longitude`, `location_accuracy_m`, `location_captured_at`

The app also assumes that its values for `kind`, `severity` and `status` match the live database enum or check-constraint values. These assumptions must be compared with the actual project before migrations or new modules are added.

## Read-only audit query

Run `supabase/audit/READ_ONLY_SCHEMA_AUDIT.sql` in the Supabase SQL Editor. It lists public columns, constraints, RLS flags, policies, enum labels, functions, triggers and storage buckets/policies. It contains SELECT statements only.

Do not apply schema changes until the query results have been reviewed. In particular:
- Confirm every report column and exact type/default.
- Confirm `submitted_by` ownership and all insert/select/update policies.
- Confirm public feed access is limited to deliberately published records and does not expose reporter identity or private descriptions.
- Confirm verification and authority-delivery functions cannot be called by ordinary users to approve or escalate their own reports.
- Confirm storage evidence is private by default and scoped to authorised access.
- Confirm any security-definer function has a safe `search_path` and explicit permission checks.

## Edge Function review

The current `streetsense-assistant` function:
- Requires a Bearer token and validates it with `auth.getUser()`.
- Uses the caller's authenticated context with the Supabase anon key.
- Keeps `GEMINI_API_KEY` in server-side environment variables.
- Limits the message to 1,800 characters and history to the last eight bounded messages.
- Has no application-level per-user rate limit in the current code.
- Uses wildcard CORS (`Access-Control-Allow-Origin: *`). This does not replace authentication, but should be narrowed to the production app origin(s) before release.
- Has no report mutation permissions; the system prompt explicitly says the assistant cannot submit, verify, publish or escalate reports.

## Next safe actions

1. Connect the Supabase project connector in ChatGPT and confirm the project URL/ID matches the intended StreetSense project.
2. Run the read-only audit query and review its results.
3. Add a versioned migration only for verified gaps, with rollback notes where feasible.
4. Add server-side AI request rate limits and production-origin CORS.
5. Test RLS using separate ordinary-user and coordinator accounts before exposing any feed, verification or case-management action.

No live database changes were made as part of this audit.
