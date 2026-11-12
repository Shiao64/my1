# Preview worker (not production)

This file is the only deploy path for the cross-browser confirm work on PR 71.
Do not deploy `subscribe-worker/wrangler.toml`. That file is production
(`tango-subscribe` on `api.tangoweekend.org`, production D1, live crons).
Do not merge, do not write R2, do not run these migrations on the live D1,
and do not set `GOING_NOTICE_SEND`, `GOING_DIGEST_SEND`, or `GOING_WELCOME_SEND`.

The preview worker is `tango-subscribe-preview`. It has no custom domain and no
cron. `PREVIEW=1` refuses every outgoing message except
`shiao.li.chang@gmail.com`. `SOCIAL_MAIL` and `MAIL_PROVIDER` stay `log`
until you deliberately point mail at that one address.

## 1. Create a fresh D1 database

From `subscribe-worker/`:

```bash
npx wrangler d1 create tango-subscribe-preview
```

Copy the `database_id` into both `[[d1_databases]]` blocks in
`subscribe-worker/wrangler.preview.toml`. Leave the production id
`1b462639-75a1-4dcf-9b15-eab807e4b295` out of that file.

## 2. Apply migrations to the preview database only

Still in `subscribe-worker/`, and only with `--config wrangler.preview.toml`.
The `--env` flag is not used; this config file has no production environment.

```bash
for f in \
  migrations/0002_double_optin.sql \
  migrations/0003_push.sql \
  migrations/0004_sub_name.sql \
  ../social-worker/migrations/0001_social.sql \
  ../social-worker/migrations/0002_translate.sql \
  ../social-worker/migrations/0003_city.sql \
  ../social-worker/migrations/0004_wx_email.sql \
  ../social-worker/migrations/0005_mail_unsub.sql \
  ../social-worker/migrations/0006_wx_notify.sql \
  ../social-worker/migrations/0007_wx_once.sql \
  ../social-worker/migrations/0008_wx_added.sql \
  ../social-worker/migrations/0009_going.sql \
  ../social-worker/migrations/0010_going_notices.sql \
  ../social-worker/migrations/0011_going_digests.sql \
  ../social-worker/migrations/0012_going_occ.sql \
  ../social-worker/migrations/0013_going_confirm_show.sql \
  ../social-worker/migrations/0014_profile_verify_pending.sql \
  ../social-worker/migrations/0015_going_pass.sql \
  ../social-worker/migrations/0016_phone_bind.sql \
  ../social-worker/migrations/0017_confirm_claim.sql
do
  npx wrangler d1 execute tango-subscribe-preview --remote --config wrangler.preview.toml --file="$f"
done
```

`0004_sub_name.sql` also alters the old collect-only `subs` table. If that
table does not exist yet, run only `ALTER TABLE email_subs ADD COLUMN name TEXT;`
from that file and skip the `subs` lines. `0012_going_occ.sql` rebuilds the
intent tables; run the files in the order above.

`PREVIEW=1` blocks real providers (`resend`, `gmail`, `sub_mail`) unless the
recipient is `shiao.li.chang@gmail.com`. `SOCIAL_MAIL=log` only prints the
letter and does not send.

## 3. Deploy the preview worker

```bash
npx wrangler deploy --config wrangler.preview.toml
```

`API_BASE` and `PREVIEW_ORIGINS` are already
`https://tango-subscribe-preview.5mjqgtq8zh.workers.dev`. `PREVIEW_ORIGINS` is
read only when `PREVIEW=1`. It allows that origin for CORS and for the
return URL, and the confirm finish page links 「去看亚洲探戈地图」 / “Go to Asia
Tango Map” back to that site. Production (`PREVIEW` unset) ignores the
variable. Do not set a route on `api.tangoweekend.org`.

To actually deliver one letter to the allowlisted address, set
`SOCIAL_MAIL` to the provider you use and the matching secret, then deploy
again. Any other recipient throws `preview recipient not allowed` before send.
Leave the send flags unset.

## 4. Point a Pages preview at that API

Production pages (`tangoweekend.org` and `www.tangoweekend.org`) ignore `?api=`
and keep calling `https://api.tangoweekend.org`. On any other host
(`*.pages.dev`, `*.workers.dev`, `localhost`, or `127.0.0.1`):

```text
https://<branch>.my1-7p3.pages.dev/zh/asia/?api=https://tango-subscribe-preview.<account>.workers.dev
```

The same query on `/asia/` is the English page. The value must be an
`https://*.workers.dev` or `https://*.pages.dev` origin (or `http://127.0.0.1`
/ `http://localhost` for wrangler dev).

## Local wrangler dev

```bash
npx wrangler dev --config wrangler.preview.toml --port 8787
```

Use a local sqlite D1 (`--local`, the default for `wrangler dev`) and apply the
same SQL files with `npx wrangler d1 execute tango-subscribe-preview --local --config wrangler.preview.toml --file=...`.
Open the site with `?api=http://127.0.0.1:8787`.
