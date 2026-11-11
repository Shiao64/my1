# Tools

## 改卡 — card JSON and posters on R2

Card text and poster files publish to the R2 bucket `atm-events-data` (`https://data.tangoweekend.org`) with `tools/r2_sync_cards.py`. The map falls back to the JSON in this repo when that host does not answer within 2.5s, and browsers cache the fallback under `events-core.json?v=chinaNNN`. Full steps: `docs/card-r2.md`.

```bash
python3 tools/r2_sync_cards.py --dry-run
python3 tools/r2_sync_cards.py --pull-fallback   # public JSON → repo, bumps ?v=china, no upload
python3 tools/r2_sync_cards.py --event-id E158   # production upload; refuses if R2 is ahead, then bumps ?v=china
```

Do not run the upload without a separate go-ahead. `--pull-fallback` does not upload. Shipping the new fallback still needs a Pages deploy. `?v=e` / `?v=h` / `?v=cb` are not bumped here.

## Radar 异动 — regular poster replace (fixed step)

Every radar 异动 run goes through `radar_yidong.py`. That script always runs the poster step in `radar_poster_update.py`. It is the way a new organizer poster for an existing regular milonga, practica, or dated one-off (`kind: weekly`, or `regular_oneoff`) gets onto the site. Featured festivals are outside this step.

When it fires: a radar scan (nightly source check or a manual 异动) finds a new organizer poster that belongs to a regular row already on the map. Put that discovery in `posters[]` and run the 异动 entry. An empty `posters` array is valid and still runs the step (it logs that nothing was replaced). A poster stuffed under another key (`new_posters`, `images`, …) is refused.

```bash
pip install pillow   # once
python3 tools/radar_yidong.py --notes path/to/yidong.json
python3 tools/radar_yidong.py --notes path/to/yidong.json --dry-run
```

One poster from the shell (still the 异动 entry, not a separate copy-paste):

```bash
python3 tools/radar_yidong.py \
  --event-id R030 --image https://example.com/poster.jpg \
  --city 上海 --weekday 周六 --note "G03 2026-11-02"
```

Notes shape:

```json
{
  "date": "2026-11-02",
  "source": "radar",
  "posters": [
    {
      "event_id": "GqufXmMX",
      "radar_id": "R001",
      "image": "/absolute/or/https/poster.jpg",
      "city": "北京",
      "organizers": ["刘峥"],
      "weekday": "周二",
      "note": "group and post this image came from"
    }
  ]
}
```

`event_id` is the `events.json` id (雷达表 column 草稿内部ID). `radar_id` by itself is accepted only when that number is already the `events.json` id. The tool does not match on name.

On a real replace it:

1. Copies the old poster to `images/asia/posters/_backup/<id>-<UTC timestamp>.<ext>` and does not delete the old file.
2. Writes the new file under `images/asia/posters/<id>.<ext>` (a separate name if that path is another event's poster).
3. Writes a 360px WebP list thumb at `images/thumb/images/asia/posters/<id>.webp` (and a JPEG fallback) and updates `ATM_TH` in `asia/asia-map.js`. The opened-card thumb stays 800px under `images/thumb800/`.
4. Sets `poster` and `updated` on that id in `events.json` plus `events-core.json` / `events-more.json` when they contain the id.
5. Appends `tools/radar-poster-log.jsonl` (one line per replace, unchanged, refusal, and per 异动 run).
6. Bumps live cache keys `eNNN`, `chinaNNN`, `hNN`, `cbNN` (the same keys a publish commit bumps). `SITE_VERSION` stays. `--no-bump` skips the bump when the publish commit will do it. `--dry-run` does not write.

Mis-replace protections: explicit id only; city / organizers / weekday / date are enforced when present; at least one of those, a note, or a filename containing the id is required; a filename that names a different event id is refused; class ads (课系, 大师课, 工作坊, workshop, master class) and `type: class` are skipped; hidden rows and featured events are skipped; a shared poster file is not overwritten.

Commit the new poster, the backup, the thumb, the JSON, and the log with the rest of the 异动. Then publish with the usual backup branch `backup/live-YYYYMMDD-HHMM` from main and keep `SITE_VERSION` unless the change is a version bump.

## Regular list — one-off and monthly

A city's 常规 list (home city view, and the legacy regular filter) includes `regular_oneoff` events whose `start` is today through the next 5 weeks (`today` + 34 days), under that date's weekday. Past dates stay hidden. Each of those cards shows a label: `oneoff_kind: "monthly"` → 月度活动 / Monthly; otherwise 单次活动 / One-off. Set `oneoff_kind` on the event (`"oneoff"` or `"monthly"`). A `theme_of` one-off still replaces only the weekly row whose next occurrence is that same date (for example E154 replaces Milonga X on 2026-11-10, not on earlier Tuesdays).

## Poster guard — every visible card has a poster

`tools/ensure_posters.py` fills any visible (`hidden != true`) card in `asia/events*.json` that has no `poster`: newest `posters_past[0]` first, else a generated text poster `images/asia/posters/generated/<id>.png` (1080×1350, same style) with thumbs + ATM_TH. `--check` exits 1 if any remain. It runs automatically after `radar_yidong.py`, at the end of `oti_weekly_update.sh`, in CI (`.github/workflows/poster-guard.yml`), and in the local pre-push hook.
