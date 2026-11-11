# StreetSense AI — Know before you go

StreetSense AI is an independent, mobile-first community road and personal-safety awareness platform for the Thika, Kiambu County pilot.

It helps pedestrians, drivers, cyclists, boda boda riders and residents report hazards, understand risk and share useful warnings. It is not turn-by-turn navigation, emergency dispatch or a source of verified live road conditions.

## Master application reference

The original Base44 master project **Musila** (app ID `6ae2f6122c590e9334faf871`) remains the product reference and is not modified by this repository.

The complete screen/module restoration map is in [docs/BASE44_MUSILA_RESTORATION_MAP.md](docs/BASE44_MUSILA_RESTORATION_MAP.md). It records the original product scope, verified live database constraints, missing modules, rebuild order and release gates.

## Project protection and free-tool constraints

- All rebuild work stays on `streetsense-rebuild-foundation`.
- The GitHub `main` branch and original Base44 master project remain untouched.
- Do not use Replit or Base44 as the rebuild platform.
- Do not introduce paid hosting, paid AI fallback or plan upgrades without explicit approval.
- Do not rename the application before the owner has tested the restored product.

## Current technical foundation

- Static mobile-first frontend in `index.html`.
- Supabase Auth with email sign-up/sign-in.
- Existing Supabase `reports` table integration for signed-in report submission and account-scoped lookup.
- User-triggered GPS capture, including accuracy and capture timestamp.
- Reports start private and unverified.
- Supabase Edge Function `streetsense-assistant` is deployed ACTIVE with JWT verification enabled.
- The assistant uses Groq through a server-side API key and offers Quick and Deep reasoning modes.
- AI rate limiting is enforced server-side. The Groq key and Supabase service-role key must never be exposed in browser code.

## Current status — not release-ready

The current frontend is still a limited single-page prototype. It is not yet a full recreation of the Musila master app.

Not yet restored or verified end-to-end:
- Full dashboard and community map/feed
- Personal safety incident reporting
- Guest reporting and secure guest reference lookup
- Private evidence/photo uploads
- Community verification and moderator workflow
- Coordinator case-management workspace
- Trusted contacts and SOS
- Authority referral approval and complete delivery tracking
- Notifications and full audit history

The live database currently contains the core tables `profiles`, `user_roles`, `reports`, `report_verifications`, `authority_contacts`, `authority_delivery_attempts` and the private AI rate-limit table. Each has RLS enabled. Personal safety, trusted-contact, SOS and several other modules need a separately reviewed data model and RLS design before implementation.

## Safety and privacy rules

- Never expose private reports to populate a public feed.
- Publish only records explicitly approved for public visibility.
- Never treat sample/demo data as verified real incidents.
- AI severity suggestions are preliminary; a human coordinator makes verification and publication decisions.
- Never claim an authority was contacted or emergency services dispatched unless the system confirms that action.
- Keep reporter identity and sensitive incident details private.
- Do not weaken RLS to make a screen appear functional.

## Development and deployment

The project is a static site and can be hosted on a free static-hosting tier. The current branch is not approved for production deployment. Test the rebuilt modules and mobile flows before merging to `main` or deploying a public release.

See:
- [Master app restoration map](docs/BASE44_MUSILA_RESTORATION_MAP.md)
- [Rebuild plan](docs/REBUILD_PLAN.md)
- [Supabase security audit](docs/SUPABASE_SECURITY_AUDIT.md)
- [Groq setup and test guide](AI_SETUP.md)
