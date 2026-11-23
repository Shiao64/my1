# ATM 工作记录（过去的经过）

从 `docs/atm-handoff.md` 移出来的历史记录，2026-11-20 搬过来，原文没改。
**规则和现状以交接说明为准**；这里只在要查「当时为什么这样做、改了什么、回退点在哪」时才看。新的经过记录写在这里，规则写进交接说明。

文中「第 N 节」指交接说明当时的章节；「第 10 节」就是下面「去掉两枚公开邮箱」。

## 4. 目前状态（2026-11-17 晚；下面先写 11/16 的，11/17 的在「2026-11-17 更新」一段）

已上线：新首页（页签 + fileteado 招牌，所有人默认）、韩文（11/17 已对所有人开放）、订阅验证码、后端部署按钮、中文城市名、地址与交通分开、路线图字段、A4 订阅入口（#131）、A5 菜单「订阅与账号」（#131）、香港／苏州地址补齐和微信号卡片详情打不开的修正（#130）。

**版面（11/16）**：
- **#159 桌面版标题栏**：用户说菜单和语言切换各在视窗一边、太远、不好看。600px 以上把标题栏限制在 480px 宽、置中，≡ 和 EN 贴在招牌两侧（顺序同手机）。
- **#160 平板竖屏白带**：`css/style.css` 在 700px 以下给 body 留 50px（给早已不存在的顶部广告条），601–700px 宽时标题栏上方出现白带；新版在这个宽度设为 0。
- `atm-home.js` 版本号：11/16 是 `h185`，之后 Cursor 又加过（`h186`…），**以两个 index.html 里现在写的为准**。

**和探戈助理怎么联络**（11/17 用户定：**只走 GitHub，不用邮件**）：
- 探戈助理是 Cursor 里跑的 Grok Bot（11/18 用户说明），Claude 没有直接管道。**两边只靠仓库里的文件联络**：探戈助理把答复写进 `data/inbox/`（开 `answer/…` PR）；Claude 要告诉它的事写进协作须知原件和本交接说明。不写信给它，也不用去 Gmail 找它的回信。它会读仓库里公开的两份文件：协作须知原件 `https://raw.githubusercontent.com/Shiao64/my1/main/data/inbox/README.md`（#158 起开头就有网址）和本交接说明公开版 `https://raw.githubusercontent.com/Shiao64/my1/main/docs/atm-handoff.md`（#161）。规则或待问清单变了，改原件（和项目里的副本）就好。
- 11/16 曾用用户的 Gmail 寄过一封「协作须知更新」给它，没有回信；11/17 起不再用邮件。

**探戈助理自动处理已经在跑真实答复**：
- 流程：探戈助理把答复放在 `answer/...` 分支开 PR → `inbox-guard.yml` 只准改 `data/inbox/`，通过就自动合并并启动 `inbox.yml` → Claude Code Action（秘密 `CLAUDE_CODE_OAUTH_TOKEN`，用户的 Pro 方案，约 2027-11 到期）处理答复，开「探戈助理答复：…」PR → `tools/inbox_autocheck.py` 判断能不能自动上线。
- **探戈助理用的是用户自己的 GitHub 帐号 `Shiao64`**（#143、#145、#150、#153 都是这个帐号开的），不用加 `allowed_bots`。
- 11/15 深夜到 11/16 早上来了两批真实答复（#143、#145，共 15 份）。第一批的处理 PR #144 还没合并时，第二批来了，`inbox.yml` 把第一批的 3 份又处理了一次（#146）。11/16 用户决定：**合并 #146、关闭 #144**。单场的变动用 `temp_notices` 写在那一天，不改整张周常卡的固定字段——以后照这个做法（换海报时按海报改 `dj` 是例外，见第 2 节）。
- ~~**#148**：只要还有没合并的 `inbox-run-*` PR，新的处理就先等，并在那个 PR 下留言；那个 PR 合并后会自动再跑一次。~~ **11/18 改成不排队（用户要求）**：`tools/inbox_queue.py` 找出还没被开着的 `inbox-run-*` PR 处理过的答复，只处理那些；能自动上线的照样上线。改到同一张卡的，后来的 PR 不自动上线，留言等前一个。`inbox-refresh.yml`：main 的活动资料一变（或自动合并后、每日清理后），把还开着的答复 PR 和 main 接上，活动 JSON 按卡合并（PR 自己改的卡用 PR 的，其他用 main 的），草稿名单重新产生；有别的冲突就在 PR 下留言要 Claude 处理。测试：`python3 tools/test_inbox_queue.py`。
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

**2026-11-17 更新（#162–#196）**：
- **韩文对所有人开放（#179）**：手机语言是韩语的人，进 `/` 或 `/asia/` 会直接看到韩文；韩文链接可见，`hreflang ko` 恢复，不再 noindex。韩文仍由 `atm-ko.js` 提供。
- **语言切换（#180–#182）**：语言切换不放在 ≡ 菜单里，放在右上角，是**一个按钮**：地球图标 + 目前语言（中／EN／한），点开列出全部语言，目前的打勾（`atm-menu.js`，`atm-later.js` 版本 `lt17`）。名称已备好中文、English、한국어、Español、Русский。**以后加西班牙文／俄文**：在两个首页的 `nav.top-lang` 里加 `<a data-asia-lang-set="es|ru" …>` 链接，再做翻译层（像 `atm-ko.js` 那样，注意 `lang-pref.js`、`lang-keep.js` 要认新语言、首页的语言判断脚本也要认）；清单会自动多出新语言。用户说过韩文有「闪一下」的感觉，我没能重现，当时判断是缓存；如果再说，要重新查。
- **Cursor 做的（#183–#192，都已合并）**：去掉吉隆坡 E042 公开的 `love2tango` 邮箱（见第 10 节）；手机上路线大图的版面（`tools/test_route_lightbox.py`）；Milonga V 第216场海报的缩图改用新文件名 `GqufXmMX-216.png`（数据站上旧名字的缩图还是第214场）；探戈助理答复：E175 归档、香港 E152 换官方海报、新建深圳 E193（11/20 Milongueando en El Luna）并换上官方海报。
- **自动上线第一次真正跑通**：#192（E193 换海报）经 `inbox_autocheck.py` 检查通过后自动合并，PR 下有留言「检查通过，自动上线」，R2 同步也跟着跑了。
- **#195**：R2 同步也上传历史海报；**#193**（Milonga V 第215场历史海报）、**#194**（MiLONGAGA 第45场历史海报，我解决了和 #193 的冲突）已合并；**#196**：历史海报最多 4 张、不留 30 天前的（见第 2 节）。
- **R2 同步**（#198 前一次要上传 1200 多个文件，20–40 分钟；#198 起只传改过的，见下面「2026-11-17 晚更新」）。同步有排队规则（`concurrency`，不取消正在跑的；排队中的只留最新一个，被它取代的那次显示 cancelled，无害，因为最新那次包含了它的改动）。合并不会触发同步的情况（例如只改 `tools/`）要手动启动：`gh api -X POST repos/Shiao64/my1/actions/workflows/r2-sync.yml/dispatches -f ref=main`。**改了资料后，要等同步跑完，数据站上才有新的图和数据**；PR 里如果用到新的图，先确认同步能上传它再合并。

**2026-11-17 晚更新（#198，用户回「2 加、3 改、4 不问」）**：
- **只传改过的文件**：`tools/r2_sync_cards.py` 在数据站上存一份清单 `asia/sync-hashes.json`（每个文件的 sha256）。同步时图片 sha256 和清单相同就跳过；三个活动 JSON 每次都传；最后才写清单（中途失败，下次会重传）。读不到清单（第一次、或被删）就全部上传并重建清单，所以 **#198 合并后的第一次同步仍要 20–40 分钟**，之后通常几分钟。有人手动改过数据站时：Actions →「R2 sync」→ Run workflow，勾 **full** 全部重传（命令行 `--full`）。测试：`python3 tools/test_r2_incremental.py`。
- **每天自动清理历史海报**：见第 2 节「海报规则」。
- **没有海报的不问主办**，先用文字海报（见第 2 节）。
- **和探戈助理只走 GitHub**，协作须知原件第一节已写明。


## 8. 2026-11-16 五项预告卡（已由 ATM 直接实现）

Shiao 在 ATM 聊天里批准的范围只有这一批，不是恢复其他工作：

- t1005u：这五项可以上线。
- t1006u：五项都是先把日期定下来的 placeholder。
- t1007u：预告卡设计（见下）。
- t1008u：不等 Claude，由 ATM 直接实现并上线。
- t1009u：交接必须写清楚。
- t1020u：E192 主办确认为「王萌」；五张卡的公开说明去掉内部交接话。
- t1021u：E188 主办确认为「AS Tango阿根廷探戈学校」；预告卡公开说明的短句成为长期规则。
- t1022u：E190 城市确认为 Jakarta。其他没提供的资料留空，不因此删掉已确认的名称、日期、类型或占位图。

原资料在分支 `answer/2026-11-16-preview-five` 提交 `bcf894f`，没有开 PR，因此没有触发 inbox 全量流程。六个文件都已按本批落实，Claude 不要再为它们新建卡：

- `data/inbox/2026-11-16-preview-card-design.md`
- `data/inbox/2026-11-16-beijing-alejandra-mantinan-workshop.md` → E188
- `data/inbox/2026-11-16-moganshan-tango-caravan-date.md` → E189（新建；没有改 R0E9XeyL）
- `data/inbox/2026-11-16-jakarta-championship-2027.md` → E190
- `data/inbox/2026-11-16-taipei-alejandra-workshop.md` → E191
- `data/inbox/2026-11-16-beijing-lucas-naima-workshop.md` → E192

这些文件不在 main 的 `data/inbox/` 里。`data/inbox/2026-11-16-busan-e175-category.md` 仍未处理。雷达、邮件和例行任务仍暂停。没有删除或移动旧任务。

预告卡字段：`preview: true`。有名称、城市、日期即可；类型只有用户写了才写（E189 没有类型）。已确认的名称、日期、城市、主办保留在对应字段，不因说明改短而删掉，也不另编罗马字主办名。中文界面的预告行显示「活动预告 · 详情待公布」，英文是 “Preview · Details to be announced”。公开说明是另一处，今后所有 placeholder／预告卡一律只写这四句，不再公开内部备注、缺项、来源或待核实判断：`note_zh`「活动预告，详情待公布。」、`note` “Preview. Details to be announced.”、`note_ko` “예고. 자세한 내용은 추후 공개.”、`note_es` “Anuncio. Los detalles se anunciarán más adelante.” 缺了的场地、地址、时间、费用、联系方式留空，不猜。没有主办海报，用 `images/asia/posters/generated/E18x.png` 简洁占位图。页面不显示这些空栏，也不显示到具体地址的导航。没有地址时卡片里只写纯文字「场地待公布」／“Venue to be announced”，不再附「城市地图（非场地）」链接（t1019u，覆盖先前的城市地图链接）。地图本身的城市级活动点保留。有真实地址的活动仍用原来的地图导航。大型列表可见（`isFeat` 把 `preview` 算进去）。以后补资料改同一编号和 `?card=` 链接。

| 编号 | 名称 | 日期 | 正式链接 |
|---|---|---|---|
| E188 | Alejandra Mantinan Beijing Workshop，城市北京，主办 AS Tango阿根廷探戈学校 | 2027-03-02 至 2027-03-09 | https://tangoweekend.org/zh/asia/?card=E188 |
| E189 | 【Tango Caravan 大篷车】第3站 - 莫干山 | 2027-04-09 至 2027-04-11 | https://tangoweekend.org/zh/asia/?card=E189 |
| E190 | Jakarta Championship，城市 Jakarta，类型 festival | 2027-06-10 至 2027-06-12 | https://tangoweekend.org/zh/asia/?card=E190 |
| E191 | Alejandra martinan Workshop（拼写未改成 Mantinan） | 2027-03-24 至 2027-03-30 | https://tangoweekend.org/zh/asia/?card=E191 |
| E192 | Lucas y Naima Workshop，城市北京，主办王萌 | 2027-05-10 至 2027-05-17 | https://tangoweekend.org/zh/asia/?card=E192 |

代码：`asia/atm-home.js`（预告标签、大型列表、莫干山中文名，`?v=h186`）、`asia/cardB.js`（预告行和城市地图，`?v=cb160`）、`asia/atm-ko.js`（对应韩文，`?v=k10`）、`asia/asia-map.js` 的缩图尺寸表（`?v=r21`）。两个 `index.html` 的版本号已一起加。测试：`python3 tools/test_preview_cards.py`，以及 `python3 tools/ensure_posters.py --check`。

回退点：上线前的 main 是 `68a136b`（Merge pull request #161），分支 `backup/live-20261116-before-preview`。实现 PR 是 #162，合并提交 `01f613e`（北京时间 2026-11-16 17:54）。部署走 GitHub Pages 加既有「R2 sync」（run 43844020410），不是整份覆盖 R2。

正式站核对（北京时间 2026-11-16 18:20）：

- 五个 id 和链接以公开 JSON 为准，不要对调：E188 北京 Alejandra Mantinan https://tangoweekend.org/zh/asia/?card=E188 ；E189 莫干山第3站 https://tangoweekend.org/zh/asia/?card=E189 ；E190 雅加达 https://tangoweekend.org/zh/asia/?card=E190 ；E191 台北 Alejandra martinan https://tangoweekend.org/zh/asia/?card=E191 ；E192 北京 Lucas y Naima https://tangoweekend.org/zh/asia/?card=E192 。
- 大型列表 `#h-feat` 已显示 E188、E192、E191、E189，日期分别是 2027/03/02–03/09、2027/05/10–05/17、2027/03/24–03/30、2027/04/09–04/11。E189 没有类型标签，仍然在大型列表里，没有被改成别的类型。
- E190 的单卡页已能打开（探戈节，2027-06-10 至 06-12）。18:20 时卡片上还有城市地图链接。那是 t1019u 之前的页面，当前没有这条链接。随后公开 events-core 已是 168 张并含 E190。第二次 R2 sync [43845464828](https://github.com/Shiao64/my1/actions/runs/43845464828) 后来已完成。
- 卡片正面曾显示「场地待公布 · 城市地图（非场地）」并链到城市搜索。t1019u 改为只留纯文字「场地待公布」／“Venue to be announced”，五张预告卡共用这段渲染。版本 `cardB.js?v=cb163`。地图上的城市点不删。

t1020u 起，五张卡的公开说明只留上面那四句短预告。早先写进说明的内部话（不要改 R0E9XeyL、拼写尚未确认、未提供海报、不要套用另一场，以及把「北京 AS」当成身份不明）已从公开字段删掉。t1021u 已确认 E188 主办就是「AS Tango阿根廷探戈学校」，城市北京；那条身份不明的旧备注作废，不要再当成当前事实。E192 主办是用户确认的「王萌」，没有编罗马字，没有填联系方式。名称仍是 Lucas y Naima Workshop，日期仍是 2027-05-10 至 2027-05-17，城市北京。

t1022u 确认 E190 的城市字段就是 Jakarta。名称仍是 Jakarta Championship，日期仍是 2027-06-10 至 2027-06-12，类型仍是 festival，海报仍是原来的占位图。「其他留空」只指没提供的主办、场地、地址、时间、费用和联系方式，不删已确认的日期或类型，也不加城市地图链接。公开说明仍只有那四句短预告。中文卡上的城市行显示 Jakarta。

还缺、没有编造的：五张卡的场地、具体地址、开始时间、费用。E189、E190、E191 的主办仍未提供。E191 的 martinan 与 E188 的 Mantinan 是否同一人，尚未核实。t1019u 起，预告卡上不再放城市地图链接，只留纯文字「场地待公布」。自动上线检查 `tools/inbox_autocheck.py` 仍按普通完整卡要求地址，没有为了这批关掉；这五项是经批准的实现 PR 上线，不是 inbox 自动合并。公开 events-core 随后已有 168 张，含 E190。

正式站再打开过这五张卡。E188 显示主办「AS Tango阿根廷探戈学校」、城市北京、2027-03-02 起，说明只有「活动预告，详情待公布。」，没有「北京 AS」那句内部话，也没有城市地图链接。E192 显示主办「王萌」，名称仍是 Lucas y Naima Workshop，日期仍是 2027-05-10 至 2027-05-17，说明同样只有短预告。E190 城市行是 Jakarta，类型是探戈节，日期是 2027-06-10 至 2027-06-12。五张卡的公开 JSON 说明里都没有内部备注。

## 9. 探戈帮指路图（DIVjezcE，t1014u / t1015u / t1023u）

用户授权给这张卡加指路照片并正常发布。t1023u 在原三张之后再加第四张。t1024u 确认本批可以上线。其他暂停任务不恢复，不触发 inbox。

单语决定（t1015u）：中文、英文、韩文、西班牙文的指引和图注必须分字段保存。每个语言版本只显示自己的那一种，不能在一张卡上把四语叠在一起。沿用现有语言选择：中文页 `/zh/asia/`，英文页 `/asia/`，韩文不是独立页面，只在 `?lang=ko` 时由 `atm-ko.js` 测试。西班牙文没有页面，也不新开入口。`atm-addr.js` 的 `pickLang` 按当前语言只取 `directions` / `directions_en` / `directions_ko` / `directions_es`，图注同理取 `caption` 及 `_en` / `_ko` / `_es`。韩文和西班牙文译文已存好，供对应版本使用。

照片按原图复制，箭头没有重画。顺序：外观 `DIVjezcE-01-exterior.jpg`，入口 `DIVjezcE-02-entrance.jpg`，大堂 `DIVjezcE-03-lobby.jpg`，房间 `DIVjezcE-04-room1502.jpg`。第四张接在末尾，前三张没有替换。外观能看见永惠大厦和方斜路路牌，与卡上「近方斜支路口」相符。已核实地址仍是西藏南路 765 号 1502 室，没有按照片改写。第四张能看见 Tango Bang 招牌的向左箭头和左侧门上的 1502，图注是「按 Tango Bang 招牌箭头向左，进入1502室。」英文、韩文、西班牙文是这句的译文，仍分字段，各语言版本只显示自己的一句。

t1033u：第二张入口图，箭头 1 是大门进入，箭头 2 是 A 栋门口。图注改为「1. 大门进入；2. A栋门口」。不再写两个箭头都指向大门。t1035u：第三张是大堂电梯，乘电梯到 15 楼。15 楼由用户直接确认。图注是「大堂电梯，乘电梯到15楼」，英文 “Lobby elevator. Take the elevator to the 15th floor.” 韩文和西班牙文是同样的短句。t1036u：第一张改为「沿方斜路向前；找到旁边小区入口」。箭头不是直接指向永惠大厦。总指引按这次确认写成：沿方斜路向前，找到旁边小区入口；1. 大门进入；2. A栋门口；大堂乘电梯到 15 楼；按招牌向左进 1502 室。删掉「沿街走到永惠大厦」「左侧通道」和「电梯、楼层没有标出」。没有另写乘梯按钮。四张的顺序、原图、主图、地址、主办 Vivian Yeh 都没改。图注这次之前的 main 是 `460d161`。正式站 `events-core.json?v=china490` 已是这四句。中文卡点开四张图，图注依次是小区入口、大门与 A 栋门口、大堂电梯到 15 楼、按招牌向左进 1502 室；页面指引是同一条路线。英文页只显示英文。

测试：`python3 tools/test_divjezc_route.py`。加第四张之前的 main 是 `a68ef98`（Merge pull request #170）。更早的整批回退点仍是 `backup/live-20261116-before-preview`（`68a136b`）。第四张本身的发布是 PR #171，合并 `27b0da7`。

正式卡已核对。https://tangoweekend.org/zh/asia/?card=DIVjezcE 按外观、入口、大堂、1502室的顺序显示四张图，地址仍是西藏南路 765 号 1502 室，中文指引只显示中文。点开第四张，中文图注是「按 Tango Bang 招牌箭头向左，进入1502室。」英文页同一张只显示英文图注，`?lang=ko` 只显示韩文图注。西班牙文图注已保存在 `caption_es`，没有西班牙文页面，也没有新开入口。第四张图 `https://tangoweekend.org/images/asia/directions/DIVjezcE-04-room1502.jpg` 返回 200，大小与原图一致。

t1031u：公开海报改为附件里的 Tango Bang / 探戈帮 / tangobang.cn 标志，路径是 `/images/asia/posters/DIVjezcE-tangobang.jpg`，原图字节没有改。列表缩略图是 `images/thumb/.../DIVjezcE-tangobang.webp?v=t360`，打开用的是 `images/thumb800/.../DIVjezcE-tangobang.webp?v=t800`。第一次曾把 `?v=tb1` 写进海报字段，卡片因此去请求带 `tb1` 的缩略图；文件上传前这个地址被存成 404，文件上传后仍是 404。不带 `tb1` 的同一张缩略图，以及 `t360`、`t800` 都返回 200。海报字段已去掉 `tb1`，卡片改用这两条已经能打开的缩略图，不再靠退回大图掩盖。正式卡已再打开：海报地址是 `images/thumb800/images/asia/posters/DIVjezcE-tangobang.webp?v=t800`，没有退回大图，也没有 `R018`。四张指路图还在，主办显示 Vivian Yeh，地址仍是西藏南路 765 号。旧的 `R018.jpg` 不再挂在这张卡上，也没有放进往期海报，文件仍留在仓库里作回退。日期、时间、地址和四张指路图不动。t1032u：这张卡的主办，以及只关联 DIVjezcE 的草稿记录 O081，拼写从 Vivian Ye 改为 Vivian Yeh。微信标签里的姓名一起改，微信号、电话和邮箱不动。页脚致谢本来就是 Vivian Yeh。杭州节目单上的 Vivian & Victor 是另一组人，没有改。换海报之前的 main 是 `95047bd`。

GqufXmMX（Milonga V 第216场）原图 `GqufXmMX.png` 已是 2026-11-17、No.216、Dandi 那张，和刘峥寄来的原图字节相同。数据站上卡片内嵌先请求的 `images/thumb/.../GqufXmMX.webp?v=t360` 和 `images/thumb800/.../GqufXmMX.webp?v=t800` 画面仍是 No.214、2026.11.03、Yelyn Woo 的绿甜点。点开后的原图才是第216场。网站仓库里的同名缩略图已经是新画。这次把原图按原字节另存为 `GqufXmMX-216.png`，缩略图按这张新图重新生成，卡片改指向这个新路径，避免继续用被旧画面占住的 `?v=t360`。长期周常时间、主办、场地没有改。这次之前的 main 是 `d2acfc8`。正式卡现在内嵌的是 `images/thumb800/images/asia/posters/GqufXmMX-216.webp?v=t800`，画面是 No.216、2026.11.17、Dandi。列表缩略图 `.../GqufXmMX-216.webp?v=t360` 也是同一张。点开原图 `GqufXmMX-216.png` 与上游原图 SHA256 相同：`4d908c5fedc2e342bb4890a8fce38ddc362b985a92daa569548b95faa950d988`。旧地址 `GqufXmMX.webp?v=t360` 和 `?v=t800` 仍是 No.214 绿甜点，卡片已不再引用。

## 10. 去掉两枚公开邮箱（t1049u）

只删邮箱和页面上的 mailto 链接。主办姓名、电话、网站、报名、海报都留着。不删整张活动或组织者，不动历史提交和旧交接。

第一枚（love2tango 域名的主办邮箱，地址不再写在这里）在 E042（The Return 2026 · Javier Rodríguez in Kuala Lumpur）的 `contacts.email`，`asia/events.json` 和 `asia/events-core.json` 都有；`events-more.json` 没有。中英活动页 `event/kuala-lumpur-2026-the-return/` 各有一行邮箱链接，已删。电话仍是 +6012 333 5311，网站仍是 https://www.love2tango.com 。

第二枚（一个 gmail 邮箱，地址同样不再写在这里）在现行公开活动 JSON、活动页、`asia/organizers.json` 和 `data/entities-draft/organizers.json` 里都没有，所以没有删任何东西来假装它已去掉。组织者草稿 O049 Cristopher Wibowo、O050 Michelle Ng 只有姓名和 E042，没有邮箱栏。

这次之前的 main 是 `4039f26`。正式站已核对：`events-core.json?v=china490` 和 `events.json` 里 E042 只剩电话 +6012 333 5311，网站仍是 https://www.love2tango.com 。中英活动页没有这个邮箱、没有 mailto，也没有 Cloudflare 邮箱保护标记。第二枚邮箱本来就不在这些公开来源里。

## 11. 指路图缩略图（2026-11-20）

探戈帮指路图打开慢：第 4 张是 4032px、1.9MB 的原图，已缩到 1600px、239KB、去 EXIF；而且卡上的小按钮一直在下载原尺寸大图。现在小按钮改用 `images/asia/directions/thumb/<名字>.webp`（每张 10–35KB），点开放大才下载原图；缩略图缺了会自动退回原图。新加指路图后跑 `python3 tools/make_direction_thumbs.py`，换同名照片后加 `--force`。`atm-addr.js` 版本号 ad5→ad6。

## 海报修复经过（#209/#210、#213–#219，11/18）

**#209/#210（11/18）**：之前换海报时复制到 `past/` 的旧海报没有缩图（数据站 404，Milonga V 第214场显示不出来），也没日期。`tools/fix_past_posters.py` 修：补缩图、从同一张已标日期的海报抄日期和 DJ、拿掉文件不在的和自动文字海报的拷贝；每日清理也会跑它。`radar_poster_update.py` 换海报时 `past/` 拷贝会有缩图、日期、DJ，自动文字海报（`/posters/generated/`）不当历史海报。 **#213–#217（11/18）海报显示慢/空白**：浏览器会记住某个网址的「找不到」（网页先上线、图还没传到数据站时打开过就会这样），之后一直读大原图或显示空白。处理：① 已坏的换新文件名（No.214、No.215 及 NmkWjMxo/DFBKYdPX/AtrSun01 的 past/ 已改成 `posters/<id>-<日期>.jpg`，No.215 3MB PNG 改 404KB JPG）；② `bump_live_caches()` 现在也会把 `asia-map.js?v=rNN`（装缩图尺寸表 ATM_TH）加一，之前一直停在 r25；③ `atm-data.js` 的重试网址 `atmbust=` 改成每小时不同（之前固定 =1，自己也会被记成找不到），版本 r12；④ **根本原因（#219）**：R2 同步原本按字母顺序上传，`asia/*.json` 比 `images/` 先上去，几分钟内网站指向还没上传的海报；现在图片先、JSON 最后（`upload_order()`）。#212（另一个对话开的「上传后清 Cloudflare 边缘缓存」，要给 token 加 Cache Purge 权限）已关闭，不需要。

## 核对表细节（资料结构第 3 步，11/18）

- **11/18 活动卡加「周期」四栏（用户定，本机 Claude Code 用 Claude in Chrome 直接改原表，链接不变）**：北京、上海两份的「活动卡」表在「钟点」后插入 F–I 四栏：**周期**（下拉：每周／每两周／每月／每年／单次／不定期）、**规则**（每周几；每月第几个周几，例如「每月第2个周六」「每月最后一个周六」；每年约几月）、**第几届／第几场**（只给每年的活动和有编号的舞会）、**属于哪张周常卡**（只给周年场、主题场这类特别场，写周常卡编号）。原来的「场地（卡上写法）」以后各栏往右移了 4 格（核对结果现在是 M 栏）。「说明」表第 23 行加了这四栏的填法。四栏已照 `asia/events.json` 先填好：周常卡＝每周＋星期；有 `nth` 的＝每月（1＝第1个，-1＝最后一个）；`series_id`＋`edition` 的＝每年＋第几届；北京精选探戈周末填每年、第4届；探戈会填第216场（2026-11-17）；上海「2027上海探戈（新年）假期」和 More than Tango 马拉松先填单次，规则栏写「是否每年都办，请确认」。**注意**：上海 Milonga Iris（R030）、Tango Dreamers Club Milonga（izAYSxss）、猫猫探戈（R0E9XeyL）、Milonga de Ensueños（R034）在旧「时间」栏写「每周六」，但网站资料是每月一次（`nth` 2／3／1／-1），以新「规则」栏为准——当初生成核对表的脚本没读 `nth`。核对表交回后，周期这几栏要对应进资料库（现在网站「每月」有两种写法：周常卡加 `nth`，或单次卡加 `oneoff_kind: monthly`，到时统一）。
   - **11/18 晚读回两份核对表（本机 Claude Code）**：团体页结果存在 `data/entities-draft/checked-groups.json`（手写文件，`draft_entities.py` 不读也不会盖掉；只记名称、状态、成员、场地、活动编号、核对人，联络方式以卡片为准）。北京 9 个团体全部确认（Shiao）：Practica V 属于 Milonga V；MILONGAGA 成员是刘峥、郭威，团体微信只留 beijingtango（whiskyge 是郭威个人微信）。上海 Sam 只核了团体页：12 个确认，探戈极限（rccbKIYP）＝Infinity Tango（G056），麦克的探戈世界、猫猫探戈、Tango Palace 还没确认；上海的组织者、场地、活动卡三页还没核。卡片改动：Milonga V、Practica V、MILONGAGA 加刘峥邮箱，MILONGAGA 微信改成只写 beijingtango（刘峥）。**还没定（要问用户）**：台风那行「要改成」只写「taifengo」；金尚首层（V006，一楼 109，TAIFENGO 用）表上写「和 V014 同一场地」（金尚源瑜伽舞蹈室 B1，MILONGAGA 用），两边地址楼层不同，怎么合还没定。

## source 字段去掉个人联络方式（2026-11-20，#316）

仓库和网站的 JSON 都公开，`source` 还会显示在活动详情页的「资料来源」里。已把 8 张卡（E086、E116、E121、AtrSun01、E160、E164、E163、E167）`source` 里的邮箱、电话换成「（邮箱已删）」「（电话已删）」，`events.json`、`events-core.json` 都改了（`events-more.json` 没有这个字段的联络方式）。岘港活动页中英两页的「资料来源」同步改了。卡上 `contacts` 的公开联络方式没动。**以后写 `source` 只写来源和日期（如「主办邮件 2026-11-20」），不写邮箱、手机。** git 历史里的旧内容没有改写。

## 2026-11-20 微信收集：试过 MBA 上的 Claude，改回 Grok Bot
- 原计划：停掉 Grok Bot，MBA 上的 Claude 每天 9/13/17 点用 Computer use 只读 4 个群（Tango Ideal 理想探戈群、探戈会 VTango、ATAC 中阿探戈联盟、【可广告】BTMI北京理想探戈马拉松），截图存 MBA 本机 `~/ATM来源/`。
- 结果：每次都要用户人工点一下才能跑，没法自动，用户决定交回 Grok Bot（见交接说明 0.6 节）。
- 停用期间 Grok Bot 11/19 晚交的两份答复（北京 RedBox 11/20 预告、杭州 11/21 Milonga INTANGO）已由 Claude 处理（ttLxDoyZ 加 11/20 单场提示；新卡 E197，联络电话沿用同主办 E187）。

## 12. 指路图放大也改小图（2026-11-20）

用户反映 4G 下翻 4 张海报很快、翻 4 张指路图很慢。原因：海报放大是先显示已下载的小图、再换 800px webp（15–80KB），而指路图放大直接下载 230–480KB 的原图、下载完之前一片空白。改成和海报一样：`make_direction_thumbs.py` 另做 `w800/`（800px、webp 品质 60，每张 25–80KB）；放大时先显示缩略图（按 800 图的大小放，不会跳），w800 到了换上，并预先下载同卡其余几张。本机模拟弱 4G（每个请求多 0.3 秒、100KB/s）：点开 16ms 有画面、0.9 秒清楚，翻页 16–59ms；旧做法一张原图 3.9–5.2 秒。`atm-addr.js` ad6→ad7。

## 13. Vida Mia（红房子 Milonga，ttLxDoyZ）指路图（2026-11-23）

用户给的路线：1. 进门岗后左转；2. 停车场走到底右转；3. 右转后第一栋入口；4. 进门，电梯上 2 楼（203 室）。照片四张（VidaMia 1–4）加 Vida Mia 自己的步行地图（第 5 张，地图上二、三单元的英文误写成 “Unit 1”，原图如此）。网站图 `images/asia/directions/ttLxDoyZ-0N-*.jpg/png`，原图在 `data/inbox/done/2026-11-23-beijing-vidamia-*`；五种语言路线和图注。
