# StreetSense AI — Musila master-app restoration map

## Non-negotiable project boundaries

- The original Base44 master app, **Musila** (app ID `6ae2f6122c590e9334faf871`), is the product reference and must remain untouched.
- The GitHub `main` branch remains untouched. All reconstruction work happens on `streetsense-rebuild-foundation`.
- Do not use Replit or Base44 as the rebuild platform. Keep the implementation deployable on free/static hosting with Supabase Free and a free AI allowance.
- Do not rename the product during restoration. Keep **StreetSense AI — Know before you go** until the owner completes the test and naming decision.
- Do not mark screens or workflows as working unless they are connected to a real backend path and tested.

## Product structure to restore

The replacement should be a mobile-first application, not a one-page landing page with a chat box. The intended information architecture is:

1. **Home / Overview**
   - Clear StreetSense identity and Thika pilot context.
   - At-a-glance incident and hazard summaries with real data provenance.
   - Recent community alerts, with visible verification and freshness labels.
   - Quick actions to report, view map, get safety guidance and track a report.
   - Empty states must explain when no verified public alerts exist; never fabricate incidents.

2. **Community map**
   - Map pins only for reports the signed-in user is allowed to see or reports explicitly approved for public visibility.
   - Filters for hazard category, severity, status and recency.
   - Pin details show location confidence, status and last update.
   - Do not describe a pin as live or verified unless its record says so.

3. **Road hazard reporting**
   - Potholes, flooding/drainage, blocked roads, missing/damaged crossings, accidents and other road hazards.
   - Road/street name, direction or affected side, landmark, description, reporter's severity opinion, optional GPS and accuracy, observation time and optional evidence.
   - Explain that GPS capture should happen only when safely stopped.
   - Issue a private report reference and show the report lifecycle.
   - Registered-user reporting is the only supported cloud write in the current schema. Guest reporting must wait for a reviewed, rate-limited server-side submission design.

4. **Personal safety reporting**
   - Dark/poorly lit areas, harassment, theft/robbery, unsafe public spaces and other community safety concerns.
   - Do not force sensitive narrative details or expose reporter identity.
   - This module requires a separate privacy-reviewed data model and RLS policies. Do not squeeze personal safety reports into the road-hazard enum.

5. **Report details and tracking**
   - Private report reference lookup scoped to the submitting account or authorized reviewer.
   - Status timeline: unverified, under review, verified, rejected or resolved.
   - Show review notes only to authorized roles; do not reveal reporter details in public views.

6. **Community verification**
   - Separate witness confirmations from coordinator decisions.
   - Capture verification method, outcome, notes and evidence reference.
   - Prevent self-verification and enforce moderator/platform-admin checks server-side.
   - The existing verification RPC is a release gate until ordinary-user, self-verification and moderator tests pass.

7. **StreetSense AI agent**
   - Quick and Deep modes using the Groq-backed Supabase Edge Function.
   - Understand whether the user is walking, driving, cycling or riding a boda boda.
   - Ask a focused clarifying question when location, road-user type or hazard detail is missing.
   - Explain risk, exposed road users, immediate precautions, missing evidence and safer alternatives.
   - Suggest duplicate reports and preliminary severity only when supported by data.
   - Draft a report or coordinator message for human review; never silently submit, verify, publish or contact an authority.
   - Clearly disclose lack of live road, traffic or closure data.

8. **Coordinator workspace**
   - Role-aware queue for new, high-priority, duplicate-suspected and ageing reports.
   - Review report details and evidence, request more information, record verification, reject or resolve with a reason.
   - Separate analyst triage from moderator approval.
   - Require a human decision before public publication or authority referral.

9. **Authority referral and delivery audit**
   - Verified authority contacts, jurisdiction, channel, official source and verification date.
   - AI drafts a referral; a coordinator reviews and approves it.
   - Track queued, sent, failed, acknowledged or rejected outcomes with timestamps and external references.
   - A status is not proof that an authority received or acted on a message. Never imply dispatch or response without evidence.

10. **Trusted contacts and SOS**
    - User-controlled trusted contacts and explicit consent for sharing.
    - Clear distinction between an SOS draft, an action initiated by the user, a successfully shared message and any confirmed acknowledgement.
    - This is not emergency dispatch. The current database has no personal trusted-contact/SOS tables; implement only after threat-model and privacy review.

11. **Account, roles and privacy**
    - Resident, moderator, authority administrator and platform administrator experiences.
    - Profile details, sign-in/out, account status and clear privacy explanations.
    - Role decisions must come from trusted database authorization, never editable user metadata.
    - Guest and registered-user experiences must be clearly distinguished.

## Verified current Supabase data model

The live project was inspected read-only on 2026-11-11. The following public tables exist and have RLS enabled:

- `profiles`: user profile display name.
- `user_roles`: resident, moderator, authority_admin and platform_admin.
- `reports`: road hazard records, including `kind`, `description`, `severity`, `status`, road/location fields, optional latitude/longitude, GPS accuracy and capture time, plus `public_visible`.
- `report_verifications`: reviewer, outcome, method, notes and evidence URL.
- `authority_contacts`: authority contact, jurisdiction, channel, active/verified flags and official source.
- `authority_delivery_attempts`: referral attempts and outcome/acknowledgement metadata.
- `streetsense_ai_rate_limits`: private service-role-only AI rate-limit table.

All inspected tables currently returned zero rows. Treat the application as having no verified real incident data until real reports are submitted and reviewed.

### Existing database constraints that the UI must respect

- `reports.kind` accepts only `pothole`, `flooding`, `blocked_road`, `missing_crossing`, `accident` and `other`.
- `reports.severity` accepts `low`, `medium` and `high`.
- `reports.status` accepts `unverified`, `under_review`, `verified`, `rejected` and `resolved`.
- New user reports are private and unverified by default.
- Public reads are restricted by existing RLS and publication status.
- Personal safety cases, user trusted contacts, SOS events, notification preferences, duplicate-link records and evidence-storage objects do not yet have a verified application data model.
- Do not create new tables, loosen policies or expose private data as a shortcut. Review each migration and its RLS model before applying it.

## Current implementation gap

The current branch `index.html` is a 35 KB single-page prototype with a top navigation for Overview, Report hazard and Track report. It currently wires email sign-up/sign-in, signed-in report insertion, account-scoped report lookup, user-triggered GPS capture and the Groq assistant invocation. It is not the full master application.

The following are not yet restored or verified end-to-end: the full dashboard, community map/feed, personal safety module, public alert publication workflow, report evidence upload, guest reporting, community verification UI, coordinator queues and role-specific actions, trusted contacts, SOS, authority approval workflow, notifications and full audit history.

## Rebuild order and acceptance gates

### Phase A — visual and navigation restoration
- Recreate the app shell, responsive navigation, original product hierarchy, dashboard cards and all module entry points.
- Match the original master application's visual reference as closely as the supplied screenshots/reference allow.
- Keep inactive or not-yet-connected modules visibly labelled; do not create fake buttons or demo incident data.
- Preserve existing working report and assistant integrations.

### Phase B — complete the report journey
- Test registration, sign-in, signed-in report creation, private reference lookup and report status display.
- Add private evidence storage only after bucket policies and upload/download permissions are reviewed.
- Build public feed/map using only RLS-authorized and explicitly published records.

### Phase C — human review and authority workflows
- Test role resolution and verification RPC permissions before exposing coordinator actions.
- Build coordinator queue, verification history, human approval, authority contact verification and delivery audit.
- Keep AI actions as drafts/proposals until an authorized human approves.

### Phase D — personal safety and SOS
- Complete privacy and abuse-case review before designing tables and RLS.
- Build trusted-contact consent, SOS state transitions and truthful delivery status.
- Test unauthorized access, cross-account access and data deletion/retention.

### Phase E — full regression and release
- Mobile usability, accessibility, auth expiry, RLS, invalid input, empty states, AI quota/provider failures, CORS, role permissions and end-to-end user journeys.
- Keep main and the original Base44 project untouched until the owner approves the tested replacement.
- Deploy only after the rebuilt branch passes the release gates.

## Reference-fidelity note

A live browser inspection of the Base44 reference could not be completed through the available free browser access in this session. The reconstruction map therefore records the original product intent and previously established modules; it does not claim pixel-perfect visual parity. Any supplied screenshot or screen recording of the original Musila app should be treated as the visual source of truth, not replaced with invented design details.
