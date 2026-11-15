# 订阅改版（验证码 + 只填两项）部署说明 — 2026-11-15

这次改动包括：

- **B6 验证码**：确认信里多一个 6 位验证码（30 分钟有效，最多错 5 次）。用户可以留在原来的页面（例如微信）输入验证码，不用换浏览器去点链接。链接照样能用。
- **B7 只填两项**：订阅只要邮箱和手机末 4 码。姓名、城市、角色都是选填。用户选「要参加／感兴趣」时，如果还没有姓名，星星面板会请他补上。
- **前端 A1–A3**：
  - 等待确认的状态存在本机。微信重新载入页面以后，照样会自动登录。
  - 等待面板有三步说明、验证码输入、「已确认？直接登录」，以及 60 秒后才能点的「重新发送」。
  - 人机验证 8 秒内没出现，会提示用户关 VPN 或换网络。

## 先后顺序

前端已经跟着这个 PR 上线，后端部署以后新功能会自动启用。前端会自己判断后端版本：

- 选填：`/social/going/config` 返回 `sub_lite: 1`，前端才会把姓名、城市、角色标成选填。
- 验证码：提交后的回应里有 `code: true`，前端才会显示验证码输入框。

后端还没部署时，表单和现在一样（姓名、城市、角色必填，没有验证码），只是多了等待面板和重新载入后自动登录。

部署前先在本机拉最新的 main：`git pull`。

## 部署步骤（在 `subscribe-worker/` 目录执行）

1. 记下 D1 书签，作为数据回滚点：
   ```
   npx wrangler d1 time-travel info tango-subscribe --remote
   ```
   把印出来的 bookmark 存到 repo 以外的地方。

2. 执行迁移（只加两个字段，不删任何东西）：
   ```
   npx wrangler d1 execute tango-subscribe --remote --file=../social-worker/migrations/0019_confirm_code.sql
   ```
   如果报 `duplicate column name`，表示已经加过了，可以继续。

3. 试打包，不上线：
   ```
   npx wrangler deploy --dry-run --keep-vars
   ```

4. 上线：
   ```
   npx wrangler deploy --keep-vars
   ```

5. 检查：
   - `curl https://api.tangoweekend.org/social/going/config` 应该看到 `"sub_lite":1,"code":1`。
   - 用一个新邮箱在网站上订阅（只填邮箱和末 4 码）。确认信里应该有 6 位验证码。在原页面输入验证码，应该立刻变成「我的资料」并显示「已确认」。
   - 再用另一个新邮箱订阅，这次点信里的链接。原页面应该在几秒内自动登录。

## 回滚

- Worker：`npx wrangler rollback`（或在 Cloudflare 后台选上一个版本）。旧版 Worker 不读这两个新字段，留着没关系。
- 数据：通常不需要。真的要回滚，执行 `npx wrangler d1 time-travel restore tango-subscribe --bookmark=第1步的书签 --remote`。注意：这会丢掉书签之后的所有新数据。

## B8 寄信到 QQ／163 的送达率（需要你在后台操作）

现在用 Resend 寄信，寄件人是 `RESEND_FROM`。QQ、163 很看重寄件域名有没有完整认证。

1. **用自己的域名寄信**：例如 `notice@mail.tangoweekend.org`。不要用 Resend 的共享域名。
   - 在 Resend → Domains 加入 `mail.tangoweekend.org`。
   - 把 Resend 给的 DNS 记录（MX、SPF 的 TXT、DKIM 的 TXT/CNAME）加到 Cloudflare DNS。
   - 等 Resend 显示 Verified 以后，把 Worker 的 `RESEND_FROM` 改成 `Asia Tango Map <notice@mail.tangoweekend.org>`（用 `npx wrangler secret put RESEND_FROM` 或在后台改变量）。
2. **DMARC**：在 Cloudflare DNS 加一笔 TXT，名称 `_dmarc.mail`，内容 `v=DMARC1; p=none; rua=mailto:你的邮箱`。先用 `p=none` 观察两周，没问题再改成 `p=quarantine`。
3. **自己测**：用 QQ 邮箱和 163 邮箱各订阅一次，看信是进收件箱还是垃圾箱。也可以把信转寄到 mail-tester.com 打分（目标 9 分以上）。
4. **如果 QQ／163 还是常进垃圾箱**，可以考虑大陆的寄信服务（阿里云邮件推送 DirectMail、腾讯云 SES）。这需要另外接一个寄信方式，告诉我就可以加。

验证码本身也帮了忙：就算信进了垃圾箱，用户找到信以后也只要抄 6 个数字，不必在微信里开链接。
