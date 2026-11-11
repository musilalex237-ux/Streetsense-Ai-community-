# StreetSense AI — Groq provider setup

The assistant runs through a Supabase Edge Function. The browser sends the signed-in user's Supabase session to the function. The function validates that session, applies the private per-user rate limit, and calls Groq using a server-side secret. The Groq key is never sent to the browser.

## AI provider

StreetSense uses the Groq API with the OpenAI-compatible Chat Completions endpoint:

- API endpoint: `https://api.groq.com/openai/v1/chat/completions`
- Default model: `openai/gpt-oss-120b`
- Quick mode uses low reasoning effort and a shorter output budget; Deep mode uses high reasoning effort and a longer output budget.
- Groq model availability and free-plan limits can change. Confirm the model is enabled and review the account's current limits in the Groq Console before launch.
- No paid fallback provider is configured. Do not enable paid billing or upgrade without the owner's approval.

Official references:
- Groq quickstart: https://console.groq.com/docs/quickstart
- Chat Completions API: https://console.groq.com/docs/api-reference
- Supported models: https://console.groq.com/docs/models
- Model deprecations: https://console.groq.com/docs/deprecations
- Rate limits: https://console.groq.com/docs/rate-limits
- API key security: https://console.groq.com/docs/production-readiness/security-onboarding

## Required secrets and runtime controls

Create a Groq API key in the Groq console: https://console.groq.com/keys

Add these secrets in the Supabase project's Edge Function secrets:

- `GROQ_API_KEY` — secret Groq API key. Never put it in `index.html`, GitHub, or a `VITE_*` variable.
- `STREETSENSE_GROQ_MODEL` — optional model override. Default: `openai/gpt-oss-120b`.
- `STREETSENSE_ALLOWED_ORIGINS` — comma-separated exact browser origins allowed to call the function. Default is `https://streetsense.musilalex237.workers.dev`. Add the actual app origin before production launch; do not use a wildcard.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase server-side secret used only to call the private rate-limit RPC. Never expose it to the browser.

Supabase supplies `SUPABASE_URL` and `SUPABASE_ANON_KEY` to Edge Functions.

**Previously exposed Gemini key:** A Gemini key was pasted into a chat and must be treated as compromised. StreetSense's new function no longer uses Gemini, but switching providers does not revoke the old key. Revoke it separately in Google AI Studio. Do not paste either provider's key into chat.

## Deploy and test

1. Confirm `GROQ_API_KEY` is saved as a Supabase Edge Function secret.
2. Confirm `SUPABASE_SERVICE_ROLE_KEY` is present as a server-side Edge Function secret.
3. Confirm `STREETSENSE_GROQ_MODEL` is unset or points to a model enabled for the Groq account.
4. Confirm `STREETSENSE_ALLOWED_ORIGINS` contains the exact app origin(s).
5. Deploy the `streetsense-assistant` function with JWT verification enabled.
6. Test signed-in chat, invalid/expired sessions, disallowed browser origins, provider errors/429s, the 12-request-per-minute user limit, and both Quick and Deep modes.

## Request protection

The database migration `20261110233655_streetsense_ai_rate_limit.sql` creates a private rate-limit table and a service-role-only RPC. The Edge Function checks the authenticated user's ID and permits up to 12 requests per user per minute. The table has RLS enabled and no anon/authenticated table grants. If the rate-limit check fails, the function fails closed and does not call Groq.

CORS is restricted to exact origins from `STREETSENSE_ALLOWED_ORIGINS`; requests from other browser origins are rejected. CORS is not authentication, so JWT validation remains mandatory.

## Privacy and usage notes

Do not send passwords, identity numbers, sensitive personal data or private reporter details to the model. The function does not read private reports or attach user profile details. Review Groq's current terms and data-handling documentation before sending any personal information. Free-plan quotas and model availability are subject to the provider's current policies and may change.

## Safety and current limits

The function does not write report records, publish alerts, contact authorities, fetch live traffic/road data or verify a report. Severity suggestions remain preliminary and must be reviewed by a human coordinator. The assistant is not an emergency-response service.
