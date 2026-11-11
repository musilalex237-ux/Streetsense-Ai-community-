# Supabase and AI security audit — development branch

## Audit status

Live inspection was performed on Supabase project `kebfbnlgwyzeijevyvzy`. The only live database changes in this work were the narrowly scoped role-helper permission hardening and the private AI rate-limit migration. No report rows, user profiles, or report policies were edited.

The six application tables previously inspected are `profiles`, `user_roles`, `reports`, `report_verifications`, `authority_contacts`, and `authority_delivery_attempts`; RLS is enabled on all six. The current `reports` schema includes `latitude`, `longitude`, `location_accuracy_m`, and `location_captured_at`.

## Access model observations

- Report inserts are restricted by RLS to signed-in users inserting their own report in the initial `unverified`, non-public state.
- Public report reads are limited to records deliberately marked public and in `verified` or `resolved` status.
- Signed-in reporters can read their own reports; privileged roles have additional review access.
- Profiles are scoped to the current user's row.
- Verification records are readable by their reviewer and designated review roles.
- Authority contact and delivery-attempt reads are restricted to authority/platform roles by RLS.
- The delivery-attempt RPC is executable only by `service_role` and checks its service-role context, contact activation and verification.
- The verification RPC remains callable by authenticated users but internally checks moderator/platform-admin authorization and prevents self-verification. It remains a Security Advisor warning and needs explicit ordinary-user/moderator tests before the verification UI is released.

## Hardening completed

The `public.has_any_role(app_role[])` helper is now `SECURITY INVOKER`, uses a fixed search path, and is executable by authenticated users and `service_role`; anonymous and PUBLIC execute privileges are revoked. Live SQL inspection confirmed it is not SECURITY DEFINER and anonymous execute is not granted.

The corresponding migration is tracked in this branch as `20261110233105_secure_role_helper_permissions.sql`.

## AI request protection

The migration `20261110233655_streetsense_ai_rate_limit.sql` creates a private `streetsense_ai_rate_limits` table and `consume_streetsense_ai_rate_limit(uuid)` RPC. The table has RLS enabled, no anon/authenticated table grants, and service-role-only table access. The RPC is SECURITY DEFINER but executable only by `service_role`; it atomically permits 12 requests per user per minute and prunes buckets older than 24 hours.

The Edge Function in this branch:
- Requires a Bearer token and validates it with `auth.getUser()`.
- Uses the authenticated user's ID for the private rate-limit RPC.
- Fails closed if rate-limit enforcement fails.
- Rejects browser Origins not in the exact `STREETSENSE_ALLOWED_ORIGINS` allowlist.
- Uses the Groq Chat Completions API; `GROQ_API_KEY` remains server-side.
- Does not write reports, verify/publish alerts, contact authorities, or fetch live road-condition data.
- Has JWT verification enabled in `supabase/config.toml`.

**Deployment status:** No Supabase Edge Functions were deployed at the time of this audit. The branch code and database migration are not proof of a live AI integration. The user has reported saving `GROQ_API_KEY`, but secret values cannot be read back or independently verified through the connected tools. The exact deployed browser origin also remains to be confirmed.

## Current Security Advisor findings

- INFO: `streetsense_ai_rate_limits` has RLS enabled and no policies. This is intentional: anon/authenticated have no table grants; the service-role function accesses it.
- WARN: `submit_report_verification(...)` is executable by authenticated users as SECURITY DEFINER. Its internal role checks were inspected, but ordinary-user, self-verification and moderator tests remain a release gate. Do not weaken or revoke it without those tests.
- WARN: leaked-password protection remains disabled. The Supabase organization is on the Free plan; the feature is unavailable on that plan. Do not upgrade without explicit approval.

## Performance Advisor findings

The latest Advisor run also reports existing optimization suggestions: six unindexed foreign keys, several RLS policies that can wrap auth calls in SELECT for better planning, one set of multiple permissive SELECT policies on `reports`, and unused indexes. These are not evidence of a broken feature; review them separately before changing production policies or indexes.

## Remaining release gates

1. Verify the Groq key and Supabase service-role secret are present in Edge Function secrets without exposing either value.
2. Confirm the actual browser origin and configure exact CORS allowlisting.
3. Deploy only after the function and model configuration are reviewed.
4. Run end-to-end tests for authenticated success, invalid JWT, disallowed Origin, missing secrets, provider quota/error handling, Quick/Deep modes, and 12-request rate limiting.
5. Test report verification with ordinary-user and moderator accounts before exposing that workflow.
6. Reconcile the existing database migration baseline before making further schema changes.
7. Revoke the previously exposed Gemini API key separately; switching StreetSense to Groq does not revoke it.

## Free-plan and safety constraints

- Do not introduce paid hosting, paid model usage, or plan upgrades without the user's explicit approval.
- Check the Groq account's actual free-plan model availability and limits before production use.
- Keep RLS enabled. Never make private reports public just to populate the feed.
- Label demo content clearly; never present sample data as verified real incidents.
- No claim that emergency services or authorities were contacted unless the system confirms that action.
