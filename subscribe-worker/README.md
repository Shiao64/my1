# tango-subscribe — DEPLOYED 2026-10-27 (Workers Free)
Collect-only "event alerts" API for the Asia map form (asia/asia-subscribe.js).
- Endpoint: https://api.tangoweekend.org (Worker custom domain). `POST /subscribe`, `GET /health`.
- Body: {types:['featured'|'regular'], cities:[...] (regular only, empty = all), email?, wechat?, lang, website(honeypot)}
- Stores rows in D1 `tango-subscribe` (1b462639-75a1-4dcf-9b15-eab807e4b295), table `subs`.
- Notifies selecttango@gmail.com via Email Routing send_email binding (destination_address), From subscribe@tangoweekend.org. No mail to subscribers.
- CORS + Origin check: tangoweekend.org and www only. Spam: honeypot field + max 5 submissions per IP-hash per 60 min.
- `disabled/double-optin-index.js`: earlier double opt-in/unsubscribe version, NOT deployed.
Read rows: `wrangler d1 execute tango-subscribe --remote --command "select * from subs order by id desc"`.
