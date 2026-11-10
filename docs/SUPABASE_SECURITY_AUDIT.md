# Supabase and AI security audit — development branch

## Audit status

**Live inspection completed for the Supabase project `kebfbnlgwyzeijevyvzy`.** The audit was read-only except for the narrowly scoped role-helper permission hardening described below. No report rows or user data were edited.

The live schema contains six public tables: `profiles`, `user_roles`, `reports`, `report_verifications`, `authority_contacts` and `authority_delivery_attempts`. RLS is enabled on all six. The live `reports` table includes the GPS fields used by this branch: `latitude`, `longitude`, `location_accuracy_m` and `location_captured_at`. The report kind, severity and status enums align with the current report form.

## Access model observations

- Report inserts are restricted by RLS to signed-in users inserting their own report in the initial `unverified`, non-public state.
- Public report reads are limited by policy to records deliberately marked public and in `verified` or `resolved` status.
- Signed-in reporters can read their own reports; privileged roles have additional review access.
- Profiles are scoped to the current user's row.
- Verification records are readable by their reviewer and designated review roles.
- Authority contact and delivery-attempt reads are restricted to authority/platform roles by RLS.
- The delivery-attempt RPC is executable only by `service_role` and checks its service-role context, contact activation and contact verification before recording an attempt.
- The verification RPC is executable by authenticated users but checks for a signed-in moderator/platform administrator and prevents self-verification before applying its review rules. It intentionally uses `SECURITY DEFINER` to perform the protected verification write; retain this only while its internal authorization checks remain intact and covered by tests.
- Table-level grants exist for API roles, but RLS is the row-level boundary. Do not add policies or weaken RLS to enable guest submissions.

## Hardening completed

The public helper `has_any_role(app_role[])` previously had execute permission for `anon`. It was changed to `SECURITY INVOKER`, with execution revoked from `PUBLIC` and `anon`, and granted to `authenticated` and `service_role`. It checks only the current user's own role rows. A verification query confirmed: it is no longer SECURITY DEFINER, anonymous execution is false, and authenticated execution is true.

This change was recorded in Supabase migration history as `20261110233105_secure_role_helper_permissions`. It did not modify report rows or table policies.

## AI request protection added

A private `streetsense_ai_rate_limits` table and `consume_streetsense_ai_rate_limit(uuid)` RPC were added in migration `20261110233655_streetsense_ai_rate_limit`. The table has RLS enabled, no anon/authenticated table grants and service-role-only access. The RPC is SECURITY DEFINER but executable only by `service_role`; it atomically permits 12 requests per user per minute and prunes buckets older than 24 hours. The function code now fails closed if the rate-limit check cannot be completed.

The Edge Function code now uses an exact-origin allowlist from `STREETSENSE_ALLOWED_ORIGINS`, defaulting to the known Worker origin `https://streetsense.musilalex237.workers.dev`. Set the final Cloudflare Pages origin in this variable before deployment. This code change is committed to the rebuild branch but has **not** been deployed.

## Remaining security items

1. Supabase Security Advisor reports no anonymous SECURITY DEFINER exposure. It still warns about the authenticated `submit_report_verification` SECURITY DEFINER RPC. Its internal moderator/platform-role checks were inspected; test it with ordinary-user and moderator accounts before enabling the verification UI.
2. Leaked-password protection remains disabled. The Supabase organization is currently on the **Free** plan; Supabase documents this feature as available on **Pro and above**, so it cannot be enabled on the current plan. Do not upgrade or incur charges without an explicit decision.
3. The Edge Function code has restricted CORS and per-user rate limiting, but it is not deployed. Before deployment, configure/rotate `GEMINI_API_KEY` as a server-side secret, set the exact deployed app origin(s), and test authenticated access and 429 handling.
4. The project had no prior migration history; two migrations now exist for role-helper hardening and AI rate limiting. Establish a baseline for the pre-existing schema before future schema migrations to avoid drift.
5. Storage evidence uploads are not implemented in the current branch. Before adding them, define private bucket rules and test ownership/reviewer access.

## AI function review

The repository's `supabase/functions/streetsense-assistant/index.ts`:
- Requires a Bearer token and validates it with `auth.getUser()`.
- Uses the caller's authenticated context with the Supabase anon key.
- Keeps `GEMINI_API_KEY` in server-side environment variables.
- Limits the message to 1,800 characters and history to the last eight bounded messages.
- Has no application-level per-user rate limit.
- Uses wildcard CORS, which must be narrowed before release.
- Does not write reports, verify or publish alerts, contact authorities, or fetch live road-condition data.

## Release gates

- Test RLS with separate ordinary-user, moderator and authority accounts.
- Test the verification RPC against ordinary-user attempts, self-verification and valid moderator review.
- Enable leaked-password protection.
- Add AI rate limiting and production-origin CORS before deploying the Edge Function.
- Reconcile migration history and establish a safe schema baseline.
- Do not merge the rebuild branch or deploy the AI function until these gates are reviewed.
