# Star intent deploy runbook

PR 37 only. Do not merge from this note. Do not deploy Pages until the worker and D1 steps below have succeeded. Do not upload card JSON or posters to R2. Do not send a test message to an organizer or a subscriber. Do not print secret values.

Read-only check of the live worker on 2026-11-09:

| What | Live value |
| --- | --- |
| Worker | `tango-subscribe` on `api.tangoweekend.org` |
| Entry today | The deployed script serves `/social/*`. `subscribe-worker/src/index.js` alone does not. |
| D1 | `tango-subscribe`, id `1b462639-75a1-4dcf-9b15-eab807e4b295` |
| Bindings `DB` and `SDB` | Same database id. Not two databases. |
| `EMAIL` | `send_email`, one fixed destination. Owner notices only. |
| `SUB_MAIL` | `send_email`, allowed sender `subscribe@tangoweekend.org`. |
| `SOCIAL_MAIL` | Not a binding. Plain var, value `resend`. Social and Going mail use the Resend HTTP API while this stays `resend`. |
| `MAIL_PROVIDER` | Plain var `gmail`. This is subscriber mail in `subscribe-worker`, not Going mail. |
| `GOING_STATS`, `GOING_NOTICE_SEND` | Unset. Leave them unset. |
| Going tables | Not present. `users` already has `city` and `role`. |
| Crons | `*/10 * * * *` and `17 3 * * *`. Keep both. |
| Secrets present, do not rotate or paste | `ADMIN_TOKEN`, `GMAIL_APP_PASSWORD`, `RESEND_API_KEY`, `TURNSTILE_SECRET`, `VAPID_PUBLIC`, `VAPID_PRIVATE`, `PUSH_ADMIN_TOKEN` |
| Turnstile site key | Plain var `TURNSTILE_SITEKEY` already set. Do not copy it into git. The page reads `GET /social/going/config`. |

`SOCIAL_MAIL_BINDING` is not on the worker. The code no longer calls that name. When `SOCIAL_MAIL` is `resend`, mail stays on Resend. When that var is empty, mail uses the existing `SUB_MAIL` binding. `EMAIL` is never the organizer sender, because it can only reach its one destination.

## Order

1. Record a D1 bookmark. Do not migrate yet.
2. Apply `0009_going.sql`, then `0010_going_notices.sql`, on `tango-subscribe`.
3. Deploy the worker with `--keep-vars`. Confirm both crons and both mail bindings are still there.
4. Stop. Do not deploy Pages and do not sync R2 in this pass.
5. Pages comes later, only after `/social/going/config` and `/social/likes` answer on the new worker. Pages publishes the star UI. Production card JSON stays on R2.

## 1. Bookmark

From `subscribe-worker/`, with the existing Cloudflare token (do not create a new one and do not put it on the command line):

```bash
npx wrangler d1 time-travel info tango-subscribe --remote
```

Save the printed bookmark outside the repo. That is the data rollback point. Worker rollback does not restore D1.

Optional SQL dump, also outside the repo:

```bash
npx wrangler d1 export tango-subscribe --remote --output "$HOME/tango-subscribe-before-0009.sql"
```

Do not commit that file.

## 2. Migrations

Do not re-run `0001` through `0008`. Those `ALTER TABLE` lines are already applied. Running them again fails on existing columns.

`0009` and `0010` only `CREATE TABLE IF NOT EXISTS`. They do not alter `users`, `subs`, `likes`, or `email_subs`. Apply on the one database both bindings use:

```bash
npx wrangler d1 execute tango-subscribe --remote --file=../social-worker/migrations/0009_going.sql
npx wrangler d1 execute tango-subscribe --remote --file=../social-worker/migrations/0010_going_notices.sql
```

Then read the names back:

```bash
npx wrangler d1 execute tango-subscribe --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'going%' OR name='profile_verify' ORDER BY name"
```

Expect `going_intents`, `going_notice_queue`, `going_notice_sends`, `going_pending`, `going_reports`, `going_sends`, `profile_verify`.

If a statement fails, stop. Do not start the next file. Restore with the bookmark from step 1 only if the partial tables must be removed:

```bash
npx wrangler d1 time-travel restore tango-subscribe --bookmark=BOOKMARK_FROM_STEP_1 --remote
```

## 3. Worker

Config: `subscribe-worker/wrangler.toml`.

- `keep_vars = true`
- `main = ../social-worker/src/live.js`
- crons are exactly `*/10 * * * *` and `17 3 * * *`
- `DB` and `SDB` share database id `1b462639-75a1-4dcf-9b15-eab807e4b295`
- `EMAIL` and `SUB_MAIL` stay
- `AI` stays
- `GOING_STATS` and `GOING_NOTICE_SEND` are not set

`keep_vars` keeps dashboard vars: `SOCIAL_MAIL=resend`, `MAIL_PROVIDER=gmail`, `GMAIL_USER`, `NOTIFY_TO`, `WX_NOTIFY_TO`, `TURNSTILE_SITEKEY`, `RESEND_FROM`, `AUTO_EXPIRE=off`, `API_BASE`, `SENDER`. Secrets are not deleted by a deploy. Do not run `wrangler secret put` or `wrangler secret delete`.

Dry run first. It does not upload:

```bash
npx wrangler deploy --dry-run --keep-vars --outdir /tmp/tango-subscribe-dry
```

Then, only if the dry run lists both crons and does not drop bindings:

```bash
npx wrangler deploy --keep-vars
```

Check:

- `GET https://api.tangoweekend.org/health` is 200
- `GET https://api.tangoweekend.org/social/likes?ids=E093` is 200
- `GET https://api.tangoweekend.org/social/going/config` returns `{"sitekey":"..."}` and the body has no secret
- Schedules are still `*/10 * * * *` and `17 3 * * *`
- `SOCIAL_MAIL` is still `resend`. `GOING_NOTICE_SEND` and `GOING_STATS` are still absent

Worker code rollback, if the new script misbehaves and the tables can stay:

```bash
npx wrangler rollback
```

That does not drop the new tables and does not restore vars changed without `--keep-vars`.

## 4. Do not do these in this pass

- Do not deploy Cloudflare Pages. The star UI is not live until that later deploy. Production HTML does not load `atm-star.js` yet.
- Do not run `tools/r2_sync_cards.py`. Production R2 is `events-core.json` 135 cards and `events.json` 281 cards, including E164. Git after this merge does not contain E164. Uploading git JSON would hide E164 and replace the E162 / E163 poster query `?v=20261109fix2`.
- Do not send mail by calling confirm, `/social/going`, or `/social/admin/going-notices/run` against production.
- Do not set `TEST_ONLY_RECIPIENT` on production. It rewrites the recipient.

## 5. Pages, later

After the worker checks pass, the site deploy publishes `asia/index.html`, `zh/asia/index.html`, `atm-star.js?v=st3`, `atm-data.js?v=r9`, and `asia-map.js?v=r9`. That deploy must keep the E163 redirect and the r9 missing-card copy (missing is not ended). It must not be treated as a card publish. Visitors on `tangoweekend.org` still read cards from `https://data.tangoweekend.org` first.

The star asks `GET /social/going/config` for `TURNSTILE_SITEKEY` because `TURNSTILE_SECRET` is already set. An empty token is rejected. Do not paste the site key into the HTML.

## What a real user email is

After Pages is deployed, a person who confirms Going or Interested is emailed to the organizer through the existing Resend path (`SOCIAL_MAIL=resend`), CC `selecttango@gmail.com`, From name 探戈助理. That is the feature. A test of that path against a real card is not part of this runbook.
