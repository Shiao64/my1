# DJ 介绍页候选名单

由 `tools/dj_sessions.py` 自动产生（每天更新），请勿手改。满 3 场、还没有介绍页的人，**Shiao 过目后才上线**。

- 同意：告诉 Claude「上线 <名字>」，Claude 跑 `python3 tools/dj_sessions.py approve <名字> --id <网址名>`。
- 两个名字是同一人：写进 `data/dj-names.json` 的 `same`；不要做页面：写进 `skip`。
- 「多个城市」的要特别看：可能是同名的两个人。

记录共 86 条，75 个名字。更新：2026-11-24

## WangWei / 王为（3 场）

- 2026-11-22 · Kai's Milonga（DFBKYdPX）· 上海 · `events.json poster DFBKYdPX.png`
- 2026-11-14 · 探戈极限（rccbKIYP）· 上海 · `events.json poster rccbKIYP_2026-11-14.jpg`
- 2026-10-17 · Milonga Iris（R030）· 上海 · `events.json poster R030-no1-20261017.jpg`

## 差 1 场的（参考，不用处理）

Anthony、Ban A、Jessie / Jessie (SH)、Lucila、Vuk / Vuk (Serbia)、哈博、艺侨

## 同一人的写法？

名字不同、程序不会自动合并。看到是同一人（例如中文名和英文名）就告诉 Claude，会写进 `data/dj-names.json`。
