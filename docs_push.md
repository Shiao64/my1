# Web push + temporary event changes (feature/push-temp-change, NOT live)

## Temporary changes (临时变更 / 已取消)
One date of an event is marked in its `temp_notices` list (same field as the existing 临时通知), with `status`:
```json
{"status":"changed","date":"2026-11-05","time":"21:00–01:00","venue":"…","venue_en":"…","address":"…","address_en":"…","fee":"HK$150","fee_en":"HK$150","dj":"…","text":"中文说明","text_en":"English note"}
{"status":"cancelled","date":"2026-11-08","text":"场地维修，本周停一次","text_en":"Venue repairs, off this week"}
```
Admin: `python3 tools/temp_change.py set|cancel|clear ID YYYY-MM-DD [--time --venue --venue-en --address --address-en --fee --fee-en --dj --text --text-en]`,
`list`, `prune`. It writes every copy in asia/events*.json. The card (list + single ?card= page) shows a badge 「临时变更 · 11/5」/"Temporarily changed · 11/5"
or 「已取消 · 11/8」/"Cancelled · 11/8" (struck-through face) from now until the date passes (Asia/Shanghai), then disappears automatically.
Changed fields replace time/venue/address/fee/DJ on the card for that period. Nothing is deleted; ensure_posters.py and gen_detail_pages.py ignore the extra keys.

## Push
- Browser: `/manifest.webmanifest`, `/sw.js` (push + notificationclick only; **no fetch handler**, so HTTP cache and `?v=` busting are unchanged),
  `/asia/atm-push.js` adds 「🔔 开启推送通知」/"🔔 Turn on push alerts" to the 订阅 dialog.
- Worker (subscribe-worker): `GET /push/key`, `POST /push/subscribe`, `POST /push/unsubscribe` (site origin only), `POST /push/send` (Bearer PUSH_ADMIN_TOKEN).
  D1 migration `migrations/0003_push.sql` (push_subs, push_log). VAPID ES256 + aes128gcm with WebCrypto, no deps. Dead subscriptions (404/410) are removed.
- Rate limits: max 20 sends per 24h; ad-hoc `notice`/`ad` max `PUSH_ADHOC_PER_DAY` (2) per 24h. Event pushes: max 5 messages per run (rest folded into one summary).
- Trigger: `.github/workflows/push-notify.yml` on push to main touching asia/events.json → `tools/push_diff.py BEFORE AFTER` (new visible cards + new/edited
  unexpired temp changes) → `tools/push_send.py diff`. No secret = dry run (prints only).
- Ad-hoc 临时通知 / 不定期广告: `PUSH_ADMIN_TOKEN=… python3 tools/push_send.py notice|ad --title-zh --title-en --body-zh --body-en --url` (`--dry-run`, `--test-endpoint`),
  or GitHub → Actions → "Push notify" → Run workflow (kind/title/body/url).

## Owner setup before go-live
1. `npx web-push generate-vapid-keys` (or any P-256 pair) → `wrangler secret put VAPID_PUBLIC`, `VAPID_PRIVATE`; random ≥24-char `PUSH_ADMIN_TOKEN`
   as Worker secret **and** GitHub repo secret.
2. `npx wrangler d1 execute tango-subscribe --remote --file=migrations/0003_push.sql`, then `npx wrangler deploy`.
3. Merge branch to main, bump caches, purge Cloudflare.

## Platforms
- Android Chrome/Edge/Firefox, desktop Chrome/Edge/Firefox/Safari: work in the browser, no install needed.
- iOS/iPadOS: only 16.4+ and only after 「添加到主屏幕」 and opening from the home screen (the button explains this). In-app browsers (WeChat) cannot receive push.
- China mainland: Chrome push goes through FCM (Google), which is blocked without VPN; Huawei/Xiaomi browsers mostly don't support Web Push.

## Capacitor later (not built)
Wrap the static site; use `@capacitor/push-notifications` (FCM on Android, APNs on iOS). Add `POST /push/subscribe` with `{type:'fcm'|'apns', token}`
(new column `kind`) and send those via the FCM HTTP v1 API (APNs through FCM) in pushSend. For China Android you'd need vendor push (JPush/Huawei/Xiaomi).
