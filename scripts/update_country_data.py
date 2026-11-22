"""Download country characteristics from the World Bank and save them to
_data/country_covariates.json, for the regression under the visitor map.

For every World Bank economy (aggregates such as "World" or "Euro area" are
left out) it stores the World Bank three-letter code and the most recent
available value of each indicator below.

Add an indicator by adding a line to INDICATORS; it then appears under that
key in the JSON file, with its year in "<key>_year".
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

INDICATORS = {
    # key in the JSON file: World Bank indicator code
    "gdp_pc": "NY.GDP.PCAP.PP.CD",  # GDP per capita, PPP (current international $)
}
FIRST_YEAR = 2015  # look for the most recent value from this year on
OUT = "_data/country_covariates.json"
API = "https://api.worldbank.org/v2"
RETRY_WAITS = [int(x) for x in os.environ.get("RETRY_WAITS", "30,60,120,240").split(",")]


def get_json(url):
    for attempt in range(len(RETRY_WAITS) + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "country-data-updater (GitHub Actions)"})
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.load(resp)
        except (urllib.error.URLError, TimeoutError, ConnectionError, json.JSONDecodeError) as e:
            problem = f"{url}: {e}"
        if attempt == len(RETRY_WAITS):
            sys.exit(f"World Bank API still failing after {attempt + 1} tries: {problem}")
        print(f"World Bank API: {problem}\n-> trying again in {RETRY_WAITS[attempt]} s", flush=True)
        time.sleep(RETRY_WAITS[attempt])


def get_all(path, params):
    """All pages of a World Bank API v2 list."""
    rows, page = [], 1
    while True:
        query = "&".join(f"{k}={v}" for k, v in {**params, "format": "json", "page": page}.items())
        data = get_json(f"{API}/{path}?{query}")
        if not isinstance(data, list) or len(data) < 2 or data[1] is None:
            sys.exit(f"Unexpected answer from the World Bank API for {path}: {str(data)[:500]}")
        rows.extend(data[1])
        if page >= int(data[0].get("pages", 1)):
            return rows
        page += 1


# 1. Economies (not aggregates), with their codes.
economies = {}
for c in get_all("country", {"per_page": 400}):
    if (c.get("region") or {}).get("value", "").strip() == "Aggregates":
        continue
    economies[c["id"]] = {"iso2": c["iso2Code"], "iso3": c["id"], "name": c["name"].strip()}
print(f"{len(economies)} economies")

# 2. Most recent value of each indicator.
indicator_names = {}
for key, code in INDICATORS.items():
    rows = get_all(
        f"country/all/indicator/{code}",
        {"date": f"{FIRST_YEAR}:{datetime.now(timezone.utc).year}", "per_page": 20000},
    )
    found = 0
    for r in rows:
        indicator_names[key] = r["indicator"]["value"]
        iso3, value = r.get("countryiso3code"), r.get("value")
        if iso3 not in economies or value is None:
            continue
        year = int(r["date"])
        e = economies[iso3]
        if e.get(f"{key}_year", 0) < year:
            if f"{key}_year" not in e:
                found += 1
            e[key] = round(float(value), 2)
            e[f"{key}_year"] = year
    print(f"{key} ({code}): values for {found} economies")
    if found < 100:
        sys.exit(f"Only {found} values for {code}: something is wrong, keeping the old file.")

# 3. Save, keyed by the two-letter code that GoatCounter uses.
countries = {}
for e in economies.values():
    iso2 = e.pop("iso2")
    if len(iso2) == 2 and iso2.isalpha():
        countries[iso2.upper()] = e

data = {
    "source": "World Bank, World Development Indicators",
    "indicators": {key: {"code": code, "name": indicator_names.get(key, code)} for key, code in INDICATORS.items()},
    "countries": dict(sorted(countries.items())),
}

try:
    with open(OUT, encoding="utf-8") as f:
        previous = json.load(f)
    previous.pop("retrieved", None)
    if previous == data:
        print("No change in country data.")
        sys.exit(0)
except (FileNotFoundError, json.JSONDecodeError):
    pass

data["retrieved"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=1)
print(f"Saved {len(countries)} countries to {OUT}")
