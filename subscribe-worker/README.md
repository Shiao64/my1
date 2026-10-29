# tango-subscribe — Asia Tango Map event alerts (double opt-in)

Status: **code ready locally, NOT deployed.** Production (api.tangoweekend.org) still runs the old collect-only
version (deployed 2026-10-27, Workers Free), which stores rows in `subs` and emails the owner.

## Flow
1. Form (`asia/asia-subscribe.js`, `?v=sub21`) — email **required**, WeChat ID optional → `POST /subscribe`.
2. Worker stores the email in `email_subs` as `pending` (only a SHA-256 of the token is kept) and emails a confirm link
   `https://api.tangoweekend.org/confirm?t=…` (valid 7 days).
3. `GET /confirm` → `active` (on the list), welcome email with unsubscribe link, owner notification to NOTIFY_TO.
4. `GET|POST /unsubscribe?t=…` → `unsubscribed` (also used by the List-Unsubscribe one-click header).
5. Cron `17 3 * * *` (UTC, = 11:17 Beijing time) deletes `pending` rows older than 7 days.
Existing table `subs` is not touched or migrated.

## Mail provider (`MAIL_PROVIDER` var)
- `log` (default): nothing is sent, mail is printed to the log. Safe for testing.
- `cloudflare`: Email Sending binding `SUB_MAIL` (needs Workers Paid + tangoweekend.org onboarded in Email Sending:
  Dashboard → Compute → Email Service → Email Sending → Onboard domain, adds cf-bounce MX/SPF/DKIM + DMARC records).
- `resend`: `wrangler secret put RESEND_API_KEY`, verify tangoweekend.org in Resend (adds SPF/DKIM DNS records). Works on Workers Free.
  If you use Resend, delete the `[[send_email]] SUB_MAIL` block from wrangler.toml.
- Optional `TEST_ONLY_RECIPIENT` var: refuse to send to any other address (for a first live test).

## Go-live steps (do not run without approval)
```
npm i -D wrangler
npx wrangler d1 execute tango-subscribe --remote --file=migrations/0002_double_optin.sql
# set MAIL_PROVIDER (+ secret / domain onboarding as above)
npx wrangler deploy
```
Local test (no deploy, no sending): `node test/smoke.mjs` (Node ≥22, uses node:sqlite and a mocked env), or `npx wrangler dev`.

## Subscriber mail via Gmail (MAIL_PROVIDER = "gmail", default)
Confirmation and welcome mails are sent through smtp.gmail.com:465 (TLS, AUTH PLAIN) as
`Asia Tango Map <selecttango@gmail.com>` using `cloudflare:sockets`. At release time:
1. `npx wrangler secret put GMAIL_APP_PASSWORD` (Google app password of selecttango@gmail.com)
2. `npx wrangler d1 migrations apply tango-subscribe --remote` (migration 0002)
3. `npx wrangler deploy`
Gmail consumer limit is about 500 recipients per day. Set MAIL_PROVIDER = "log" to send nothing.
