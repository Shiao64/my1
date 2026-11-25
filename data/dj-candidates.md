# DJ 介绍页候选名单

由 `tools/dj_sessions.py` 自动产生（每天更新），请勿手改。满 3 场、还没有介绍页的人，**Shiao 过目后才上线**。

- 同意：告诉 Claude「上线 <名字>」，Claude 跑 `python3 tools/dj_sessions.py approve <名字> --id <网址名>`。
- 两个名字是同一人：写进 `data/dj-names.json` 的 `same`；不要做页面：写进 `skip`。
- 「多个城市」的要特别看：可能是同名的两个人。

记录共 131 条，111 个名字。更新：2026-11-26

## Fiona Szeto（3 场）

**多个城市：Da Nang、Hong Kong，请确认是同一人**

- 2026-12-04 · 岘港探戈马拉松暨岘港都会探戈锦标赛（E086）· 岘港 · `git 60a56816 2026-11-01 schedule`
- 2026-11-17 · Sole Mio · DJ Fiona Szeto（E172）· 香港 · `events.json one-off dj`
- 2026-11-13 · Milonga Manzana Hong Kong（舞會經驗尚淺版）（E151）· 香港 · `events.json one-off dj`

## Lucila（3 场）

**多个城市：Daegu、Gunsan、Shanghai，请确认是同一人**

- 2027-05-21 · 2027 群山日落探戈马拉松（E116）· Gunsan · `events.json schedule`
- 2027-04-30 · DITM Daegu International Tango Marathon（E039）· 大邱 · `events.json schedule`
- 2026-11-07 · ESSA 中韩联合双场大舞会（E121）· 上海 · `events.json one-off dj`

## 王为（3 场）

**多个城市：Chengdu、Shanghai，请确认是同一人**

- 2026-11-26 · Ezequiel Workshop & 成都探戈小周末（manual-cd-ezequiel-2026）· 成都 · `events.json poster manual-cd-ezequiel-2026.jpg`
- 2026-11-22 · Kai's Milonga（DFBKYdPX）· 上海 · `events.json poster DFBKYdPX.png`
- 2026-11-14 · 探戈极限（rccbKIYP）· 上海 · `events.json poster rccbKIYP_2026-11-14.jpg`

## 差 1 场的（参考，不用处理）

Anthony、Anton / Anton（符拉迪沃斯托克）、Ban A、Jessie / Jessie (SH)、Maggie Ho（澳门）、Vuk / Vuk (Serbia)、XIAOXIN / Xiao-xin、YuJing、修行、哈博、增歌、艺侨

## 同一人的写法？

名字不同、程序不会自动合并。看到是同一人（例如中文名和英文名）就告诉 Claude，会写进 `data/dj-names.json`。
