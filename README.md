# StreetSense AI — Know before you go

A mobile-first community road-safety platform prototype for the Thika, Kiambu County pilot.

## Product direction

StreetSense helps pedestrians, drivers, cyclists and boda boda riders share and understand road hazards before and during journeys. It is a community hazard-awareness and reporting platform, not a full navigation system or emergency response service.

The intended product includes:
- Guest and registered-user hazard reporting
- Unique report references and secure follow-up
- Public hazard feed and map
- AI-assisted severity triage, summaries and duplicate hints
- Community verification and coordinator review
- Human-approved alerts and authority referral tracking
- Clear privacy boundaries and role-based access

## Current prototype status

The static mobile-first app in `index.html` now connects to the existing Supabase project using its browser-safe publishable key. It includes:
- Supabase email sign-up, sign-in and sign-out
- Registered-user report submission using the existing `reports` table
- Correct mapping to the existing `kind`, `severity` and `status` enums
- Road/location name saved in the added `location_name` column
- New reports start as `unverified` and `public_visible=false`
- Report references derived from the report UUID
- Authenticated report lookup, subject to the existing row-level security policies
- Public feed visibility governed by the existing Supabase policies
- A context-aware local safety-guide fallback plus a secure Supabase Edge Function integration for the Gemini Developer API free tier, with Quick and Deep reasoning modes (requires server-side API key and function deployment)
- An AI-assisted preliminary hazard assessment button in the report form. It reviews the draft's risk factors, exposed road users, safe precautions, missing verification details and suggested summary. It does not submit the report or make a final severity decision.

**Important limitations:** Guest report submission and guest reference lookup are not implemented. The existing `submitted_by` column is mandatory and current policies require authentication for inserts. Do not weaken RLS or expose private reports to enable guests; implement a secure server-side function first. GPS capture, image uploads, live map, automated report triage, verification workflow, coordinator permissions and authority delivery are not implemented yet. The new draft assessment is advisory only and depends on the deployed Gemini function; it is not an automated triage decision. The scripted assistant is not a connected AI model and does not have live road-condition data.

The Gemini model integration is implemented in `supabase/functions/streetsense-assistant/` but is not live until the Edge Function is deployed and the `GEMINI_API_KEY` secret is configured. Quick mode uses lower reasoning effort; Deep mode requests higher reasoning effort and consumes more of the free-tier quota. When a quota is reached, the app asks users to wait and retry; no paid fallback is configured. See `AI_SETUP.md`. Until then, the chat uses a clearly disclosed local safety-guide fallback. It has no live road-condition feed. Do not present its guidance as verified live intelligence. The browser uses the Supabase publishable key only. Never put a Supabase secret or service-role key in frontend code. Keep row-level security enabled.

## Next engineering milestones

1. Test sign-up, sign-in, authenticated submission, own-report lookup and public-feed visibility against the live Supabase project.
2. Implement secure guest submission and reference lookup through a server-side function without exposing reporter data.
3. Add GPS accuracy and optional evidence uploads.
4. Add an AI provider adapter with transparent fallback and human-reviewed triage.
5. Build verification, coordinator case management and authority delivery audit trail.
6. Add a live map/feed, accessibility checks and end-to-end tests.
7. Deploy the `streetsense-assistant` Supabase Edge Function and configure its server-side secrets (see `AI_SETUP.md`).\n8. Deploy to Cloudflare Pages and verify the public URL.

## Run locally

Open `index.html` in a modern browser with an internet connection. Supabase JS is loaded from a CDN; no build step is required.

## Deployment

Cloudflare Pages can deploy this repository as a static site using the `main` branch and the repository root as the build output directory. No build command is required. Free-tier quotas and service terms apply.

## Project protection

This repository is an independent alternative. It does not replace or modify the original Base44 master project known as **Musila**.
