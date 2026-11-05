# 改卡 — card JSON and posters on R2

Phase 1 is a preview. Do not merge it to `main` until `https://data.tangoweekend.org/asia/events-core.json` returns the card list. Until that URL answers, the map keeps using the copies in this repo, so a preview (and an accidental merge) still paints.

The program (HTML, `asia-map.js`, `cardB.js`, `atm-home.js`) stays on Pages / the live site. Card text, dates, and poster files do not. Publishing a card does not bump `china` / `e` / `h` / `cb` and does not need a Pages deploy.

## Where it lives

| What | Where |
| --- | --- |
| Bucket | `atm-events-data` on the Apple Private Relay account (`7c571cf66c16cf58be0c597ac05cbad4`), location hint `apac` |
| Public base | `https://data.tangoweekend.org` (custom domain on the `tangoweekend.org` zone, Cloudflare cache in front). `r2.dev` is only a rate-limited development URL the sync script may also enable. |
| Object keys | Same paths as the site: `asia/events-core.json`, `asia/events-more.json`, `asia/events.json`, `images/asia/posters/…`, `images/thumb/…`, `images/thumb800/…` |
| Loader | `asia/atm-data.js` (`window.ATM_DATA_BASE`, default the public base above) |
| Fallback | The `?v=chinaNNN` / `?v=eNNN` URLs already in the pages, served from the same host as the HTML |

`events-core.json` is first paint (China / Taiwan / Hong Kong regular cards, plus featured). `events-more.json` loads for `?k=Seoul` and for a single card that is not in core. `events.json` is the full file (single-card fallback, home, card design B).

A `*.pages.dev` preview reads the JSON shipped with that deploy, not the bucket. That is so a branch which changes a card shows the change on its preview. `tangoweekend.org` still tries R2 first and uses the git files only when R2 does not answer.

Poster `<img>` URLs point at R2 only after one of those JSON fetches succeeds. If the thumb is missing there, the image falls back to the file in this repo.

Like / subscribe (`tango-subscribe`, `api.tangoweekend.org`) is unchanged. Reads are public HTTP, not a Worker binding.

## One-time setup

R2 has to be enabled once in the dashboard (R2 → enable / purchase the pay-as-you-go plan). Workers Paid does not do that by itself. The API returns error `10042` until then. This session could not complete that click: the connected credential can call R2, but the account is not entitled, and it cannot change billing.

Then, with `CLOUDFLARE_API_TOKEN` (R2 write, and DNS write on `tangoweekend.org` the first time):

```bash
python3 tools/r2_sync_cards.py --dry-run
python3 tools/r2_sync_cards.py
python3 tools/r2_sync_cards.py --check
```

The script creates `atm-events-data` if needed, sets CORS (`tools/r2-cors.json`, GET/HEAD from any origin so `*.my1-7p3.pages.dev` previews work), attaches `data.tangoweekend.org`, and uploads the three JSON files plus every poster those rows reference (original, 480px thumb, 800px thumb).

## 改一张卡

1. Edit the row in whichever of `asia/events.json`, `asia/events-core.json`, and `asia/events-more.json` already contain that id. Change `name`, dates, `note`, `poster`, and so on. Do not bump `?v=china` / `?v=e` / `?v=h` / `?v=cb`.
2. New or replaced poster: put the file at the `/images/…` path the row uses, and keep the thumbs next to it (`images/thumb` and `images/thumb800`, same way `tools/radar_poster_update.py` writes them). If you replace bytes at an existing path, add a query on the poster field so browsers and the CDN refetch that one image, for example `"/images/asia/posters/E158.jpg?v=20261105"`. The object key ignores the query.
3. Publish only that card's images and the three JSON files:

```bash
python3 tools/r2_sync_cards.py --event-id E158
```

4. Do not commit, do not push `main`, and do not deploy Pages for this. Reload the map. JSON is uploaded with `Cache-Control: max-age=0, must-revalidate`. A hard refresh should show the new card. Image URLs without a new query can stay cached for about a day.

`asia/manifest.json` on the bucket records the UTC rev of the last sync. The page does not read it.

The git copies are the fallback snapshot. Leave them as they were at the last program deploy unless you are intentionally refreshing that snapshot (a normal site deploy). Pushing card JSON to `main` still rebuilds the whole site, which is the thing this split avoids.

Radar 异动 (`tools/radar_yidong.py`) still writes git and still bumps cache keys. That path is unchanged. Use it when the poster change should also land in the repo. Use `r2_sync_cards.py` when the card should go live without a program version.

## What still lives in git

- The map program: `asia/asia-map.js` (including the `ATM_TH` width/height table), `cardB.js`, `atm-home.js`, CSS, the two map HTML pages.
- A snapshot of `asia/events.json`, `events-core.json`, `events-more.json` used when R2 does not answer.
- Every poster and thumb, so the fallback and the rest of the site (event detail pages, which still use their own HTML) keep working.
- DJ profiles (`asia/djs.json`) and organizers (`asia/organizers.json`).
- Detail-page bodies under `event/`. Those pages do not read R2. A card-only edit shows on the map, the `?card=` page, and the home list. It does not rewrite a hand-built detail page.

`ATM_TH` is optional. A poster path that is not in the table still renders; it just has no width/height attributes until the next program deploy.

## ICP / 中国大陆

Out of scope for this change. Nothing here files a 备案, and nothing is hosted on a mainland China network.

`data.tangoweekend.org` is a hostname on the existing Cloudflare zone (Free plan), in front of R2. The bucket location hint `apac` is a placement hint, not an ICP region and not a China jurisdiction. Cloudflare's public network is the same one `tangoweekend.org` already uses. Visitors who cannot reach Cloudflare still cannot reach this host. If the data host fails and the HTML itself loaded, the map falls back to the posters and JSON shipped with the page.
