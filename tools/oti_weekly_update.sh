#!/usr/bin/env bash
# Weekly read-only sync of OnlyTangoInfo China/HK/Macau/Taiwan data -> china/events.json (+ events-changes.json).
# Usage (from repo root): bash tools/oti_weekly_update.sh   [needs python3 + cryptography]
# Never writes to OnlyTangoInfo; only GET requests.
set -euo pipefail
cd "$(dirname "$0")/.."
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
UPDATED="$(python3 tools/oti_fetch_decrypt.py "$TMP/oti.js")"
echo "OTI data date: $UPDATED"
cp china/events.json "$TMP/old.json" 2>/dev/null || echo '[]' > "$TMP/old.json"
python3 tools/oti_to_china_json.py "$TMP/oti.js" "$TMP/new.json" --updated "$UPDATED"
python3 - "$TMP/new.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
assert isinstance(d, list) and len(d) >= 5, f"sanity check failed: only {len(d)} records"
PY
python3 tools/oti_changes.py "$TMP/old.json" "$TMP/new.json" china/events-changes.json --source-updated "$UPDATED"
cp "$TMP/new.json" china/events.json
