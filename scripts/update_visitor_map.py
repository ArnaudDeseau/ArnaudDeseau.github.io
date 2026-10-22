"""Fetch visitors-by-country from GoatCounter and save them to _data/visitors.json.

Environment variables:
  GOATCOUNTER_TOKEN  API key with "Read statistics" permission (required)
  GOATCOUNTER_SITE   your GoatCounter code, e.g. "arnaudd"
  START_DATE         count visitors from this day on (YYYY-MM-DD)
"""

import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone

SITE = os.environ.get("GOATCOUNTER_SITE", "arnaudd")
TOKEN = os.environ.get("GOATCOUNTER_TOKEN")
START_DATE = os.environ.get("START_DATE", "2020-01-01")
OUT = "_data/visitors.json"

if not TOKEN:
    sys.exit("GOATCOUNTER_TOKEN is not set")

API = f"https://{SITE}.goatcounter.com/api/v0/stats/locations"
start = f"{START_DATE}T00:00:00Z"
end = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
end = end.strftime("%Y-%m-%dT%H:%M:%SZ")


def fetch(offset):
    query = urllib.parse.urlencode(
        {"start": start, "end": end, "limit": 100, "offset": offset}
    )
    req = urllib.request.Request(
        f"{API}?{query}",
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


# Collect all pages of results, merged by ISO country code.
countries = {}
offset = 0
while True:
    page = fetch(offset)
    stats = page.get("stats") or []
    for row in stats:
        code = (row.get("id") or "").split("-")[0].upper()
        if len(code) != 2 or not code.isalpha():
            continue  # "(unknown)" location
        entry = countries.setdefault(code, {"code": code, "name": row.get("name") or code, "count": 0})
        entry["count"] += int(row.get("count") or 0)
    if not page.get("more") or not stats:
        break
    offset += len(stats)

country_list = sorted(countries.values(), key=lambda c: -c["count"])

# Only rewrite the file when the numbers changed, to avoid empty daily commits.
try:
    with open(OUT, encoding="utf-8") as f:
        if json.load(f).get("countries") == country_list:
            print("No change in visitor data.")
            sys.exit(0)
except (FileNotFoundError, json.JSONDecodeError):
    pass

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(
        {
            "updated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "since": START_DATE,
            "total": sum(c["count"] for c in country_list),
            "countries": country_list,
        },
        f,
        ensure_ascii=False,
        indent=2,
    )
print(f"Saved {len(country_list)} countries to {OUT}")
