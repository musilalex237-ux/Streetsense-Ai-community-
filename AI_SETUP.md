# StreetSense AI — secure model setup

The assistant is implemented as a Supabase Edge Function. The browser calls the function with the signed-in user's Supabase session. The function validates that session, then calls the OpenAI Responses API using a server-side secret.

## What this protects

- The OpenAI API key is never sent to the browser.
- The function requires a valid signed-in Supabase user (JWT verification enabled).
- Message size and conversation history are bounded.
- The model is instructed not to invent live road conditions, claim report actions, or replace emergency services.
- Responses are requested with `store: false`.

## Required Supabase function secrets

Set these in the Supabase project for Edge Functions:

- `OPENAI_API_KEY` — a secret OpenAI API key. Never put this in `index.html`, GitHub, or a `VITE_*` variable.
- `STREETSENSE_AI_MODEL` — optional model override; defaults to `gpt-5.5`.

Supabase supplies `SUPABASE_URL` and `SUPABASE_ANON_KEY` to Edge Functions.

## Deploy

From a machine with the Supabase CLI linked to the existing project:

1. Set the function secrets in Supabase.
2. Deploy `streetsense-assistant` from this repository.
3. Keep JWT verification enabled.
4. Test while signed in with a normal user account.

The function uses the existing project and does not create or alter database tables.

## Cost and availability

OpenAI API usage is separate from a ChatGPT subscription and may incur API charges. Set project spend limits and usage alerts in the OpenAI Platform before enabling public use. If no provider key is configured, the function returns a clear configuration message and the web app retains its local safety-guide fallback.

## Current limits

The function does not read private reports, write report records, publish alerts, contact authorities, or fetch live traffic/road data. Those capabilities require separate, permission-checked workflows and human approval.
