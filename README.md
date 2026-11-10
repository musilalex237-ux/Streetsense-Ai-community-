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

The first browser prototype is in `index.html`. It includes responsive navigation, a report form, locally generated report references, browser-local report storage, feed filters, same-device reference lookup and a clearly labelled scripted assistant.

**Important:** this is a frontend prototype only. Reports are stored in the current browser and are not shared with other users. The assistant is not connected to an AI model. GPS, image uploads, authentication, shared database, map, verification workflow, coordinator permissions, authority delivery and production alerts are not implemented yet. Do not present these as live capabilities.

## Next engineering milestones

1. Add a secure shared backend and database with server-side access controls.
2. Implement guest and registered reporting plus cross-device reference lookup.
3. Add GPS accuracy and optional evidence uploads.
4. Add AI provider adapter with transparent fallback and human-reviewed triage.
5. Build verification, coordinator case management and authority delivery audit trail.
6. Add a live map/feed, accessibility checks and end-to-end tests.
7. Deploy to Cloudflare Pages and verify the public URL.

## Run locally

Open `index.html` in a modern browser. No build step is required for this first static prototype.

## Deployment

Cloudflare Pages can deploy this repository as a static site using the `main` branch and the repository root as the build output directory. No build command is required. Free-tier quotas and service terms apply.

## Project protection

This repository is an independent alternative. It does not replace or modify the original Base44 master project known as **Musila**.
