# StreetSense AI — Groq provider setup

The assistant runs through a Supabase Edge Function. The browser sends the signed-in user's Supabase session to the function. The function validates that session, applies the private per-user rate limit, and calls Groq using a server-side secret. The Groq key is never sent to the browser.

## AI provider

StreetSense uses the Groq API with the OpenAI-compatible Chat Completions endpoint:

- API endpoint: `https://api.groq.com/openai/v1/chat/completions`
- Default model: `llama-3.3-70b-versatile` (can be overridden with `STREETSENSE_GROQ_MODEL`)
- Quick mode uses a shorter output budget; Deep mode allows a longer answer. These are response-length settings, not a promise of a separate reasoning model.
- Provider quotas and model availability can change. Check the current Groq console limits before relying on a particular allowance.
- We do not automatically switch to a paid provider or create billable usage.

Official references:
- Groq quickstart: https://console.groq.com/docs/quickstart
- OpenAI compatibility: https://console.groq.com/docs/openai
- Supported models: https://console.groq.com/docs/models
- Rate limits: https://console.groq.com/docs/rate-limits
- API key security: https://console.groq.com/docs/production-readiness/security-onboarding

## Required secrets and runtime controls

Create a Groq API key in the Groq console: https://console.groq.com/keys

Add these secrets in the Supabase project's Edge Function secrets:

- `GROQ_API_KEY` — secret Groq API key. Never put it in `index.html`, GitHub, or a `VITE_*` variable.
- `STREETSENSE_GROQ_MODEL` — optional model override. Default: `llama-3.3-70b-versatile`.
- `STREETSENSE_ALLOWED_ORIGINS` — comma-separated exact browser origins allowed to call the function. Default is `https://streetsense.musilalex237.workers.dev`. Add the final Cloudflare Pages origin before deployment; do not use a wildcard.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase server-side secret used only to call the private rate-limit RPC. Never expose it to the browser.

Supabase supplies `SUPABASE_URL` and `SUPABASE_ANON_KEY` to Edge Functions.

**Old Gemini key:** A Gemini key was previously pasted into a chat and should be treated as compromised. StreetSense will no longer use it after the Groq version is deployed, but switching providers does not revoke the old key. Revoke it in Google AI Studio separately. Do not paste either provider's key into chat.

## Deploy and test

1. Create a Groq API key in the Groq console.
2. Add `GROQ_API_KEY` as a Supabase Edge Function secret.
3. Confirm `STREETSENSE_ALLOWED_ORIGINS` contains the exact deployed app origin(s).
4. Deploy the `streetsense-assistant` function from this branch with JWT verification enabled.
5. Test a signed-in chat request, an expired/invalid session, an unapproved Origin, a provider quota response, and the 12-request-per-minute limit.
6. Test both Quick and Deep response-length modes.

The function uses the existing Supabase project and does not create or alter database tables.

## Request protection

The database migration `20261110233655_streetsense_ai_rate_limit.sql` creates a private rate-limit table and a service-role-only RPC. The Edge Function checks the authenticated user's ID and permits up to 12 requests per minute. The table has RLS enabled and no anon/authenticated table grants. If the rate-limit check fails, the function fails closed and does not call Groq.

CORS is restricted to exact origins from `STREETSENSE_ALLOWED_ORIGINS`; requests from other browser origins are rejected. CORS is not authentication, so JWT validation remains mandatory.

## Privacy and usage notes

Do not send passwords, identity numbers, sensitive personal data or private reporter details to the model. The function does not read private reports or attach user profile details. Review Groq's current terms and data-handling documentation before sending any personal information. Free-tier quotas and model availability are subject to the provider's current policies and may change.

## Safety and current limits

The function does not write report records, publish alerts, contact authorities, fetch live traffic/road data or verify a report. Severity suggestions remain preliminary and must be reviewed by a human coordinator. The assistant is not an emergency-response service.
