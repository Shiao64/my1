# tango-subscribe (DRAFT, not deployed)
Cloudflare Worker + D1 + Email Sending for the Asia Tango Map subscribe form (asia/asia-subscribe.js).
- POST /subscribe {email?, wechat?, lang} — at least one field. Email → pending + double opt-in mail (link valid 24h). WeChat → stored with timestamp for manual review.
- GET /verify?t=… → active. GET|POST /unsubscribe?t=… (link + List-Unsubscribe one-click in every mail).
Setup: `wrangler d1 create tango-subscribe` → put id in wrangler.toml → `wrangler d1 execute tango-subscribe --remote --file schema.sql` → onboard tangoweekend.org in Email Service (SPF/DKIM) → set SENDER → add custom domain api.tangoweekend.org (workers.dev is blocked in China) → `wrangler deploy`.
Review WeChat IDs: `wrangler d1 execute tango-subscribe --remote --command "select * from wechat_ids where reviewed=0"`.
Monthly summary sender: not built (planned as a routine).
Local test: `wrangler d1 execute tango-subscribe --local --file schema.sql && wrangler dev --var API_BASE:http://localhost:8787`.
