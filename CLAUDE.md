# ATM（Asia Tango Map）— 给 Claude Code / Cursor 的开工说明

网站：https://tangoweekend.org/asia （中文 /zh/asia/）。仓库 `Shiao64/my1`，GitHub Pages 自动上线；活动数据另由「R2 sync」传到 data.tangoweekend.org。

## 先读
1. **`docs/atm-handoff.md`**（交接说明，规则和现状都在这里，以它为准）
2. `data/inbox/README.md`（和探戈助理的协作须知）
3. 需要时：`docs/going-deploy.md`、`docs/card-r2.md`、`tools/README.md`

## 和 Shiao 合作
- **一律用中文回复**，白话、少术语。Shiao 以前是工程师，可以看命令和 diff。
- 改后端、部署（GitHub Actions「API deploy」）、改 Cloudflare 设置：**先问再做**。前端和活动数据：开分支、PR、合并即可。
- 不要把密码、token、订阅者名单、主办个人联络方式放进仓库（仓库是公开的）。

## 同时有几方在改这个仓库
- claude.ai「ATM」项目里的 Claude（云端对话）、本机的 Claude Code、GitHub 上自动处理答复的 Claude（分支 `inbox-run-*`）。**探戈助理（Grok Bot）11/20 起已停用**，它的工作由 Claude 接手（见交接说明 0.6、0.7 节；邮件入口改为 huodong@tangoweekend.org）；旧的 `answer/…`、`cursor/…` 分支是它留下的。
- 开工先 `git fetch`，看 `git log origin/main` 和开着的 PR；**不要直接推 main**，用分支 + PR。
- 分支名不能以 `inbox/` 开头。
- 重要改动写进 `docs/atm-handoff.md`（claude.ai 项目里有一份副本，由云端那边的 Claude 同步）。

## 最常踩的坑（细节见交接说明第 7 节）
- 活动数据 `asia/events.json`、`events-core.json`、`events-more.json` 各只有一行紧凑 JSON（`separators=(',',':')`, `ensure_ascii=False`；events-more 结尾有换行）。同一张卡三个文件要一致；两个 PR 同时改一定冲突，一次合并一个。
- 改 JS 要在 **`asia/index.html` 和 `zh/asia/index.html` 两页**一起加 `?v=` 版本号；换海报后跑 `tools/radar_poster_update.py` 的 `bump_live_caches()`。
- 新图片要先被 R2 sync 传上去，网站才打得开；同步现在是图片先、JSON 最后。
- `tools/__pycache__/` 里的 .pyc 被 git 追踪：不要删，也不要提交新产生的。
- 指路图：网站用缩小版（最长边 1600px、去 EXIF），原图留 `data/inbox/done/`。
- 历史海报最多 4 张、超过 30 天不留，每天 03:17（北京）自动清理。

## 测试
- 后端：`node social-worker/test/*.test.mjs`（main 上本来就有 14 个失败，不新增即可）
- 自动上线检查：`python3 tools/test_inbox_autocheck.py`
- 海报：`python3 tools/ensure_posters.py --check`、`python3 tools/test_prune_past_posters.py`、`python3 tools/test_r2_incremental.py`
- 前端：`python3 -m http.server 8765` + Playwright，iPhone 390×844，中文加 `locale='zh-CN'`；首次打开点 `#atm-notice-go`。
