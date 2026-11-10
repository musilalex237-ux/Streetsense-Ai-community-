# StreetSense AI — free-tier Gemini setup

The assistant runs through a Supabase Edge Function. The browser sends the signed-in user's Supabase session to the function. The function validates that session and calls Google's Gemini API using a server-side secret.

## Free-tier provider

StreetSense uses the Gemini Developer API free tier by default, with `gemini-3.8-flash`. Google lists free input and output tokens for eligible models, subject to model availability and project-specific request/token limits. Current limits are shown in Google AI Studio and can change.

- Quick mode requests low reasoning effort.
- Deep reasoning requests high reasoning effort and may use more tokens and quota.
- If the provider returns a rate-limit or quota response (HTTP 429), StreetSense explains that the user must wait and try again. Daily request quotas reset at midnight Pacific Time; short-window limits may recover sooner.
- We do not automatically switch to a paid provider or create billable usage.

Official references:
- Gemini API free-tier pricing: https://ai.google.dev/gemini-api/docs/pricing
- Rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- Thinking controls: https://ai.google.dev/gemini-api/docs/thinking

## Required secrets and runtime controls

Create a new Gemini API key in Google AI Studio: https://aistudio.google.com/app/apikey

**Security note:** A Gemini key was previously pasted into a chat and should be treated as compromised. Revoke that old key in Google AI Studio and create a replacement. Never commit the replacement or put it in browser code.

Then add it in the Supabase project's Edge Function secrets as:

- `GEMINI_API_KEY` — secret Gemini API key. Never put this in `index.html`, GitHub, or a `VITE_*` variable.
- `STREETSENSE_GEMINI_MODEL` — optional model override. Default: `gemini-3.8-flash`.
- `STREETSENSE_ALLOWED_ORIGINS` — comma-separated exact browser origins allowed to call the function. Default is `https://streetsense.musilalex237.workers.dev`. Add the final Cloudflare Pages origin before deployment; do not use a wildcard.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase provides this to Edge Functions as a server-side environment variable. It is used only by the function to call the private rate-limit RPC. Never expose it to the browser.

Supabase supplies `SUPABASE_URL` and `SUPABASE_ANON_KEY` to Edge Functions.

## Deploy

From a machine with the Supabase CLI linked to the existing project:

1. Create the Gemini key in Google AI Studio.
2. Add `GEMINI_API_KEY` as a Supabase Edge Function secret.
3. Deploy the `streetsense-assistant` function from this repository.
4. Keep JWT verification enabled.
5. Confirm `STREETSENSE_ALLOWED_ORIGINS` contains the exact deployed app origin(s).
6. Test the per-user limit (12 requests per minute), including the 429 wait response.
7. Test both Quick and Deep reasoning while signed in.

The function uses the existing Supabase project and does not create or alter database tables.

## Request protection

The database migration `20261110233655_streetsense_ai_rate_limit.sql` creates a private rate-limit table and a service-role-only RPC. The Edge Function checks the authenticated user's ID and permits up to 12 requests per minute. The table has RLS enabled and no anon/authenticated table grants. If the rate-limit check fails, the function fails closed and does not call Gemini.

CORS is restricted to exact origins from `STREETSENSE_ALLOWED_ORIGINS`; requests from other browser origins are rejected. CORS is not authentication, so JWT validation remains mandatory.

## Free-tier privacy and usage notes

Google's free-tier pricing page states that content may be used to improve Google's products. Do not send passwords, identity numbers, sensitive personal data or private reporter details to the model. The function does not read private reports or attach user profile details.

Free-tier quotas are not guaranteed fixed numbers: they depend on model, project and current availability. Check the live quota in Google AI Studio. A 429 response is handled as a wait-and-resume condition. No paid fallback is configured.

## Safety and current limits

The function does not write report records, publish alerts, contact authorities, fetch live traffic/road data or verify a report. Severity suggestions remain preliminary and must be reviewed by a human coordinator. The assistant is not an emergency-response service.
