# ATM 交接说明（给下一个 Agent）

写于 2026-11-15，**2026-11-20 精简**：只留规则、现状和待办；过去的经过（11/16–17 状态、预告卡、探戈帮指路图、去掉公开邮箱、指路图缩略图）移到 `docs/atm-log.md`。接手 tangoweekend.org/asia（亚洲探戈地图，ATM）的工作前，先读这一份，再读同一项目里的其他文档。

这份有两个地方：claude.ai「ATM」项目里的 `claude/ATM-交接说明.md`（完整版），和仓库里的 `docs/atm-handoff.md`（公开版，给探戈助理也能读）。**两份要一起改。**
- 公开版网址：https://raw.githubusercontent.com/Shiao64/my1/main/docs/atm-handoff.md

## 0. 和 Shiao 合作

- **一律用中文回复。** 用户纠正过好几次。
- 写到 Shiao 时用「他」（用户 11/16 改过一封信里的称呼）。
- 用户是活动组织者，不是工程师。说明要白话，少用术语；必须用时顺便解释（例：部署 = 上线）。
- 节奏：用户提需求 → 你给方案（简短，列选项和建议）→ 用户回「做」「1」「合并」之类 → 你做完、测完、开 PR、合并 → 用中文汇报结果和下一步。用户说「你设计，更改」时，直接选一个方案做完、截图检查后上线。
- 会改正式网站或后端的动作（部署、改 Cloudflare 设置），**先问一句再做**。只改前端、合并 PR 后自动上线的，用户已授权直接合并。
- **用用户的 Gmail 寄信**（寄给别人时）：先建草稿给用户看，用户回「发」才寄。**不再写信给探戈助理**（11/17 起）。
- 方案上线前，用户希望有人复查，并在不同手机浏览器上测过。
- 不要让用户把密码、API token 贴在对话里。要登录网站时，请用户自己登录。
- **地区优先顺序（11/16）**：先做中国大陆和香港；中国以外（东京、首尔等）现在不急，先放着。
- 用户常直接贴一张卡的网址，接着说哪里不对；先打开看，再问或直接修。
- **11/17 起，用户也用 Cursor 改同一个仓库**（提交署名 `Cursor Agent`，分支名 `cursor/…`）。**11/18 用户说明：探戈助理＝Cursor 里跑的 Grok Bot**，`answer/…` 和 `cursor/…` 都是它开的。平常它一律交到 `data/inbox/`，只有用户明确说「你直接改」才用 `cursor/…` 直接改资料；同一件事只交一次（协作须知第二节）。两边的对话互不相通，**只靠仓库和这份交接说明同步**：开工先 `git fetch`、看 `git log origin/main` 有没有新提交和还开着的 PR；改完用分支和 PR，不要直接推 main；重要的改动写进这份说明。分工建议：一边改活动数据，另一边改页面代码，不要同时改同一类文件。

## 0.5 以后的方向（用户 11/19 定）

**资料可信 → 舞者真的去 → 主办看到效果 → 主办主动维护资料**，所有新功能都往这个循环推。全文在用户的 Google Doc「ATM 发展方向：资料可信与正向循环」（Shiao 的 Google Drive，只有他能打开，不贴网址）。先做的三件事：① 每周给有邮箱的主办寄确认信和小报告（一键「照常／取消／有改动」，要改后端，先问）；② 卡片显示「X 天前确认」；③ 舞会现场 QR 码海报（北京、上海先试）。不做星级评分；每周最多打扰主办一次；宁可少，也要准。

## 0.6 微信资讯收集由 Grok Bot（探戈助理）做（用户 11/20 定）

- **11/20 改回**：当天原本计划停掉 Grok Bot、改由 MBA（MacBook Air）上的 Claude 用 Computer use 定时抓微信，但那边**每次都要用户人工点一下才能跑，没法自动**，所以交回给 Grok Bot。**Grok Bot 只执行「探戈雷达」（它在 Cursor 里的任务名称）：微信群的探戈活动收集，交答复进 `data/inbox/`**（用户 11/20 定）：不写邮件、不私信主办，也不做每月名单核对（每月核对改由 Claude 做，见第 2 节「每月快过期名单」）。规则在协作须知第七节。
- **交法不变**：按 `data/inbox/README.md` 的格式，一件事一个 md（海报同名 .jpg），分支 `answer/…` 开 PR，只改 `data/inbox/`，走自动检查和上线流程；不直接改网站资料（除非用户说「你直接改」）。11/20 的 #318（`answer/2026-11-20-wechat-poster-1945`）就是这样交的。
- **帐号和机器**：探戈助理的微信号登录在 MBA 上；MBP（设备名 x-2-local）是用户日常用的。**Claude 不要在 MBP 上抓微信**（11/20 曾误开，用户纠正）。
- **只读不发**：在微信不回复、不按赞、不转发；要问主办的事列给用户。
- **资料来源**：卡片公开字段只写「主办在微信群公布，日期」；答复文件（仓库公开）只写群名、主办或团体名、日期时间、活动相关的几句话，不写一般群友、电话、微信号，不放截图。

## 0.7 活动来信 huodong@tangoweekend.org（11/20 上线，替代 Grok Bot 的邮件入口）
- 「活动来信名单」上的邮箱寄信到 huodong@tangoweekend.org，网站自动更新。主题不限；「新活动」「取消」「海报」只是提示。
- 流程：Cloudflare 邮件路由（规则 huodong@ → Worker tango-subscribe）→ `social-worker/src/inmail.js`
  → 名单 + SPF/DKIM/DMARC 都通过才收 → `data/inbox/<日期>-mail-<id>.md`（加图片/PDF，最多 8 个、每个 ≤10MB）
  → 分支 `answer/mail-…` 开 PR → inbox-guard 合并 → inbox.yml 处理。寄件人会收到「ATM 收到」回信（SUB_MAIL，不用 Resend）。
  实测 11/20：寄出到合并约 30 秒，处理完约 1.5 分钟。
- **谁能寄（11/20 用户定）**：网站卡片上有邮箱、活动在中国大陆／香港／台湾／澳门的组织者，**自动**可以寄（程序读 data.tangoweekend.org 的 events-core.json，存 10 分钟；读不到改读 GitHub 上的同一份）。卡片加邮箱、换邮箱、隐藏卡，网站更新后自动生效。所以**加邮箱前要确认是主办本人的**。这些组织者来信算「主办确认」，只用在他自己的卡（md 里会列卡号）。**组织者来信只能自动更新他自己的卡**：改到别人的卡，`tools/inbox_autocheck.py`（`mail_organizer_cards()`）不让自动上线，PR 留言等 Shiao 确认；新卡照一般新卡规矩；我们这边 4 个邮箱不受这条限制（11/20 用户定）。
  Cloudflare 后台 tango-subscribe 的变量（**不进仓库**）：`ATM_MAIL_SENDERS` 额外名单（我们这边 4 个，或主办的另一个邮箱、还没卡的新主办；格式 `邮箱=称呼,…`，不算主办确认）；`ATM_MAIL_ORGANIZERS` 额外但算主办确认的（目前空）；`ATM_MAIL_BLOCK` 不收名单（只写邮箱）；`ATM_MAIL_NAMES` 只管回信开头的称呼（例 王凯），不给寄信资格。11/20 卡上有 27 位（含深圳 Bes、香港 Eli Tango）；韩国、越南、日本的卡不在范围。和主办一律用中文沟通。
- GitHub 授权码：Cloudflare secret `ATM_GITHUB_TOKEN`（GitHub 上叫 huodong-mail，只能动 my1 的 Contents / Pull requests，一年后过期，到期要换）。
- 信里所有邮箱地址都隐藏，md 只写称呼；原始邮件不存。名单外、冒名、自动回复：不收、不回信。
- **公众号文章链接（11/21 用户定）**：答复（来信或探戈助理）里有 mp.weixin.qq.com 文章链接时，inbox.yml 在 Claude 处理前先跑 `tools/wechat_article.py`：打开文章，把正文加进答复的「## 公众号文章（自动读取）」（邮箱、电话隐藏），图片（最多 8 张、去掉小图标和 gif）存成 `<答复名>-wx<k>-<n>.jpg`，当附件用。读不到（微信要验证、文章删了）就在答复里写「读取失败」，PR 等 Shiao 看。测试 `python3 tools/test_wechat_article.py`。只寄链接也行，但微信偶尔挡 GitHub 的机器，重要的最好附海报。
- 查错：Actions「API tail (mail errors only)」只读监听几分钟，只印收信错误，不印地址。Cloudflare 邮件路由的 Activity log 也看得到每封信的结果。
- 坑：在 Cloudflare 后台「Add variable and deploy」会用**页面打开时**的版本重新部署。部署后要先重新整理页面再改变量，不然会把旧程序放回去（11/20 踩过）。

## 0.8 探戈通 Tango Pass（TP，活动报名系统）
详细说明、所有决定、Cloudflare 设定名称、部署步骤、待办都在 **`docs/tangopass.md`**，改报名系统前先读、改完更新那份。活动：`bstw2027`（北京精选探戈周末 2027）、`2027mvny`（Milonga V 2027 New Year）。
- 11/23 职务（平台管理员、总管、副总管、现场经理、前台）、设置页、登入的完整规则在 `docs/tangopass.md` 最上面。**第一步权限 11/23 已上线**（#382／#383，worker `4647f2d5`）；**第二步登入（专属链接＋六位密码）11/23 已上线**（#386／#387，worker `eb04610d`，新密钥 `REG_PIN_PEPPER` 设了就不能换）。
- **ATM 不使用 Cloudflare 人机验证（Shiao 11/23 定）**：开 VPN 时一直转圈、拿不到验证码。11/23 已移除（网页 #398、后台 #399，worker `8eefb1e5`，回退 `af256d7f`）：`/going/config` 不给 site key，`/profile` 不再要求；靠次数限制防滥寄：同一邮箱每小时 10 封、每天 50 封（Shiao 11/23 定，#401，worker `6d479cda`，回退 `8eefb1e5`），同一网络、同一设备每小时 10 封，全站每小时 300 封。不要再加回去；要恢复只能 Shiao 决定（`social.js` 的 `HUMAN_CHECK`，Cloudflare 金钥还在）。

## 1. 先读这些

| 文档（本项目） | 内容 |
|---|---|
| **ATM-活动分类规则** | 分类、首页布局、城市排序、语言／韩文规则、**地址与交通字段（第六节）**、网站实现、**已上线 PR 清单** |
| **ATM-收藏与订阅设计** | 收藏、要参加／感兴趣、订阅的设计与进度；**第八节：后端部署和只在 Cloudflare 后台设的变量** |
| **ATM-资料结构方案** | 场地／小场地／团体／组织者／DJ／活动／场次；介绍资料（照片简介）；草稿名单和待确认清单 |
| **ATM-探戈助理协作须知** | Grok bot「探戈助理」和 Claude 的分工、答复格式、自动处理流程、**自动上线规则**、待问主办清单（11/16 更新；**仓库里的 `data/inbox/README.md` 是原件**，两份要一起改） |
| **ATM-视觉统一方案** | 字体、配色方案（用户选了 A，`?ui=2` 测试层） |

仓库里的说明：`docs/atm-handoff.md`（本文件公开版）、`docs/going-deploy.md`（后端部署）、`docs/signup-code-deploy.md`、`docs/card-r2.md`、`tools/README.md`、`data/inbox/README.md`（协作须知原件，以仓库为准）、`data/entities-draft/PLAN.md`。

## 2. 系统概况

- **仓库**：GitHub `Shiao64/my1`（公开）。前端是静态网站，GitHub Pages 自动上线。
- **两个入口页**：`asia/index.html`（英文，韩文也用它，`?lang=ko`）和 `zh/asia/index.html`（中文）。**两页都要改**：script 的版本号 `?v=` 每次改 JS 都要在两页一起加一。页面语言跟手机语言走：`/zh/asia/` 在英文手机上也会显示英文（测试中文要把浏览器 locale 设成 zh-CN）。
- **大活动专页 `/event/<slug>/`（11/20）**：多数由 `tools/gen_detail_pages.py` 从 `asia/events.json` 生成（`SLUGS` 表；`HANDWRITTEN` 里的和不在表里的是手写页，不要用工具覆盖）。只重做某几页：`python3 tools/gen_detail_pages.py E039`，跑完 `git checkout asia/` 把它顺手改的 JSON 还原（`detail` 早已写好）。模板 11/20 改过：日程按天分组成卡片（时间｜场次・DJ，不再用 5 栏表格，手机放得下），过夜场次中文写「次日结束」；场地有多处时（`venue` 用「／」分、地址用「；」分，数目一样）每处单独一块；有日程时说明段标题叫「说明」；英文页用 `venue_en`；`TBC` 场地写「场地待公布」；中文页不输出脸书链接（style.css 本来就隐藏）；主海报不在仓库时改用 data.tangoweekend.org，载不到就整块隐藏。
- **打开某张卡**：网址加 `?card=<id>`（例 `/zh/asia/?card=E186`）。
- **主要前端文件**（`asia/`）：
  - `atm-home.js`：首页（城市胶囊、日常／大型页签、分类、收纳盒、招牌；大型页签底部的订阅卡片）；分类由 `catOf()` 决定（名称优先，其次 type；`encuentro` 算探戈周末，#155）。新版（`html.atm-v2` / `atm-t3`）的标题栏、配色 CSS 也在这里用 `css.textContent +=` 注入；
  - `cardB.js`：活动卡和详情页（类型标签 `P10TN`，`practilonga` 显示「练习舞会」）；`asia-map.js`：列表卡，里面的 `ATM_TH` 是海报缩图尺寸表；
  - `atm-data.js`：读活动资料（R2 优先，失败用仓库里的）；**中文页面在这里把时间里的 `late` 换成「尽兴」**（#157）；
  - `atm-i18n.js`：多语言取字段；`atm-ko.js`：韩文层，按英文原句精确对照翻译，**新增英文界面文字要在这里加韩文**；
  - `asia-subscribe.js`：订阅、登录、验证码；`atm-star.js`：收藏、要参加／感兴趣面板、收藏第 3 个时的订阅提示；
  - `atm-addr.js`：地址、交通、地图链接、放大给司机看、路线图；
  - `atm-ui2.js`：`?ui=2` 视觉测试层；
  - `atm-later.js`：**打包文件**，由 `tools/build_asia_assets.mjs` 从 `atm-menu.js` 等源文件生成。改源文件后要重新打包，不要直接改打包文件（打包时 `atm-critical.css`、`atm-early.js` 也会被重写，若只是工具版本差异就还原）。`atm-critical.css` 也是打包产物（来源 `css/atm-map-page.css`、`css/style.css`、`asia/cardB.css`、`asia/atm-theme.css`）；只想盖掉旧样式时，在 `atm-home.js` 的新版 CSS 里加覆盖规则比较安全（#160 这样做）。
  - `atm-install.js`（不打包，两个地图页各自引用，改了要一起加版本号）：菜单「放到桌面」和专用链接 `/zh/asia/?install=1`。只有四种说明（App 内、iOS、安卓一键、其他安卓），**不自动弹提示**；第一版请 5 位舞友真机试，4 人能自己装好再考虑「第一次收藏时提示」（用户 11/22 同意）。注意：iOS 桌面版和 Safari 的 localStorage 不相通，登录只带回「要参加／感兴趣」，只按星星的收藏和团体收藏带不回；
    红圈箭头（用户 11/22 要的）由 `spot()` 决定：iPhone Chrome、微信、iPad Safari 指右上；iPhone Safari 26 起指右下「…」，以前的指底部中间；**位置不确定的浏览器不画箭头**。Safari 版本看 UA 的 `Version/`（iOS 26 起系统号被冻结）；
- **活动数据**：`asia/events.json`、`events-core.json`、`events-more.json`，三个文件同一张卡要一致，格式是紧凑 JSON（`separators=(',',':')`, `ensure_ascii=False`；events-more 结尾有换行）。合并到 main 后，GitHub 任务「R2 sync」自动上传到 R2（#198 起只传改过的文件，通常几分钟）。**不要直接改 R2。** 注意：用 GITHUB_TOKEN 合并的 PR 不会触发 R2 sync（自动上线流程已经自己补上启动）；本环境的 `gh api … /merge` 可以触发，11/16 验证过。
  - **新卡放哪个文件**：中国大陆／台湾／香港的卡和 featured 卡放 `events.json` + `events-core.json`；其他地区一般卡放 `events.json` + `events-more.json`。
  - **编号**：活动 `E###`（11/16 用到 E187），每周 `R###`（用到 R272）。`weekday` 0＝周日，3＝周三。
  - **写法规则（用户 11/16）**：没有结束时间写 `"20:30–late"`（中文页面显示「20:30–尽兴」）；海报没印场地名、但地址和已知场地相同，用那个场地名（杭州凤起路75号303室 → `inTango HangZhou`）；练习舞会 `type` 用 `practilonga`。
  - **DJ 只属于那一场（用户 11/20）**：周常卡的 `dj`（和 `poster_djs`）是 `poster_date` 那一场的 DJ。那一场结束后网站就不显示 DJ：结束时间取 `time` 的结束钟点（早于开始的算隔天），写 `late` 或没写结束的算隔天 03:00，按城市当地时间（韩国、日本 +9，越南、印尼 +7，其他 +8）。下一场还没公布 DJ 就留空，不要沿用上一场。没有 `poster_date` 的周常卡（驻场 DJ，例如 R059、R034、R073）照常显示。代码在 `cardB.js` 和 `atm-home.js` 的 `djSessionOver()`（两边同一段，要一起改；cb186、h199）。
  - **手动建新卡的步骤**（#147、#157 的做法）：写进 JSON → 有官方海报就用换海报工具上（见下一条，单次活动要有 `regular_oneoff: true`）；大型活动的海报工具会拒绝，就手动裁好存 `images/asia/posters/<id>.jpg`，用 `tools/radar_poster_update.py` 里的 `thumb_image()` 产缩图、`update_atm_th()` 写尺寸表、`bump_live_caches()` 加版本号 → 没海报的跑 `python3 tools/ensure_posters.py` 产文字海报 → 手机尺寸截图检查 → PR、合并。
  - **预告卡（placeholder，11/16 用户定）**：字段 `preview: true`，有名称、城市、日期就能上；类型只有用户写了才写。公开说明一律只写这四句：`note_zh`「活动预告，详情待公布。」、`note` “Preview. Details to be announced.”、`note_ko` “예고. 자세한 내용은 추후 공개.”、`note_es` “Anuncio. Los detalles se anunciarán más adelante.”——不写内部备注、缺项、来源。缺的场地、地址、时间、费用、联络方式留空不猜；没地址只显示纯文字「场地待公布」，不加城市地图链接。没海报用 `images/asia/posters/generated/<id>.png` 占位图。补资料时改同一编号。测试 `python3 tools/test_preview_cards.py`。经过见 `docs/atm-log.md`（E188–E192）。
  - **换新一期海报**（已有的舞会／练习／单次活动）：`python3 tools/radar_poster_update.py --event-id <id> --image <图> --city 北京 --organizer <主办> --weekday 周二 --date YYYY-MM-DD --note "<第几场、DJ、来源>" --bump-caches`（先加 `--dry-run` 看）。它会备份旧海报到 `_backup/` 和 `past/`、产缩图、改 poster 字段，并按海报把卡上的 `dj` 改成这一期的 DJ（`poster_djs` 一一对应）——这是网站惯例，和「单场变动用 temp_notices」不冲突。大型活动、工作坊会被工具拒绝。
- **海报规则（用户 11/17 定）**：
  - 不是每个活动都要有海报。R2 sync 上传前会自动补：有当前海报就不动；没有就用最新的历史海报；都没有就生成一张文字海报（活动名、日期、时间、场地、城市）。**自动生成的文字海报不加「暂无海报」之类的标识**（用户说不要）。目前约 91 张卡用文字海报。**用户 11/17 决定：没有海报的不去问主办，先用自动生成的文字海报**（主办自己寄来或探戈助理顺带收到时再换）。
  - **历史海报 `posters_past`：每张卡最多 4 张，日期超过 30 天的不留，没有日期的照旧留着。**日期取 `poster_dates` 记录，没有就看文件名里的活动日期（`…-20261104T012604Z` 这种是换海报的时间戳，不算日期）。**11/18 起（用户）：摘掉的、显示不了的历史海报直接删，不再复制到 `_backup/`**（旧的 `_backup/` 文件还在仓库）。换海报时 `radar_poster_update.py` 会自动照这个规则清；全站清一遍用 `python3 tools/prune_past_posters.py`（先看，加 `--apply` 才写；`--today=YYYY-MM-DD` 可模拟）。卡片没有当前海报时至少留最新一张历史海报。测试：`python3 tools/test_prune_past_posters.py`。#196 清过一次（摘掉 5 张）。**#198 起每天自动清理**：`.github/workflows/poster-prune.yml`，北京时间每天 03:17 跑 `prune_past_posters.py --apply`（按北京日期），有改动就直接提交到 main（`github-actions[bot]`，提交名「Daily cleanup: drop expired past posters」），再启动 R2 sync；推送失败会从最新 main 重跑，最多 5 次。可在 Actions 里手动跑。 **历史海报的缩图、日期**由 `tools/fix_past_posters.py` 补（每日清理也会跑）。**R2 同步顺序是图片先、JSON 最后**（`upload_order()`，#219），所以网站不会指向还没上传的图。`bump_live_caches()` 会把 `asia-map.js?v=rNN` 也加一。经过见 `docs/atm-log.md`。
  - **「上期海报」标识**：每周固定的卡，当前海报有日期（`poster_date`）且已过，网站会在海报上显示「上期海报 / Previous poster / 이전 포스터」；没有日期的不标。这是原本就有的（`cardB.js` 的 `prevBadges`、`atm-home.js` 的 `ah-pw`），用户 11/17 确认这个做法。
  - **数据站（R2）要有这些图才打得开**：`tools/r2_sync_cards.py` 现在会把 `posters_past` 里的图和缩图一起上传（#195；以前只传当期海报，历史海报在数据站上不存在）。
- **指路图（用户 11/18）**：以后指路图交给 Claude 做（用户把照片和路线文字直接给 Claude，或探戈助理放进 `data/inbox/`）。照片放 `images/asia/directions/<卡id>-NN-<说明>.jpg`，**网站上用缩小版**（最长边 1600px、JPEG 品质 82、去掉 EXIF／定位资料，每张约 200–350KB；不裁切、不改构图），原图留在 `data/inbox/done/`；字段 `directions`／`_en`／`_ko`／`_es`，图注 `caption`／`_en`／`_ko`／`_es`，各语言只显示自己那一种；不再用的测试图删掉。第一张：AtrSun01（ATer Club 7C2，#223 四张实景、#225 第5张步行地图、步行约4–5分钟）。**网页不下载原图**，和海报一样用两种 webp：卡上小按钮用 `images/asia/directions/thumb/<名字>.webp`（每张 10–35KB），点开放大先显示缩略图、再换 `w800/<名字>.webp`（最长边 800px，每张 25–80KB），同时把这张卡其余几张的 w800 先下载好，翻页不用等；缺了自动退回原图（11/20 弱 4G 实测：点开 1 秒内清楚，翻页即时；原来一张原图 4–5 秒）。新加指路图后跑 `python3 tools/make_direction_thumbs.py`，换同名照片加 `--force`（11/20）。探戈帮（DIVjezcE）四张的测试：`python3 tools/test_divjezc_route.py`。
- **主办邮箱（用户 11/18）**：卡上 `contacts.email` 有可用邮箱，网站才显示「要参加／感兴趣」（后台 10 分钟内生效）。**新加某个主办的邮箱时，要主动找同一主办／团体的其他卡，空着的一起补**（自动处理的提示也写了）。11/18 补过：刘峥（Milonga V、Practica V、MILONGAGA）、ATer（AtrSun01、E124）、Tango Union West、Vida Mia、Milonga 1758（bQFvmIuY）、Legends Tango（R045、rSFJaHtm）、Milonga Cool（E184）、王萌（E192）。11/19 补 AS Tango阿根廷探戈学校（E188、eRpBxkDC Milonga El Sábado、wSeFVkSa AS Practica）。首尔 TANGO o nada 的 7 张卡也缺（R089 有），中国以外暂缓。
- **西班牙文（用户 11/18）**：界面层 `asia/atm-es.js`（照 `atm-ko.js` 复制，同一套 319 句 + 规则；`?lang=es`、西班牙语手机、`asiaMapLang=es` 都会进；`/zh/asia/?lang=es` 和首页 `/?lang=es` 会转到 `/asia/?lang=es`）。语言按钮多了 Español。**卡片说明只翻中国大陆（不含港台）**：`note_es`、`directions_es`，其他地区显示英文。自动处理（`inbox.yml`）新建或补资料时会顺手写大陆卡的 `note_es`／`directions_es`，`inbox_autocheck.py` 把这两个字段当「补空着的」。`lang-pref.js` 的语言记忆源文件补上 ko、es（原来 ko 只在手改过的打包文件里，重新打包会丢）。版本：`atm-es.js?v=es1`、`atm-ko.js?v=k13`（加了「✓ Going」）、`atm-early.js?v=ea6`、`atm-later.js?v=lt18`。还没找人审稿。
- **俄文（用户 11/18，做法同西班牙文）**：`asia/atm-ru.js`（同一套句子；星期有阴阳性，「每月第 N 个周几」按性别写 1-й／1-я／1-е；日期写 日.月；「N 个已收藏」按俄文复数）。`?lang=ru`、俄语手机自动进。语言按钮多了 Русский。`atm-i18n.js` 认 ru（i4），`cardB.js`（cb172）、`asia-map.js`（r28）读 `note_ru`。中国大陆（不含港澳台，用户 11/18）49 张卡有 `note_ru`，10 张有 `directions_ru`（含探戈帮、ATer 指路图，图注 `caption_ru`）。自动处理也会写大陆卡的 `note_ru`／`directions_ru`。版本 `atm-ru.js?v=ru1`、`atm-early.js?v=ea7`、`atm-later.js?v=lt19`。还没找人审稿。
- **介绍资料**：`asia/organizers.json`（刘峥、王凯）、`asia/djs.json`（Yelyn Woo，空），介绍页 `/organizer/<id>/`。**DJ 名字自动链到介绍页（用户 11/21）**：卡上 DJ 名字先找 `djs.json`（→ `/dj/<id>/`），找不到再找 `organizers.json` 里的个人（不含团体，→ `/organizer/<id>/`），按 `name`／`name_zh`／`match` 比对。所以同时是组织者和 DJ 的人（如刘峥）只要在 organizers.json 有一份就会连上，不必在 djs.json 再写一次。生效位置：单卡页 🎧 那行（含 DITM 这种精选活动，`cardB.js` 的 `djLinks()`）、每周卡的 DJ 行（`paintDj()`）、`tools/gen_detail_pages.py` 产的活动详情页日程（改了资料要重跑该卡：`python3 tools/gen_detail_pages.py <id>`）。列表卡仍是纯文字（整张卡是点击区）。以后新加某人的介绍页，他在各卡当 DJ 的地方就自动可点；详情页要重跑一次生成工具。 **从介绍页进卡片再按 ‹（用户 11/21）**：从组织者／DJ／团体／品牌页（`/organizer/`、`/dj/`、`/group/`、`/shop/`）点进活动卡，卡片左上角 ‹ 回到那个介绍页（能用浏览器历史就用 `history.back()`，保留滚动位置；不行就直接打开介绍页）。做法：介绍页点 `?card=` 链接时写 sessionStorage `atm_prof_from`（`{id,url,t}`，`dj-page.js`／`group-page.js`／`shop-page.js`），卡片的 ‹（`atm-home.js` 的 `atmP7Back` 开头 `profBack()`）先看这笔：卡片编号要一样、60 秒内打开的才算，用一次就删。其他来路（地图列表、收藏、分享链接直接打开）照原来的逻辑。卡片页里再点别的卡，编号不同，不受影响。版本 `atm-home.js?v=h211`、`dj-page.js?v=d15`、`group-page.js?v=g5`、`shop-page.js?v=s2`。
- **DJ 场次记录与 DJ 介绍页（用户 11/21）**：网站原本没有 DJ 历史（每周卡的 DJ 跟着海报走，历史海报 30 天后删）。现在有一本只加不删的记录 `data/dj-sessions.json`（日期、DJ、活动卡、活动名、城市、来源），由 `tools/dj_sessions.py` 维护：来源是有日期的海报（`poster_djs` + `poster_dates`，或文件名里的日期；`…T012604Z` 上传时间戳不算）、每周卡的 `dj` + `poster_date`、大型活动 `schedule[].dj`。**一个晚上算 1 场**（同一 DJ、同一活动、同一天只算一次）。11/21 用 git 全部历史补了 84 条、75 个名字，最多的人 2 场。
  - **每天自动**：`poster-prune.yml`（北京 03:17）在清历史海报**之前**跑 `python3 tools/dj_sessions.py daily`，更新记录、`asia/dj-recent.json`（每个介绍页的最近 5 场）、`data/dj-candidates.md`（候选名单）。
  - **门槛 3 场，先给 Shiao 过目**（用户定）：满 3 场、还没介绍页的人列在 `data/dj-candidates.md`，不自动上线。Shiao 同意后跑 `python3 tools/dj_sessions.py approve <名字> --id <网址名> [--name 英文] [--name-zh 中文] [--city City]`：写进 `asia/djs.json`（简介空着）、产生 `/dj/<id>/` 和 `/zh/dj/<id>/`。卡片上的名字会自动连过去（见上一条）。
  - **同一人**：只合并「大小写、空格、标点、结尾的（城市）不同」的写法，同一张卡的 `dj`／`dj_en` 对照，`djs.json`／`organizers.json` 里的 `match`，以及 `data/dj-names.json` 的 `same`（Shiao 确认的）。不要做页面的写进 `skip`。候选名单里出现在多个城市的会特别标出（可能是同名的两个人）。
  - **DJ 页**（`dj-page.js?v=d16`）：没有简介时显示「介绍待补充。」；「最近担任 DJ 的场次」列出最近 5 场已经过去的（读 `dj-recent.json`），超过 5 场写「地图上共记录 N 场」；组织者页（如刘峥）有记录也会显示。「近期在地图上担任 DJ」改成只列还没到的：每周卡要当期海报日期是今天或以后，不再把旧海报的 DJ 算进去。
  - 测试：`python3 tools/test_dj_sessions.py`。
  - 11/21 用户确认：**Ban A = Bana = Ban-A**，名字统一写「Ban A」（WExJslMr、E116、JHeguuQb 三张卡和两个详情页已改，`dj-names.json` 的 `same` 有记录）。**Jessie = Jessie (SH)**（用户 11/21，卡上写法不改，「(SH)」是标城市）。`tbc`／`待定` 这类占位不算 DJ。
- **团体介绍页**（11/19 起）：`organizers.json` 里加 `"kind":"group"` 的条目就是团体（第一个：探戈帮 `tangobang`），页面在 `/group/<id>/` 和 `/zh/group/<id>/`。`members` 写团体的人（如 Vivian Yeh）：活动卡的主办栏会显示「Vivian Yeh（探戈帮）」，括号里的团体名链到团体页；团体页「活动」列出主办里有这些人的卡。团体不是个人组织者，不要把团体名写进卡片的 `organizers`。 **11/20**：团体页和组织者页把活动放在最上面（`dj-page.js` 的 `rich()`），每行有小海报、名称、「每周五 21:00–01:00 · 下次 11/20」、场地和星星（写进 `atm_fav_v1`，和地图的收藏同一个），按下次日期排，下面有「在亚洲探戈地图看全部」。DJ 页不变。 11/19 加了 Vivian Yeh 个人介绍页 `/organizer/vivian-yeh/`（中文用户给的，英文是 Claude 翻的；没有照片）：卡上主办栏现在是「Vivian Yeh（探戈帮）」，名字链到个人页，括号里的团体名链到团体页。`links.website` 显示为「网站」；微信号显示为文字不加链接；bio 里空行会保留分段。
- **团体活动并在一起（11/20 用户定，第一阶段已做）**：卡片加 `"groups":["tangobang"]`（三个 JSON 一起改；没写时仍按 `members` 找）。① 首页列表卡（`atm-home.js` 的 `card()`）场地下面有「探戈帮 ›」小标签，点了进团体页；organizers.json 只在有这种卡时才在背景载入。② 卡片详情（`cardB.js` 的 `grpOther`）海报下面有「探戈帮的其他活动」，同一场地写「同一场地」，有课程时加「还有每周课程 ›」，最后「探戈帮全部活动 ›」。③ 团体页改用 `asia/group-page.js`（组织者页、DJ 页仍用 `dj-page.js`），顺序是用户定的：一句话简介＋微信（点了复制）／网站／介绍按钮 → 30 天内的大活动黄色提示 → 日常活动（每周的）→ 大活动（工作坊、探戈节，没有就不显示）→ 课程 → 关于（完整介绍默认折叠、场地、主理人）。课程资料写在 organizers.json：`classes`（`[{weekday,time,level,level_en,venue,teacher}]`）和 `classes_note` / `classes_note_zh`；**课程不做成活动卡、不进地图列表**。工作坊照常开活动卡（会进「大型」），标上 `groups` 就会出现在团体页。新增的英文句子已加进韩／西／俄文层。**11/20 晚用户修改**：团体页顶部只留「网站」「介绍」两个按钮（微信只在课程那段出现）；「关于」里的场地只列 organizers.json `venues` 里的（探戈帮只有永惠大厦，Tango Palace 不列），不写「有问路图」；日常活动不折叠。**收藏团体（11/20 用户定）**：团体只能按星星收藏，**不放「要参加」「感兴趣」**（团体没有日期，主办收到也没用）。星星在团体页右上角，和卡片页同一个位置。存在访客手机的 `atm_fav_groups_v1`（`[{id,name,name_zh,photo,seen,added}]`，只在本机，不经后台）：按下去把团体现有活动加进 `atm_fav_v1`；之后地图（`atm-home.js` 的 `grpSync`）看到这个团体新加的活动，自动加一次（记在 `seen`，所以单独取消某场不会再被加回来）；取消团体只拿掉当初由团体加进去的（`added`），自己单独收藏的留着。「收藏」页最上面显示团体卡（logo、名称、「N 场活动 · 看全部 ›」），点了进团体页。**待探戈帮提供**：课程时间和级别、近期工作坊、上海国际探戈节 2027 日期。**已确认（用户 11/20）**：Practica Sunderland（R273）是探戈帮的活动，在 Tango Palace 办；但 Tango Palace 不是探戈帮的场地，所以团体页「关于」的场地不列它，日常活动里那一行照常写 Tango Palace。课程那段的「报名、时间请联络：微信 Tango_China」保留。
- **卖鞋／卖衣服品牌页（11/19 示例，用户：先做两家试试，现场取货和收费先不考虑）**：资料 `asia/vendors.json`（`kind` shoes／clothing，`products`、`buy`、`events` 列出会摆摊的活动卡），页面 `/shop/<id>/`、`/zh/shop/<id>/`，程序 `asia/shop-page.js`、样式 `css/shop-page.css`。现在只有 `sample-shoes`、`sample-dress` 两个示例（`sample: true` 会在页顶显示「示例页面」，图在 `images/shop/sample/`），页面 `noindex`、没放进菜单。ATM 只展示，不经手买卖。等用户给真品牌后换掉示例，再决定入口（≡ 菜单「探戈好物」、活动卡标签）。
- **手机速度（11/19，用户）**：① `atm-star.js` 不再一打开就下载完整 `events.json`，等 core 载入就好，找不到卡时才下载（#265）。② `sw.js` 加了缓存（#271）：带 `?v=` 的 JS/CSS 直接用手机里的，活动 JSON 和图片先用手机里的再在背景更新，网页 HTML 不缓存；`atm-data.js`（r13）让每位访客都注册 `sw.js`（原本只有开推送的人）。所以**改 JS/CSS 一定要加 `?v=`**，不加的话手机可能一直用旧版。要撤回就删掉 `sw.js` 末尾的 fetch 处理。本机模拟 3G，第二次打开卡片页 5.3 秒 → 0.6 秒。资料按语言分开（少约 22 KB）用户同意先不做。还没在中国真实 4G 上测过。
- **卡片资料新旧（11/19–20，方向文件第 2 件，用户定）**：`cardB.js` 的 `p10freshInfo()`／`p10freshEl()`，放在**卡片正面**（每周卡在「更多」左边，单次活动在主办下面）。日期用 `confirmed`（主办确认日，以后每周确认信写入），没有就用 `updated`。≤30 天绿色「✓ 资料 X 天前更新」；31–90 天灰色「资料 MM/DD 更新 · 请再次向组织者确认」；超过 90 天橙色「⚠ 资料已久未更新，可能停办了」。韩西俄文在 `atm-ko/es/ru.js`。
  - **`updated` 的新规矩（用户 11/20）**：只有**确认活动还在办**（主办或探戈助理有依据、换了新一期海报、改了时间场地等实质资料）才把 `updated` 改成当天；补翻译、改格式、换缩图不改 `updated`。
  - **资料不完整（用户 11/20）**：卡上没有任何联络方式、也没有任何链接的，正面显示灰色「联络方式待补充，出发前建议先向当地舞友打听」（`p10noReach()`，优先于新旧提示；11/20 用户嫌原来橙色「⚠ 资料不完整，没有联络方式，请勿专程前往」语气太强，改软）；补了联络方式或链接就自动消失。当时约 28 张（大陆、港台，多是 10/27 雷达汇总表和台湾网上日历批量导入的）。连地址都没有的 3 张先隐藏：香港 La Milongaza（kOcru3n3）、台北 Baile del Domingo（R083）、竹北 Tango al Rio（E091），补到地址再放回。**新卡规矩**：要有完整地址（路名门牌或查得到的场地）＋至少一种联络方式或链接才上线；`inbox_autocheck.py` 已检查，`inbox.yml` 提示也写了。`data/stale-cards.md` 末尾列出这些卡给探戈助理补。
  - **每月快过期名单**：`tools/stale_cards.py` 由 `.github/workflows/stale-cards.yml` 每月 1 号 09:13（北京）跑，写 `data/stale-cards.md`（超过 60 天的大陆、港台卡；超过 120 天的另列给 Shiao 决定隐藏还是保留，不自动删）。**11/20 起由 Claude 核对**（用户定）：同一个流程的第二步 `check` 用 Claude Code Action（WebSearch／WebFetch）在公开网页找最近消息和主办链接，写成一份 `data/inbox/<日期>-stale-check.md`，推到 main 后启动 `inbox.yml` 照一般答复处理（`updated`、`links` 可自动上线）。Claude 看不到微信；探戈助理在群里交的答复本来就会让活跃的卡更新。查不到的列在答复里给用户。手动跑：Actions →「Monthly stale-card list」→ Run workflow。
- **后端**：`social-worker/src/`，部署成 Cloudflare Worker `tango-subscribe`（api.tangoweekend.org），D1 `tango-subscribe`，迁移在 `social-worker/migrations/`（最新 0019）。
- **后端部署**：GitHub Actions →「API deploy」→ Run workflow，输入 `deploy`。**部署前先问用户。**
- **寄信**：通知信 `SOCIAL_MAIL=sub_mail`（Cloudflare Email Sending，已开通）；**订阅信 `MAIL_PROVIDER=cloudflare`（11/17 晚用户在后台改的，已用 Chrome 核对）**，寄件人 `SENDER`=subscribe@tangoweekend.org、`SENDER_NAME`=Asia Tango Map。QQ／163 测试（11/17）：进收件箱、很快、寄件人显示 Asia Tango Map、6 位验证码能登录。有问题把 `MAIL_PROVIDER` 改回 `gmail` 即可。**11/17 晚（用户定）**：后台 `NOTIFY_TO`、`WX_NOTIFY_TO` 都只留 selecttango@gmail.com（Chrome 里改）；程序里 `SUB_CC`、`LETTER_CC` 设为空，不再抄送探戈助理（#200）；微信「我已添加」通知改走 `deliver()`＝Cloudflare，不用 Resend（#201）。已跑「API deploy」上线（run 44087903753，成功）。订阅者名单在 D1 `tango-subscribe` 的 `subs` 表（网站订阅）和 `users` 表（帐号）。**#203 每月名单**：`social-worker/src/roster.js`，每个北京月份第一次 10 分钟定时任务把两张表做成 CSV 文字寄到 shiao.li.chang@gmail.com（`ROSTER_TO` 可改，`ROSTER_SEND=off` 关掉；表 `roster_log` 记录，失败每 6 小时重试）；Claude 定时任务「ATM 每月订阅者名单存到 Google Drive」每月 1 号 12:23（北京）把信存成两张 Google 表格，放在 shiao.li.chang 的 Drive 资料夹「ATM 订阅者名单」。11/17 已存第一份（2026-11）。**名单只放用户自己的 Drive，不进仓库。**「要参加／感兴趣」信：测试阶段只寄到 `GOING_TEST_INBOX`=selecttango；**唯一例外**是 `GOING_TEST_DANCER`（shiaochang@icloud.com）点的会真的寄给主办方；`GOING_NOTICE_SEND=on` 后才正式寄给所有主办方（抄送 selecttango）。**用户不要用 Resend**（Cloudflare 是付费 Workers 方案）。

## 3. 工作方式

- **新会话先接仓库**：本环境默认连不到 `Shiao64/my1`（gh 会回 403）。先调用 `add_repo`（owner `Shiao64`、repo `my1`、access `push`），再 `git clone --depth 1 https://github.com/Shiao64/my1 /home/claude/my1`（给长一点的超时），然后 `register_repo_root`。
- 开分支 → commit → `git -c push.negotiate=true push` → `gh api repos/Shiao64/my1/pulls …` 开 PR → `gh api -X PUT …/pulls/N/merge -f merge_method=merge`（偶尔回 connection reset，再查一次 PR 状态，通常已合并）。
- 要改「探戈助理答复」PR 的内容：`git fetch origin +refs/heads/inbox-run-<n>:refs/remotes/origin/inbox-run-<n>`，在上面 commit，`git push origin <本地分支>:inbox-run-<n>`，再合并（#151 这样做过）。
- 接上仓库后，gh **可以**读 Actions 记录：`gh api "repos/Shiao64/my1/actions/runs?per_page=10"`。不能删分支（仓库里留着已合并的旧分支，无害）。详细 log 还是要用内置浏览器（用户的 GitHub 已登录），原始记录用「View raw logs」。
- 本环境的终端和 WebFetch 都连不到 `data.tangoweekend.org`（R2）；确认上传是否完成，看 Actions 里「R2 sync」的结果，或用内置浏览器打开正式网站（tangoweekend.org 要先 `request_access`；内置浏览器的 navigate／javascript 有时会被自动安全检查挡下，挡下就改用本地 Playwright 验证）。
- 仓库里有一个已合并的旧分支叫 `inbox`，所以**分支名不能用 `inbox/` 开头**（探戈助理用 `answer/`）。
- commit 和 PR 说明结尾加系统提示里给的署名行。
- `tools/__pycache__/` 里有**被 git 追踪**的 .pyc，不要删；跑完 tools 里的 Python 后用 `git checkout -- tools/__pycache__/` 还原，新产生的 .pyc 不要 commit。
- **测试**：
  - 后端：`node social-worker/test/*.test.mjs`。main 上**本来就有 14 个失败**，PR 只要不新增失败就行。
  - 自动上线检查：`python3 tools/test_inbox_autocheck.py`（20 个）。
  - 前端：本地 `python3 -m http.server 8765`，Python Playwright + `/usr/bin/google-chrome`，iPhone UA、390×844，测中文加 `locale='zh-CN'`。桌面版用 1440／1024／700 宽截图。把 `https://data.tangoweekend.org/**` 拦掉，页面就会用仓库里的 JSON。首次打开有免责声明：点 `#atm-notice-go`。测试脚本放在 `/home/claude/test`——**这个目录不会跨会话保留**，新会话里没有就照这个思路重写。
- 文件里有邮箱时，终端输出会被隐私插件拦；打印前用 sed 遮掉。

## 4. 自动处理答复（inbox）

（11/16–11/17 的状态记录、各个 PR 的经过已移到 `docs/atm-log.md`。）

- 流程：探戈助理把答复放在 `answer/...` 分支开 PR → `inbox-guard.yml` 只准改 `data/inbox/`，通过就自动合并并启动 `inbox.yml` → Claude Code Action（秘密 `CLAUDE_CODE_OAUTH_TOKEN`，用户的 Pro 方案，约 2027-11 到期）处理答复，开「探戈助理答复：…」PR → `tools/inbox_autocheck.py` 判断能不能自动上线。
- **探戈助理用的是用户自己的 GitHub 帐号 `Shiao64`**（#143、#145、#150、#153 都是这个帐号开的），不用加 `allowed_bots`。
- **单场的变动用 `temp_notices` 写在那一天**，不改整张周常卡的固定字段（11/16 用户定；换海报时按海报改 `dj` 是例外，见第 2 节）。
- ~~**#148**：只要还有没合并的 `inbox-run-*` PR，新的处理就先等，并在那个 PR 下留言；那个 PR 合并后会自动再跑一次。~~ **11/18 改成不排队（用户要求）**：`tools/inbox_queue.py` 找出还没被开着的 `inbox-run-*` PR 处理过的答复，只处理那些；能自动上线的照样上线。改到同一张卡的，后来的 PR 不自动上线，留言等前一个。`inbox-refresh.yml`：main 的活动资料一变（或自动合并后、每日清理后），把还开着的答复 PR 和 main 接上，活动 JSON 按卡合并（PR 自己改的卡用 PR 的，其他用 main 的），草稿名单重新产生；有别的冲突就在 PR 下留言要 Claude 处理。测试：`python3 tools/test_inbox_queue.py`。
- **#149 + #152 自动上线**（用户 11/16 决定）：`tools/inbox_autocheck.py` 比较 PR 和 main，决定能不能自动合并（不靠处理的 Claude 自己说）。可以自动：
  - PR 说明最后一行「需要确认：无」；只改 `asia/events*.json`、`data/inbox/`、`data/entities-draft/`，或换海报工具产生的文件；
  - 已有的卡：补空着的地址／交通／联系方式、加单场 `temp_notices`、`cancelled_dates`；
  - **换新一期海报**（#152）：必须是 `radar_poster_update.py` 换的（`tools/radar-poster-log.jsonl` 有该卡的 replaced 记录）；允许该卡的海报字段、和新海报 DJ 一致的 `dj`/`dj_en`、该卡的海报／缩图／备份图片、网页里只有缓存版本号的改动；
  - 新卡：中国大陆或香港、资料齐全（名称、城市、时间、场地、地址、来源；日期没过或有每周几）、放进 events-core、不像现有的卡（同城同日同场地或同名；多日活动只比名称）；
  - 一次最多 8 张卡。其他都等，PR 下面会留言写原因。
  - 自动合并后，流程会自己启动 R2 sync、发活动变动推播、还有答复在等就再跑一次。
- **R2 同步**（#198 前一次要上传 1200 多个文件，20–40 分钟；#198 起只传改过的，见下面「2026-11-17 晚更新」）。同步有排队规则（`concurrency`，不取消正在跑的；排队中的只留最新一个，被它取代的那次显示 cancelled，无害，因为最新那次包含了它的改动）。合并不会触发同步的情况（例如只改 `tools/`）要手动启动：`gh api -X POST repos/Shiao64/my1/actions/workflows/r2-sync.yml/dispatches -f ref=main`。**改了资料后，要等同步跑完，数据站上才有新的图和数据**；PR 里如果用到新的图，先确认同步能上传它再合并。
- **只传改过的文件**：`tools/r2_sync_cards.py` 在数据站上存一份清单 `asia/sync-hashes.json`（每个文件的 sha256）。同步时图片 sha256 和清单相同就跳过；三个活动 JSON 每次都传；最后才写清单（中途失败，下次会重传）。读不到清单（第一次、或被删）就全部上传并重建清单，所以 **#198 合并后的第一次同步仍要 20–40 分钟**，之后通常几分钟。有人手动改过数据站时：Actions →「R2 sync」→ Run workflow，勾 **full** 全部重传（命令行 `--full`）。测试：`python3 tools/test_r2_incremental.py`。

## 5. 待办

0. **用户 11/17 决定**：正式寄信给主办方（`GOING_NOTICE_SEND`）先不要开；繁体中文、推播先看工作量再定；西文俄文、东京卡不急。
0. **确认 #198 上线**：看合并后第一次「R2 sync」跑完（全部重传）、第二次是否只传几个文件；第二天北京时间 03:17 后看「Daily past-poster cleanup」有没有正常跑。
1. **订阅信改用 Cloudflare 后**：再看一次真实订阅（QQ／163）和一次微信「我已添加」，确认 selecttango@gmail.com 收到通知。每月名单已改成自动存 Google Drive（#203）；名单页暂不做。
2. **要问主办的事**（协作须知第六节；11/20 起由用户去问，探戈助理不私信主办，只在群里看到答案时交）：郑州 Tango Red 周日练习场、北京 Paraíso 的「泥人」、广州 Cadencia No.65 场地、香港 Mascarita 12/4 时间票价、北京 Milonga V 第215场的 DJ（海报已由 #193 放进 `posters_past`，等同步跑完才上线；第215场 DJ 还没有）、杭州 inTango 周三是否每周固定和票价（固定就改成周常卡）。
3. （已取消：不再用邮件和探戈助理联络。）
4. **东京 4 张暂缓**（用户说中国以外不急）：Tentación 11/24、12/1（四谷 Sin Rumbo）、12/4（奥沢），El Compás 11/21（麻布十番，缺店名）。答复原文和海报都在 `data/inbox/done/`。另外东京 NAMI 11/18（时区不清）、WE LOVE MONDAYS、香港 Monday Blues 资料不全，没建。
5. **资料结构第 3 步**（用户 11/17 晚定）：**先北京、再上海，其他城市（含香港、台湾）先不做**。**先人工核对**团体、组织者、场地、名称、地址、联络方式，核对完才进资料库。人工核对表放在用户 Google Drive（shiao.li.chang）资料夹「ATM 资料核对」，**北京、上海各一份**「ATM 北京／上海 场地、团体、组织者 人工核对表」，各有五张表：说明、团体（成员＝组织者）、组织者（所属团体）、场地、活动卡（主办分「主办团体」「主办个人」）；联络方式分三栏：电话、邮箱、社交账号（微信、Line、Kakao、Instagram、Facebook、WhatsApp 等，可写几个）。**用户确认是团体的**：Shanghai ESSA、Milonga V、Milonga 1758、ATer Club、AS Tango阿根廷探戈学校、探戈帮；其他团体标「推测，请确认」，新团体暂用编号「新##」。同资料夹里标「（旧版，勿用）」的三份是早先版本。生成脚本不在仓库（表里有联络方式）。用户找人核对后交回 → 照改网站卡片 → 正式编号写进资料库（活动卡加 `venue_id`、`host`）→ 撞场检查、更新探戈助理须知。本对话没有 Google Sheets 连接器，只能读表、不能改原表。（做了之后，`inbox_autocheck.py` 的「可能重复」判断可以改用 `venue_id`。）
   - 11/18 两份表的「活动卡」页加了「周期／规则／第几届／属于哪张周常卡」四栏（已按网站资料先填好；核对结果现在是 M 栏）。上海 R030、izAYSxss、R0E9XeyL、R034 是**每月一次**，以「规则」栏为准。
   - 11/18 晚读回：结果在 `data/entities-draft/checked-groups.json`（手写，`draft_entities.py` 不会盖掉）。北京 9 个团体全部确认；上海只核了团体页，麦克的探戈世界、猫猫探戈、Tango Palace 还没确认，组织者／场地／活动卡三页还没核。**还没定（要问用户）**：台风那行只写「taifengo」；金尚首层（V006）和 V014 是否同一场地。
   - 两段的完整经过见 `docs/atm-log.md`。
6. 探戈助理的答复 PR：自动上线不了的（PR 下有「这次没有自动上线」留言）才需要看；用户说「看一下探戈助理的 PR」时检查后合并。
7. ~~B9 确认信旧说法~~ ✅ #205 已部署（11/17）。
8. 东京 R075–R078 补门牌地址（暂缓）。
9. 以后：正式寄信给主办方；订阅地区／频率；介绍资料补韩文 `bio_ko`；场地页、主办方页。

## 6. 还在等用户决定的事

- **繁体中文**：港台用户要不要显示繁体，还是全站都用简体——还没定（现在是所有中文变体都显示简体）。
- **韩文**：已对所有人开放（#179）；用户还在找人审稿，审稿意见出来再改 `atm-ko.js`。
- **西班牙文、俄文**：11/18 已上线（#242、#244），卡片说明只做中国大陆。日文还没做。还没找人审稿。
- **推播通知**：用户问过推播到底有没有用，还没结论；目前订阅以大型活动推广和报名／截止信息为主。

## 7. 容易踩的坑

- **两个 PR 都改同一张卡所在的 JSON（只有一行）一定冲突。**解决办法：取 main 的版本，用 Python 读出对方 PR 里那张卡（按 `id`），替换进 main 的版本，再用紧凑格式写回（`separators=(',',':')`, `ensure_ascii=False`），页面里缓存版本号用 main 的（同步会自己加）。#194 就是这样处理的。
- 把用到「数据站上还没有的文件」的 PR 先合并，网站会去要一个不存在的文件（打不开）。先让同步能上传、跑完，再合并（#193／#194 的教训）。
- 在 Cursor 里开工的人和 Claude 同时改同一类文件，会冲突；分工见第 0 节。
- 改 JS 忘了在**两个** index.html 加版本号 → 用户手机还是旧版。
- `zh/asia/index.html` 不在 `asia/` 目录下，`git add asia` 不会带上它。
- 活动地址里**不要写交通**，放 `directions` / `directions_en`。
- 「R2 sync」会拒绝上传「线上有、仓库没有」的卡片，这时跑「R2 pull」。
- 后端部署一定要 `--keep-vars`（部署按钮已内建）。
- `atm-ko.js` 只按**完全相同的英文句子**翻译；按钮里有 emoji 时，把 emoji 和文字放在不同的 span，否则不会翻译。
- `cardB.js` 的 `rebuild()` 曾经少定义 `wl`，有微信号的卡详情打不开（#130 已修）；改联系人那段时注意两处都要有。
- 活动 JSON 每个文件只有**一行**，两个同时改资料的 PR 一定会在 git 里冲突；一次合并一个，后一个重新从 main 开分支。
- 探戈助理的附件多半是**手机截图**（带浏览器边框），当海报用之前要裁切；被截掉一半的海报宁可不用，让系统产文字海报。主办直接寄来的海报原图（例如第216场）可以直接用。
- 新的 `type` 值（例如 encuentro）要确认 `atm-home.js` 的 `catOf()` 和 `cardB.js` 的 `P10TN` 都认得，否则会被当成日常舞会、标签显示英文。
- **`source` 只写来源和日期**（如「主办邮件 2026-11-20」），**不写邮箱、手机**：JSON 公开，`source` 还会显示在活动详情页「资料来源」。卡上 `contacts` 的公开联络方式照常（11/20，#316 已清过 8 张，见 `docs/atm-log.md`）。
- **海报字段不要加 `?v=…`**：卡片会去要带这个参数的缩略图，文件上传前被记成「找不到」后就一直 404。要让旧图失效，就换新文件名（如 `GqufXmMX-216.png`），不要同名换图（探戈帮 `tb1`、Milonga V 第216场都踩过，见 `docs/atm-log.md`）。
- 改 `data/inbox/README.md` 也会触发一次 `inbox.yml`。inbox 里如果还有未处理的 `.md`（目前是 E175），这次运行会把它们一起交给 Claude。所以这次预告卡没有改 README。
