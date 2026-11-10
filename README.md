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
- A clearly labelled scripted assistant

**Important limitations:** Guest report submission and guest reference lookup are not implemented. The existing `submitted_by` column is mandatory and current policies require authentication for inserts. Do not weaken RLS or expose private reports to enable guests; implement a secure server-side function first. GPS capture, image uploads, live map, AI model integration, automated triage, verification workflow, coordinator permissions and authority delivery are not implemented yet. The scripted assistant is not a connected AI model and does not have live road-condition data.

The browser uses the Supabase publishable key only. Never put a Supabase secret or service-role key in frontend code. Keep row-level security enabled.

## Next engineering milestones

1. Test sign-up, sign-in, authenticated submission, own-report lookup and public-feed visibility against the live Supabase project.
2. Implement secure guest submission and reference lookup through a server-side function without exposing reporter data.
3. Add GPS accuracy and optional evidence uploads.
4. Add an AI provider adapter with transparent fallback and human-reviewed triage.
5. Build verification, coordinator case management and authority delivery audit trail.
6. Add a live map/feed, accessibility checks and end-to-end tests.
7. Deploy to Cloudflare Pages and verify the public URL.

## Run locally

Open `index.html` in a modern browser with an internet connection. Supabase JS is loaded from a CDN; no build step is required.

## Deployment

Cloudflare Pages can deploy this repository as a static site using the `main` branch and the repository root as the build output directory. No build command is required. Free-tier quotas and service terms apply.

## Project protection

This repository is an independent alternative. It does not replace or modify the original Base44 master project known as **Musila**.
