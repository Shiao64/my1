# ATM 交接说明（给下一个 Agent）

写于 2026-11-15，**2026-11-16 傍晚更新**：main 到 #161。接手 tangoweekend.org/asia（亚洲探戈地图，ATM）的工作前，先读这一份，再读同一项目里的其他文档。

这份有两个地方：claude.ai「ATM」项目里的 `claude/ATM-交接说明.md`（完整版），和仓库里的 `docs/atm-handoff.md`（公开版，给探戈助理也能读；探戈助理的邮箱等联络方式只写在项目版）。**两份要一起改。**
- 公开版网址：https://raw.githubusercontent.com/Shiao64/my1/main/docs/atm-handoff.md

## 0. 和 Shiao 合作

- **一律用中文回复。** 用户纠正过好几次。
- 写到 Shiao 时用「他」（用户 11/16 改过一封信里的称呼）。
- 用户是活动组织者，不是工程师。说明要白话，少用术语；必须用时顺便解释（例：部署 = 上线）。
- 节奏：用户提需求 → 你给方案（简短，列选项和建议）→ 用户回「做」「1」「合并」之类 → 你做完、测完、开 PR、合并 → 用中文汇报结果和下一步。用户说「你设计，更改」时，直接选一个方案做完、截图检查后上线。
- 会改正式网站或后端的动作（部署、改 Cloudflare 设置），**先问一句再做**。只改前端、合并 PR 后自动上线的，用户已授权直接合并。
- **用用户的 Gmail 寄信**：先建草稿给用户看，用户回「发」才寄。
- 方案上线前，用户希望有人复查，并在不同手机浏览器上测过。
- 不要让用户把密码、API token 贴在对话里。要登录网站时，请用户自己登录。
- **地区优先顺序（11/16）**：先做中国大陆和香港；中国以外（东京、首尔等）现在不急，先放着。
- 用户常直接贴一张卡的网址，接着说哪里不对；先打开看，再问或直接修。

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
- **活动数据**：`asia/events.json`、`events-core.json`、`events-more.json`，三个文件同一张卡要一致，格式是紧凑 JSON（`separators=(',',':')`, `ensure_ascii=False`；events-more 结尾有换行）。合并到 main 后，GitHub 任务「R2 sync」自动上传到 R2，约 15 分钟（排队时可能 30 分钟）。**不要直接改 R2。** 注意：用 GITHUB_TOKEN 合并的 PR 不会触发 R2 sync（自动上线流程已经自己补上启动）；本环境的 `gh api … /merge` 可以触发，11/16 验证过。
  - **新卡放哪个文件**：中国大陆／台湾／香港的卡和 featured 卡放 `events.json` + `events-core.json`；其他地区一般卡放 `events.json` + `events-more.json`。
  - **编号**：活动 `E###`（11/16 用到 E187），每周 `R###`（用到 R272）。`weekday` 0＝周日，3＝周三。
  - **写法规则（用户 11/16）**：没有结束时间写 `"20:30–late"`（中文页面显示「20:30–尽兴」）；海报没印场地名、但地址和已知场地相同，用那个场地名（杭州凤起路75号303室 → `inTango HangZhou`）；练习舞会 `type` 用 `practilonga`。
  - **手动建新卡的步骤**（#147、#157 的做法）：写进 JSON → 有官方海报就用换海报工具上（见下一条，单次活动要有 `regular_oneoff: true`）；大型活动的海报工具会拒绝，就手动裁好存 `images/asia/posters/<id>.jpg`，用 `tools/radar_poster_update.py` 里的 `thumb_image()` 产缩图、`update_atm_th()` 写尺寸表、`bump_live_caches()` 加版本号 → 没海报的跑 `python3 tools/ensure_posters.py` 产文字海报 → 手机尺寸截图检查 → PR、合并。
  - **换新一期海报**（已有的舞会／练习／单次活动）：`python3 tools/radar_poster_update.py --event-id <id> --image <图> --city 北京 --organizer <主办> --weekday 周二 --date YYYY-MM-DD --note "<第几场、DJ、来源>" --bump-caches`（先加 `--dry-run` 看）。它会备份旧海报到 `_backup/` 和 `past/`、产缩图、改 poster 字段，并按海报把卡上的 `dj` 改成这一期的 DJ（`poster_djs` 一一对应）——这是网站惯例，和「单场变动用 temp_notices」不冲突。大型活动、工作坊会被工具拒绝。
- **海报**：不是每个活动都要有海报。R2 sync 会自动补海报；没有新海报时保留上一期。
- **介绍资料**：`asia/organizers.json`（刘峥、王凯）、`asia/djs.json`（Yelyn Woo，空），介绍页 `/organizer/<id>/`。
- **后端**：`social-worker/src/`，部署成 Cloudflare Worker `tango-subscribe`（api.tangoweekend.org），D1 `tango-subscribe`，迁移在 `social-worker/migrations/`（最新 0019）。
- **后端部署**：GitHub Actions →「API deploy」→ Run workflow，输入 `deploy`。**部署前先问用户。**
- **寄信**：通知信 `SOCIAL_MAIL=sub_mail`（Cloudflare Email Sending，已开通）；`MAIL_PROVIDER` 还是 gmail。QQ／163 送达测试中。**用户不要用 Resend**（Cloudflare 是付费 Workers 方案）。

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

## 4. 目前状态（2026-11-16 傍晚）

已上线：新首页（页签 + fileteado 招牌，所有人默认）、韩文测试版（还没对外开放）、订阅验证码、后端部署按钮、中文城市名、地址与交通分开、路线图字段、A4 订阅入口（#131）、A5 菜单「订阅与账号」（#131）、香港／苏州地址补齐和微信号卡片详情打不开的修正（#130）。

**版面（11/16）**：
- **#159 桌面版标题栏**：用户说菜单和语言切换各在视窗一边、太远、不好看。600px 以上把标题栏限制在 480px 宽、置中，≡ 和 EN 贴在招牌两侧（顺序同手机）。
- **#160 平板竖屏白带**：`css/style.css` 在 700px 以下给 body 留 50px（给早已不存在的顶部广告条），601–700px 宽时标题栏上方出现白带；新版在这个宽度设为 0。
- `atm-home.js` 目前 `?v=h185`。

**和探戈助理怎么联络**：
- 探戈助理在 Grok 里，Claude 没有直接管道。它会读仓库里公开的两份文件：协作须知原件 `https://raw.githubusercontent.com/Shiao64/my1/main/data/inbox/README.md`（#158 起开头就有网址）和本交接说明公开版 `https://raw.githubusercontent.com/Shiao64/my1/main/docs/atm-handoff.md`（#161）。规则或待问清单变了，改原件（和项目里的副本）就好。
- 要写信给它：邮箱写在项目版交接说明里；用用户的 Gmail 寄（Gmail 连接器；先草稿、用户说「发」才寄）。11/16 15:08 已寄出第一封「ATM 协作须知更新（2026-11-16）：请每次开工先读最新版」。它回信会到用户的 Gmail；用户说「看一下探戈助理的回信」时，用 `search_threads` 找它的邮箱读。

**探戈助理自动处理已经在跑真实答复**：
- 流程：探戈助理把答复放在 `answer/...` 分支开 PR → `inbox-guard.yml` 只准改 `data/inbox/`，通过就自动合并并启动 `inbox.yml` → Claude Code Action（秘密 `CLAUDE_CODE_OAUTH_TOKEN`，用户的 Pro 方案，约 2027-11 到期）处理答复，开「探戈助理答复：…」PR → `tools/inbox_autocheck.py` 判断能不能自动上线。
- **探戈助理用的是用户自己的 GitHub 帐号 `Shiao64`**（#143、#145、#150、#153 都是这个帐号开的），不用加 `allowed_bots`。
- 11/15 深夜到 11/16 早上来了两批真实答复（#143、#145，共 15 份）。第一批的处理 PR #144 还没合并时，第二批来了，`inbox.yml` 把第一批的 3 份又处理了一次（#146）。11/16 用户决定：**合并 #146、关闭 #144**。单场的变动用 `temp_notices` 写在那一天，不改整张周常卡的固定字段——以后照这个做法（换海报时按海报改 `dj` 是例外，见第 2 节）。
- **#148**：只要还有没合并的 `inbox-run-*` PR，新的处理就先等，并在那个 PR 下留言；那个 PR 合并后会自动再跑一次。
- **#149 + #152 自动上线**（用户 11/16 决定）：`tools/inbox_autocheck.py` 比较 PR 和 main，决定能不能自动合并（不靠处理的 Claude 自己说）。可以自动：
  - PR 说明最后一行「需要确认：无」；只改 `asia/events*.json`、`data/inbox/`、`data/entities-draft/`，或换海报工具产生的文件；
  - 已有的卡：补空着的地址／交通／联系方式、加单场 `temp_notices`、`cancelled_dates`；
  - **换新一期海报**（#152）：必须是 `radar_poster_update.py` 换的（`tools/radar-poster-log.jsonl` 有该卡的 replaced 记录）；允许该卡的海报字段、和新海报 DJ 一致的 `dj`/`dj_en`、该卡的海报／缩图／备份图片、网页里只有缓存版本号的改动；
  - 新卡：中国大陆或香港、资料齐全（名称、城市、时间、场地、地址、来源；日期没过或有每周几）、放进 events-core、不像现有的卡（同城同日同场地或同名；多日活动只比名称）；
  - 一次最多 8 张卡。其他都等，PR 下面会留言写原因。
  - 自动合并后，流程会自己启动 R2 sync、发活动变动推播、还有答复在等就再跑一次。
  - 真实答复跑过两次（#151 北京 Milonga V 第216场、#154 杭州周三练习舞会），都因为 Claude 有问题要问而没自动上线，由我照用户决定处理后合并。**自动合并那一段还没在真实答复上走过**：下一批能自动上线的答复进来后，看 PR 留言、Actions 里的 R2 sync 和网站，确认真的上线。
- **#147 新建香港 2 张卡**：E186 香港探戈周末 Horacio Godoy & Maricel Giacomini（11/19–22，按名称归「探戈周末」）；R272 Wednesday Practica Mascarita（每周三 21:00–24:00，Danzstage，HK$100）。
- **#151**：Milonga V 第216场海报（DJ 改 Dandi），天蝎座免门票留在单场提示。
- **#155**：E175 RoyBeDDong in Busan（type encuentro）之前不在「大型」，改成算探戈周末。用户 15:37 还说看不到——应是手机缓存，请他刷新；收纳盒里的城市在「大型」也会被藏起来。
- **#157**：E187 杭州 inTango 周三练习舞会（11/18 20:30–late，inTango HangZhou，DJ Mia，有海报）；中文 late → 尽兴；practilonga 标签。
- **#158**：仓库里的协作须知原件和项目副本对齐（待问清单、自动上线规则、给探戈助理的网址）。
- **#161**：本交接说明放一份公开版到仓库 `docs/atm-handoff.md`，协作须知原件开头加链接。

**资料结构**：第 1 步完成（`tools/draft_entities.py`、`data/entities-draft/`），用户的回答记在 `decisions.json`。中国大陆和香港的待确认题已全部答完；海报不是必须的，没有海报不算缺资料。剩下的是补地址（列在协作须知第六节，交给探戈助理去问）。

## 5. 待办

1. **寄信测试结果**：11/16 10:00 的提醒（`trig_01ReqmRtFgMsi5qFCabt4CJ1`）已经发出，但送到的是 11/15 那个对话，**结果还没回到这里**。下次见到用户先问 QQ／163 收信测试：进收件箱还是垃圾箱、多久收到、寄件人是否显示 Asia Tango Map、6 位验证码能否登录。没问题就决定 `MAIL_PROVIDER` 是否也换 Cloudflare，并更新「收藏与订阅设计」第八节。
   - ⚠️ 那个提醒的文字有两处过时：「有问题可把 SOCIAL_MAIL 改回 resend」——用户不用 Resend，有问题先问用户（例如暂时改回 gmail）；「资料结构第 1 步」——早已完成。
2. **要问主办的事**（已写进协作须知第六节，也已写信给探戈助理）：郑州 Tango Red 周日练习场、北京 Paraíso 的「泥人」、广州 Cadencia No.65 场地、香港 Mascarita 12/4 时间票价、北京 Milonga V 第215场（11/10）海报和 DJ（拿到后放进 `posters_past`，不要变成当前海报）、杭州 inTango 周三是否每周固定和票价（固定就改成周常卡）。
3. **探戈助理的回信**：看用户 Gmail 里探戈助理有没有回信。
4. **东京 4 张暂缓**（用户说中国以外不急）：Tentación 11/24、12/1（四谷 Sin Rumbo）、12/4（奥沢），El Compás 11/21（麻布十番，缺店名）。答复原文和海报都在 `data/inbox/done/`。另外东京 NAMI 11/18（时区不清）、WE LOVE MONDAYS、香港 Monday Blues 资料不全，没建。
5. **资料结构第 3 步**：中国大陆和香港的活动卡加 `venue_id`、`host`，加撞场检查，更新探戈助理须知。用户还没说开始。（做了之后，`inbox_autocheck.py` 的「可能重复」判断可以改用 `venue_id`。）
6. 探戈助理的答复 PR：自动上线不了的（PR 下有「这次没有自动上线」留言）才需要看；用户说「看一下探戈助理的 PR」时检查后合并。
7. B9：确认信旧说法改掉（后端，要部署）。
8. 东京 R075–R078 补门牌地址（暂缓）。
9. 以后：正式寄信给主办方；订阅地区／频率；介绍资料补韩文 `bio_ko`；场地页、主办方页。Gmail 里给探戈助理往来设标签（用户还没决定要不要）。

## 6. 还在等用户决定的事

- **繁体中文**：港台用户要不要显示繁体，还是全站都用简体——还没定（现在是所有中文变体都显示简体）。
- **韩文开放**：韩文先做测试版，用户在找人审稿，审完才对外开放语言选项。
- **西班牙文、俄文**：以后要加，还没排时间。
- **推播通知**：用户问过推播到底有没有用，还没结论；目前订阅以大型活动推广和报名／截止信息为主。

## 7. 容易踩的坑

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
- 改 `data/inbox/README.md` 也会触发一次 `inbox.yml`。inbox 里如果还有未处理的 `.md`（目前是 E175），这次运行会把它们一起交给 Claude。所以这次预告卡没有改 README。

## 8. 2026-11-16 五项预告卡（已由 ATM 直接实现）

Shiao 在 ATM 聊天里批准的范围只有这一批，不是恢复其他工作：

- t1005u：这五项可以上线。
- t1006u：五项都是先把日期定下来的 placeholder。
- t1007u：预告卡设计（见下）。
- t1008u：不等 Claude，由 ATM 直接实现并上线。
- t1009u：交接必须写清楚。

原资料在分支 `answer/2026-11-16-preview-five` 提交 `bcf894f`，没有开 PR，因此没有触发 inbox 全量流程。六个文件都已按本批落实，Claude 不要再为它们新建卡：

- `data/inbox/2026-11-16-preview-card-design.md`
- `data/inbox/2026-11-16-beijing-alejandra-mantinan-workshop.md` → E188
- `data/inbox/2026-11-16-moganshan-tango-caravan-date.md` → E189（新建；没有改 R0E9XeyL）
- `data/inbox/2026-11-16-jakarta-championship-2027.md` → E190
- `data/inbox/2026-11-16-taipei-alejandra-workshop.md` → E191
- `data/inbox/2026-11-16-beijing-lucas-naima-workshop.md` → E192

这些文件不在 main 的 `data/inbox/` 里。`data/inbox/2026-11-16-busan-e175-category.md` 仍未处理。雷达、邮件和例行任务仍暂停。没有删除或移动旧任务。

预告卡字段：`preview: true`。有名称、城市、日期即可；类型只有用户写了才写（E189 没有类型）。中文界面显示「活动预告 · 详情待公布」，英文是 “Preview · Details to be announced”。没有主办海报，用 `images/asia/posters/generated/E18x.png` 简洁占位图。场地、地址、费用、联络方式留空，页面不显示这些空栏，也不显示到具体地址的导航。没有地址时只给城市级地图，并写「场地待公布」／“City map (not the venue)”。大型列表可见（`isFeat` 把 `preview` 算进去）。以后补资料改同一编号和 `?card=` 链接。

| 编号 | 名称 | 日期 | 正式链接 |
|---|---|---|---|
| E188 | Alejandra Mantinan Beijing Workshop（原文「北京 AS」只记在备注，不是主办） | 2027-03-02 至 2027-03-09 | https://tangoweekend.org/zh/asia/?card=E188 |
| E189 | 【Tango Caravan 大篷车】第3站 - 莫干山 | 2027-04-09 至 2027-04-11 | https://tangoweekend.org/zh/asia/?card=E189 |
| E190 | Jakarta Championship（festival） | 2027-06-10 至 2027-06-12 | https://tangoweekend.org/zh/asia/?card=E190 |
| E191 | Alejandra martinan Workshop（拼写未改成 Mantinan） | 2027-03-24 至 2027-03-30 | https://tangoweekend.org/zh/asia/?card=E191 |
| E192 | Lucas y Naima Workshop | 2027-05-10 至 2027-05-17 | https://tangoweekend.org/zh/asia/?card=E192 |

代码：`asia/atm-home.js`（预告标签、大型列表、莫干山中文名，`?v=h186`）、`asia/cardB.js`（预告行和城市地图，`?v=cb160`）、`asia/atm-ko.js`（对应韩文，`?v=k10`）、`asia/asia-map.js` 的缩图尺寸表（`?v=r21`）。两个 `index.html` 的版本号已一起加。测试：`python3 tools/test_preview_cards.py`，以及 `python3 tools/ensure_posters.py --check`。

回退点：上线前的 main 是 `68a136b`（Merge pull request #161），分支 `backup/live-20261116-before-preview`。实现 PR 是 #162，合并提交 `01f613e`（北京时间 2026-11-16 17:54）。部署走 GitHub Pages 加既有「R2 sync」（run 43844020410），不是整份覆盖 R2。

正式站核对（北京时间 2026-11-16 18:20）：

- 五个 id 和链接以公开 JSON 为准，不要对调：E188 北京 Alejandra Mantinan https://tangoweekend.org/zh/asia/?card=E188 ；E189 莫干山第3站 https://tangoweekend.org/zh/asia/?card=E189 ；E190 雅加达 https://tangoweekend.org/zh/asia/?card=E190 ；E191 台北 Alejandra martinan https://tangoweekend.org/zh/asia/?card=E191 ；E192 北京 Lucas y Naima https://tangoweekend.org/zh/asia/?card=E192 。
- 大型列表 `#h-feat` 已显示 E188、E192、E191、E189，日期分别是 2027/03/02–03/09、2027/05/10–05/17、2027/03/24–03/30、2027/04/09–04/11。E189 没有类型标签，仍然在大型列表里，没有被改成别的类型。
- E190 的单卡页已能打开（探戈节，2027-06-10 至 06-12，城市地图是 Jakarta, Indonesia）。它还不在大型列表里，因为公开 events-core 仍是 167 张、没有 E190。仓库里 #163 已把它放进 events-core。第一次 R2 sync [43844020410](https://github.com/Shiao64/my1/actions/runs/43844020410) 已成功；第二次 [43845464828](https://github.com/Shiao64/my1/actions/runs/43845464828) 18:20 仍在上传。这一项要等这次同步结束才算完成。
- 卡片正面（`asia-map.js?v=r22`、`cardB.js?v=cb162`）显示「活动预告 · 详情待公布」和「场地待公布 · 城市地图（非场地）」。E188 的地图是 Beijing, China；E189 是 Moganshan, China，不是莫干山路。没有具体地址导航。

还缺、没有编造的：五张卡的场地、具体地址、开始时间、费用、主办和联系方式。E191 的 martinan 与 E188 的 Mantinan 是否同一人，尚未核实。自动上线检查 `tools/inbox_autocheck.py` 仍按普通完整卡要求地址，没有为了这批关掉；这五项是经批准的实现 PR 上线，不是 inbox 自动合并。
