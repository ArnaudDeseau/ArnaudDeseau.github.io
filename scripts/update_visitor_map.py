"""Fetch visitors-by-country from GoatCounter and save them to _data/visitors.json.

Environment variables:
  GOATCOUNTER_TOKEN  API key with "Read statistics" permission (required)
  GOATCOUNTER_SITE   your GoatCounter code, e.g. "arnaudd"
  START_DATE         count visitors from this day on (YYYY-MM-DD)
"""

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

try:
    import pycountry  # gives each country's numeric code, used by the map
except ImportError:
    pycountry = None

SITE = os.environ.get("GOATCOUNTER_SITE", "arnaudd")
TOKEN = os.environ.get("GOATCOUNTER_TOKEN")
START_DATE = os.environ.get("START_DATE", "2020-01-01")
OUT = "_data/visitors.json"

if not TOKEN:
    sys.exit("GOATCOUNTER_TOKEN is not set")

BASE = f"https://{SITE}.goatcounter.com/api/v0"
start = f"{START_DATE}T00:00:00Z"
end = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
end = end.strftime("%Y-%m-%dT%H:%M:%SZ")


# GoatCounter's server sometimes answers with a spurious 404 (or a 5xx / timeout)
# for a while. Wait and try again before giving up: 1, 2, 4, 8 then 15 minutes.
RETRY_WAITS = [int(x) for x in os.environ.get("RETRY_WAITS", "60,120,240,480,900").split(",")]
RETRY_CODES = {404, 408, 425, 429, 500, 502, 503, 504}


def get(path, params=None):
    url = f"{BASE}/{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
            "User-Agent": "visitor-map-updater (GitHub Actions)",
        },
    )
    for attempt in range(len(RETRY_WAITS) + 1):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                if resp.geturl() != url:
                    print(f"Note: redirected to {resp.geturl()}")
                return json.load(resp)
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")[:1000]
            problem = f"HTTP {e.code} for {url}\nResponse: {body}"
            if e.code not in RETRY_CODES:
                sys.exit(f"GoatCounter returned {problem}")
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            problem = f"no answer for {url} ({e})"
        if attempt == len(RETRY_WAITS):
            sys.exit(f"GoatCounter still failing after {attempt + 1} tries: {problem}")
        wait = RETRY_WAITS[attempt]
        print(f"GoatCounter: {problem}\n-> trying again in {wait} s", flush=True)
        time.sleep(wait)


def fetch(offset):
    return get(
        "stats/locations",
        {"start": start, "end": end, "limit": 100, "offset": offset},
    )


def numeric_code(alpha2):
    if pycountry is None:
        return None
    country = pycountry.countries.get(alpha_2=alpha2)
    return country.numeric if country else None


# Check the API key first, so a key problem gives a clear message.
me = get("me")
print(f"API key OK: {me.get('token', {}).get('name')!r}, site code {SITE!r}")

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
        entry = countries.setdefault(
            code, {"code": code, "num": numeric_code(code), "name": row.get("name") or code, "count": 0}
        )
        entry["count"] += int(row.get("count") or 0)
    if not page.get("more") or not stats:
        break
    offset += len(stats)

country_list = sorted(countries.values(), key=lambda c: -c["count"])
data = {
    "since": START_DATE,
    "total": sum(c["count"] for c in country_list),
    "countries": country_list,
}

# Only rewrite the file when something changed, to avoid empty daily commits.
try:
    with open(OUT, encoding="utf-8") as f:
        previous = json.load(f)
    previous.pop("updated", None)
    if previous == data:
        print("No change in visitor data.")
        sys.exit(0)
except (FileNotFoundError, json.JSONDecodeError):
    pass

data["updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print(f"Saved {len(country_list)} countries to {OUT}")
