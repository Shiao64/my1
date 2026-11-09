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

“Get updates for this event” defaults on. Turning it off does not cancel Going or Interested and does not recall mail already sent.

The queue (`going_notice_queue`, migration `0010_going_notices.sql`) accepts only confirmed facts:

- A `temp_notices` item with status `changed` or `cancelled` and a real `date` or `start`. A time is included only when that item already has `time`.
- An `alerts` item with `reviewed: true` and kind `early_bird_start`, `early_bird_end`, or `register_deadline`, and a `YYYY-MM-DD` date.
- A host message posted with `POST /social/admin/going-notices` (`reviewed: 1`, Bearer `ADMIN_TOKEN`). Unreviewed text is refused.

Free-text notes are never parsed. A missing date is skipped, not guessed.

`POST /social/admin/going-notices/run` enqueues those facts. It emails opted-in people only when `GOING_NOTICE_SEND=on`. That mail goes to the user, From 探戈助理, with an unsubscribe link, and **no CC**. Failures are stored on `going_notice_sends` as `failed`. The same notice is not sent twice to the same address. Default is off, so a deploy does not start sending. The sample is `social-worker/going.cron.example.toml`. The live cron list is unchanged.

`GET /social/going/unsub` only shows a button. `POST` sets `notify=0` for that card. The intent stays.

## Deploy

The executable order, bindings, and rollback are in `docs/going-deploy.md`. Short form: bookmark D1 `tango-subscribe` (`1b462639-75a1-4dcf-9b15-eab807e4b295`, bound as both `DB` and `SDB`), apply `0009` then `0010`, deploy `subscribe-worker/wrangler.toml` with `--keep-vars`. Keep crons `*/10 * * * *` and `17 3 * * *`. Keep send_email bindings `EMAIL` and `SUB_MAIL`. `SOCIAL_MAIL` is a plain var (`resend`), not a binding. Do not deploy Pages or sync R2 in the worker pass. Do not set `GOING_STATS` or `GOING_NOTICE_SEND`.
