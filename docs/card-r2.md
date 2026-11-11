# 改卡 — card JSON and posters on R2

Phase 1 is a preview. Do not merge it to `main` until `https://data.tangoweekend.org/asia/events-core.json` returns the card list. Until that URL answers, the map keeps using the copies in this repo, so a preview (and an accidental merge) still paints.

The program (HTML, `asia-map.js`, `cardB.js`, `atm-home.js`) stays on Pages / the live site. Card text and dates are read from R2 first. The git copies are the fallback when that read times out (2.5s) or fails. Browsers cache the fallback under `events-core.json?v=chinaNNN` (`Cache-Control: max-age=600` on Pages). A card that is only on R2 stays missing on a phone that fell back, and a normal refresh keeps the old cache key.

## Where it lives

| What | Where |
| --- | --- |
| Bucket | `atm-events-data` on the Apple Private Relay account (`7c571cf66c16cf58be0c597ac05cbad4`), location hint `apac` |
| Public base | `https://data.tangoweekend.org` (custom domain on the `tangoweekend.org` zone, Cloudflare cache in front). `r2.dev` is only a rate-limited development URL the sync script may also enable. |
| Object keys | Same paths as the site: `asia/events-core.json`, `asia/events-more.json`, `asia/events.json`, `images/asia/posters/…`, `images/thumb/…`, `images/thumb800/…` |
| Loader | `asia/atm-data.js` (`window.ATM_DATA_BASE`, default the public base above) |
| Fallback | The `?v=chinaNNN` / `?v=eNNN` URLs already in the pages, served from the same host as the HTML. `atmDataJson` appends that same query to the R2 URL, and the events-core preload uses it too, so preload and fetch share one cache key. |

`events-core.json` is first paint (China / Taiwan / Hong Kong regular cards, plus featured), fetched once per page load. `events-more.json` waits for scroll, search, `?k=Seoul`, or a single card that is not in core. `events.json` is the full file, used only when an id is in neither core nor more.

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

The script creates `atm-events-data` if needed, sets CORS (`tools/r2-cors.json`, GET/HEAD from any origin so `*.my1-7p3.pages.dev` previews work), attaches `data.tangoweekend.org`, and uploads the three JSON files plus every poster those rows reference (original, list thumb, 800px thumb). JSON is `Content-Type: application/json; charset=utf-8` with `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=86400`. Images are `image/webp`, `image/jpeg`, or `image/png` with `Cache-Control: public, max-age=2592000`.

## 改一张卡

1. Edit the row in whichever of `asia/events.json`, `asia/events-core.json`, and `asia/events-more.json` already contain that id. Change `name`, dates, `note`, `poster`, and so on. Do not hand-edit `?v=e` / `?v=h` / `?v=cb`. The events-core `?v=chinaNNN` key is bumped by the script (below), not by hand.
2. New or replaced poster: put the file at the `/images/…` path the row uses, and keep the thumbs next to it (`images/thumb` and `images/thumb800`, same way `tools/radar_poster_update.py` writes them). If you replace bytes at an existing path, add a query on the poster field so browsers and the CDN refetch that one image, for example `"/images/asia/posters/E158.jpg?v=20261105"`. The object key ignores the query.
3. Publish only that card's images and the three JSON files:

```bash
python3 tools/r2_sync_cards.py --event-id E158
```

4. A real upload (`python3 tools/r2_sync_cards.py`, no `--dry-run`) first GETs the public `events-core.json`. If that file has an id the working tree does not, the script exits and writes nothing — uploading the older git file would hide the live card. It then bumps `events-core.json?v=chinaNNN` in the four cache-source files and uploads. It does not deploy Pages and does not send mail. Commit the JSON and the cache-key bump and ship them with the next site deploy (上线), or phones that time out keep the previous fallback. JSON already on R2 is revalidated at the edge within about five minutes (`s-maxage=300`) and in the browser within about a minute (`max-age=60`). Image URLs without a new query can stay cached for about 30 days.

When the bucket is already ahead of git (cards appended on R2, not via this upload), do not upload. Refresh the fallback instead:

```bash
python3 tools/r2_sync_cards.py --pull-fallback
```

That downloads `asia/events.json`, `asia/events-core.json`, and `asia/events-more.json` and, if the bytes changed, bumps the same `?v=chinaNNN` key. It does not upload. Poster files are not part of that download. Commit the result and deploy Pages before calling it live.

`asia/manifest.json` on the bucket records the UTC rev of the last sync. The page does not read it.

Pushing card JSON to `main` still rebuilds the whole site. That is what makes the fallback match R2. Leaving git on the previous snapshot is what kept E168 off phones that missed the R2 window.

Radar 异动 (`tools/radar_yidong.py`) still writes git and still bumps cache keys. That path is unchanged. Use it when the poster change should also land in the repo. Use `r2_sync_cards.py` when the card should go live on R2 before the next Pages deploy. The `?v=chinaNNN` bump from that upload still has to ship with the next site deploy, or phones that time out keep the previous fallback.

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
