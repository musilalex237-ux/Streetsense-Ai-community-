# StreetSense AI rebuild plan

This branch is the safe development line for rebuilding the independent StreetSense AI project. The original Base44 project named **Musila** remains untouched. The `main` branch is preserved.

## Product promise

**StreetSense AI — Know before you go.**

A mobile-first, community-powered road and personal-safety awareness platform for the Thika pilot. It helps people report what they observe, understand risk, and share useful warnings. It is not a turn-by-turn navigation service, emergency dispatcher, or source of verified live road conditions.

## Original product modules to restore

1. **Overview and community feed** — report counts, recent public alerts, filters, and clear verified/unverified status.
2. **Road hazard reporting** — potholes, damaged roads, drainage/flooding, crossings, streetlights, blocked roads and road incidents; road name, landmark, time, optional GPS and accuracy, optional safe photo evidence, severity opinion, and report reference.
3. **Personal safety incidents** — dark spots, theft, harassment, mugging, accidents and other community safety concerns, with careful privacy controls.
4. **Report tracking** — secure reference lookup and clear lifecycle history without exposing reporter identity.
5. **Community verification** — confirmations, evidence review, duplicate suggestions and human coordinator decisions.
6. **StreetSense AI agent** — context-aware clarification, preliminary risk assessment, uncertainty disclosure, duplicate hints, safe alternatives, report drafting and coordinator-ready summaries.
7. **Coordinator workspace** — role-based queues, analyst review, high-risk triage, approval before publication and audit history.
8. **Authority referral tracking** — AI-drafted messages, human approval, delivery attempts and honest states such as sent, acknowledged or no response. No automatic claim that an authority was contacted.
9. **Trusted contacts and SOS** — user-controlled contacts, explicit SOS actions and truthful sharing status. Never present the prototype as an emergency dispatch service.
10. **Account, guest and privacy controls** — registered-user flows first; guest submission only after a secure server-side design is implemented and tested.

## Work completed on this branch

- Corrected the report form so it no longer promises guest submission that the backend does not support.
- Removed a duplicated `other` hazard option that could make two different labels save as the same database category.
- Corrected the feed and count descriptions so they do not imply that private, account-scoped reports are public community data.
- Added optional browser GPS capture and stores latitude, longitude, reported accuracy in metres, and capture timestamp with the report. The user must initiate capture and should do so only while safely stopped.
- GPS fields were already selected by the current report query; this change uses those existing column names. Confirm the live Supabase schema before deployment.

## Next engineering sequence

1. Confirm the live `reports` table columns, enum values, RLS policies and current Edge Function deployment. Do not weaken RLS to make a feature appear to work.
2. Add an idempotent, reviewed migration for any missing reporting fields and storage policies.
3. Build secure guest submission and lookup through server-side functions with rate limits and anti-abuse controls.
4. Add evidence upload with private storage and explicit retention/access rules.
5. Restore incident, trusted-contact and SOS modules using separate tables and strict ownership policies.
6. Build verification, coordinator roles, case queues and authority-delivery audit records.
7. Implement the AI action layer as proposals requiring human approval; keep the assistant's advisory scope separate from privileged database actions.
8. Add public feed/map only for records explicitly approved for publication.
9. Test on mobile, validate accessibility and run end-to-end checks before merging to `main` or deploying.

## Release rules

- Do not edit or merge into `main` until the feature branch has been reviewed and tested.
- Do not expose Supabase service-role keys or Gemini secrets in browser code or GitHub.
- Keep RLS enabled; never make private reports publicly readable just to populate the feed.
- Label demo content clearly and never treat sample data as verified real-world reports.
- No paid fallback provider or paid hosting should be introduced without the user's explicit approval.
