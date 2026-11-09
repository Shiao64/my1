# Star intent (Going / Interested)

Approved requirements: `docs/star-intent-requirements.md`. This file is the implementation note. Nothing here is deployed.

The earlier uncommitted Going draft was never on a branch and is not in git. This change starts from `main` and uses the existing social-worker confirm and `SOCIAL_MAIL` mail path.

## What the star counts

The number beside a star is the count of **distinct verified emails** with an **active** Going or Interested row on that card (`going_intents.status = 'active'`).

- Switching Going ↔ Interested updates the same row. It does not add a second person.
- Cancelling sets `status = 'cancelled'` and the person drops out of the count.
- Unverified pending rows are not counted.
- Historical like rows are not used.
- The public response is only the number. Emails and names are not listed.

A regular card’s star count is the **whole card**, not one date. The quarterly draft splits the same people by the **occurrence date** they chose. Adding those date rows does **not** equal the number of unique people. The draft says so.

## Time

Stored and labelled as `Asia/Shanghai` (Beijing time, UTC+8). `Asia/Beijing` is not an IANA name and is not used. The site language follows the existing page language. There is no new language or timezone preference.

## Two different emails

1. **Per submit.** After the person taps Confirm intent, and only after the email is verified, the worker emails the organizer address on the card. CC is `selecttango@gmail.com`. Reply-To is the person’s email. The From name is 探戈助理. The body has name, email, and intent. A regular card also includes the chosen date and, only if checked, a directions request. City and role are not included. The same fingerprint (intent + date + directions) is not mailed again. Cancel does not mail the organizer. A failed send is stored as `mail_status = failed` and the page must not say the mail was delivered.
2. **Stats drafts.** Not sent. `generateGoingStats` writes `going_reports` with `status = 'review'` only. It does not call the mailer. There is no send endpoint.

Menu profile verification (`POST /social/profile`) never creates an intent and never emails an organizer. Typing a verified address without the session token does not sign anyone in; a restore link is mailed to that inbox.

## Stats schedule (not enabled)

Suggested cron, **not registered** in `wrangler.toml` and **not turned on**:

- `30 16 * * *` UTC, which is 00:30 the next calendar day in Asia/Shanghai.
- The handler runs only when `GOING_STATS=on` **and** that cron is added at deploy time.
- A featured draft is created once, the day after `end` (Asia/Shanghai), key `featured:{card id}`.
- A regular draft is created for each finished natural quarter that has intents, plus the quarter that just ended. Key `regular:2026Q3` for 1 Jul–30 Sep. Quarter membership is the chosen occurrence date.
- Inserting the same key again does nothing.

Review: `GET /social/admin/going-reports` and `POST /social/admin/going-reports/run` with `Authorization: Bearer` the existing `ADMIN_TOKEN` (at least 24 characters). The run route only writes drafts (`sent: false`).

Active intents at generation time are counted. Cancelled rows are left out. There is no automatic copy to an organizer and no default CC on a draft.

## Per-event updates

“Get updates for this event” is stored on the intent (default on) and can be turned off without emailing the organizer. Early-bird, deadline, change, and host messages are **not dispatched** by this change. There is no reviewed publish queue yet, so the worker does not invent those times or claim they were sent.

## Deploy (do not run from this PR)

1. Apply `social-worker/migrations/0009_going.sql` on the social D1 (`SDB`). Do not import production rows into a test database.
2. Deploy the worker that serves `social-worker/src/live.js`. Leave `SOCIAL_MAIL` as it is (Resend in the preview vars). No new secret. CC is a field on that existing send.
3. If `TURNSTILE_SECRET` is set, the pages need `window.ATM_TS_KEY` (the preview worker already injects `TURNSTILE_SITEKEY`). Static pages do not set it today.
4. Do **not** set `GOING_STATS=on` or add the stats cron until someone wants drafts. Adding the cron without the flag still no-ops.
5. `TEST_ONLY_RECIPIENT`, when set, rewrites the organizer recipient to that address and drops the CC, so a preview cannot mail a real organizer.

Pages publish is enough for the star and the copy. The buttons call the API; until the worker and migration are deployed, submit returns an error and must not be described as live.

There is no preview URL for this branch. Nothing was deployed.
