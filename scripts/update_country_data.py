"""Download country characteristics and save them to _data/country_covariates.json,
for the regression under the visitor map.

Sources:
  - World Bank, World Development Indicators (API): GDP per capita (PPP),
    population, alcohol consumption per capita. Most recent value per country.
  - RePEc/IDEAS ranking of countries and states by "Number of Journal Pages,
    Weighted by Number of Authors and Recursive Impact Factors" (all years,
    economists currently registered in each country), plus the number of
    registered economists (authors and author shares, by affiliation).
    US states are summed into the United States, and French overseas
    departments into France. If the RePEc page cannot be read, the previous
    RePEc values are kept.

Add a World Bank indicator by adding a line to INDICATORS; it then appears
under that key in the JSON file, with its year in "<key>_year".
"""

import html
import json
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser

INDICATORS = {
    # key in the JSON file: World Bank indicator code
    "gdp_pc": "NY.GDP.PCAP.PP.CD",  # GDP per capita, PPP (current international $)
    "pop": "SP.POP.TOTL",           # Population, total
    "alc": "SH.ALC.PCAP.LI",        # Total alcohol consumption per capita (litres of pure alcohol, 15+)
}
FIRST_YEAR = 2015  # look for the most recent value from this year on
OUT = "_data/country_covariates.json"
API = "https://api.worldbank.org/v2"
REPEC_URL = "https://ideas.repec.org/top/top.country.awscpages.html"
RETRY_WAITS = [int(x) for x in os.environ.get("RETRY_WAITS", "30,60,120,240").split(",")]
USER_AGENT = "country-data-updater for a personal academic website (GitHub Actions)"


def fetch(url):
    for attempt in range(len(RETRY_WAITS) + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=60) as resp:
                return resp.read()
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            problem = f"{url}: {e}"
        if attempt == len(RETRY_WAITS):
            raise RuntimeError(f"still failing after {attempt + 1} tries: {problem}")
        print(f"{problem}\n-> trying again in {RETRY_WAITS[attempt]} s", flush=True)
        time.sleep(RETRY_WAITS[attempt])


def get_all(path, params):
    """All pages of a World Bank API v2 list."""
    rows, page = [], 1
    while True:
        query = "&".join(f"{k}={v}" for k, v in {**params, "format": "json", "page": page}.items())
        try:
            data = json.loads(fetch(f"{API}/{path}?{query}"))
        except (RuntimeError, json.JSONDecodeError) as e:
            sys.exit(f"World Bank API: {e}")
        if not isinstance(data, list) or len(data) < 2 or data[1] is None:
            sys.exit(f"Unexpected answer from the World Bank API for {path}: {str(data)[:500]}")
        rows.extend(data[1])
        if page >= int(data[0].get("pages", 1)):
            return rows
        page += 1


def norm(name):
    """Lower case, no accents, no punctuation: for matching country names."""
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", name.lower()).strip()


# ---------------------------------------------------------------------------
# 1. World Bank: economies (not aggregates) and indicators
# ---------------------------------------------------------------------------

economies = {}
for c in get_all("country", {"per_page": 400}):
    if (c.get("region") or {}).get("value", "").strip() == "Aggregates":
        continue
    economies[c["id"]] = {"iso2": c["iso2Code"], "iso3": c["id"], "name": c["name"].strip()}
print(f"{len(economies)} economies")

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
            e[key] = round(float(value), 3)
            e[f"{key}_year"] = year
    print(f"{key} ({code}): values for {found} economies")
    if found < 100:
        sys.exit(f"Only {found} values for {code}: something is wrong, keeping the old file.")

countries = {}
for e in economies.values():
    iso2 = e.pop("iso2")
    if len(iso2) == 2 and iso2.isalpha():
        countries[iso2.upper()] = e

# ---------------------------------------------------------------------------
# 2. RePEc: registered economists by country
# ---------------------------------------------------------------------------

# RePEc names that differ from the World Bank's (value: two-letter code).
REPEC_ALIASES = {
    "south korea": "KR", "north korea": "KP", "russia": "RU", "czech republic": "CZ",
    "hong kong": "HK", "macao": "MO", "egypt": "EG", "slovakia": "SK", "cameroun": "CM",
    "venezuela": "VE", "iran": "IR", "cote d ivoire": "CI", "kyrgyzstan": "KG",
    "congo dem rep": "CD", "congo rep": "CG", "palestinian authority": "PS", "brunei": "BN",
    "haiti": "HT", "swaziland": "SZ", "gambia": "GM", "laos": "LA", "syria": "SY",
    "bahamas": "BS", "yemen": "YE", "faroes": "FO", "man": "IM", "micronesia": "FM",
    "sao tome and principe": "ST", "tchad": "TD", "turks and caicos": "TC",
    "united states virgin islands": "VI", "turkey": "TR", "curacao": "CW",
    "st kitts and nevis": "KN", "st lucia": "LC", "st vincent and the grenadines": "VC",
    "united states": "US", "puerto rico": "PR", "somalia": "SO", "nauru": "NR",
    # Guernsey and Jersey are one economy in World Bank data: the Channel Islands.
    "guernsey": "JG", "jersey": "JG",
    # French overseas departments are part of France in World Bank data.
    "reunion": "FR", "martinique": "FR", "guadeloupe": "FR", "french guyana": "FR", "mayotte": "FR",
}
# Rows that are not countries, or places the World Bank does not cover.
REPEC_SKIP = {"associations and societies", "northern cyprus", "taiwan", "aland", "vatican",
              "anguilla", "cook islands", "falkland islands", "montserrat", "niue",
              "norfolk island", "st helena", "tokelau", "wallis and futuna"}


class TableParser(HTMLParser):
    """Collects every table as a list of rows of cell texts."""

    def __init__(self):
        super().__init__()
        self.tables, self.row, self.cell = [], None, None

    def handle_starttag(self, tag, attrs):
        if tag == "table":
            self.tables.append([])
        elif tag == "tr" and self.tables:
            self.row = []
        elif tag in ("td", "th") and self.row is not None:
            self.cell = []
        elif tag == "br" and self.cell is not None:
            self.cell.append(" ")

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.cell is not None and self.row is not None:
            self.row.append(re.sub(r"\s+", " ", "".join(self.cell)).strip())
            self.cell = None
        elif tag == "tr" and self.row is not None and self.tables:
            if self.row:
                self.tables[-1].append(self.row)
            self.row = None

    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)


def number(text):
    text = text.replace(",", "").strip()
    return float(text) if re.fullmatch(r"-?\d+(\.\d+)?", text) else None


def read_repec():
    """Returns ({iso2: {"score": x, "authors": n, "shares": s}}, date text) or raises."""
    page = fetch(REPEC_URL).decode("utf-8", "replace")
    parser = TableParser()
    parser.feed(page)
    table = header = None
    for t in parser.tables:
        for i, row in enumerate(t[:3]):
            low = [c.lower() for c in row]
            if any("country" in c for c in low) and "authors" in low:
                table, header = t[i + 1:], low
                break
        if table:
            break
    if not table:
        raise RuntimeError("ranking table not found on the page")
    col_name = next(i for i, c in enumerate(header) if "country" in c)
    col_score = header.index("score")
    col_authors = header.index("authors")
    col_shares = next(i for i, c in enumerate(header) if c.startswith("author") and "share" in c)

    by_norm = {norm(e["name"]): iso2 for iso2, e in countries.items()}
    out, unmatched = {}, []
    for row in table:
        if len(row) <= max(col_name, col_score, col_authors, col_shares):
            continue
        name = html.unescape(row[col_name])
        score = number(row[col_score])
        authors, shares = number(row[col_authors]), number(row[col_shares])
        if score is None or authors is None or shares is None:
            continue
        key = norm(name)
        if key.endswith(" united states"):  # "Massachusetts (United States)"
            key = "united states"
        if key in REPEC_SKIP:
            continue
        iso2 = REPEC_ALIASES.get(key) or by_norm.get(key)
        if not iso2 or iso2 not in countries:
            unmatched.append(name)
            continue
        slot = out.setdefault(iso2, {"score": 0.0, "authors": 0.0, "shares": 0.0})
        slot["score"] += score
        slot["authors"] += authors
        slot["shares"] += shares
    if unmatched:
        print("RePEc names not matched (ignored):", ", ".join(unmatched))
    if len(out) < 80:
        raise RuntimeError(f"only {len(out)} countries read from the RePEc table")
    when = re.search(r"as of ([A-Z][a-z]+ \d{4})", page)
    return out, when.group(1) if when else None


previous = {}
try:
    with open(OUT, encoding="utf-8") as f:
        previous = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    pass

repec_note = None
try:
    repec, repec_date = read_repec()
    for iso2, e in countries.items():
        r = repec.get(iso2, {"score": 0.0, "authors": 0.0, "shares": 0.0})  # not listed: none
        e["repec_wpages"] = round(r["score"], 2)
        e["repec_authors"] = int(round(r["authors"]))
        e["repec_shares"] = round(r["shares"], 2)
    repec_note = {
        "source": "RePEc/IDEAS, Top Countries and States by Number of Journal Pages, "
                  "Weighted by Number of Authors and Recursive Impact Factors",
        "url": REPEC_URL,
        "as_of": repec_date,
    }
    us = countries.get("US", {})
    print(f"RePEc: {len(repec)} countries ({repec_date}); United States = "
          f"{us.get('repec_wpages')} weighted pages, {us.get('repec_authors')} authors")
except Exception as e:  # keep what we had rather than lose the variable
    print(f"WARNING: could not read RePEc ({e}); keeping the previous RePEc values.")
    old = previous.get("countries", {})
    for iso2, e2 in countries.items():
        for k in ("repec_wpages", "repec_authors", "repec_shares"):
            if k in old.get(iso2, {}):
                e2[k] = old[iso2][k]
    repec_note = previous.get("repec")

# ---------------------------------------------------------------------------
# 3. Save, keyed by the two-letter code that GoatCounter uses
# ---------------------------------------------------------------------------

data = {
    "source": "World Bank, World Development Indicators; RePEc/IDEAS",
    "indicators": {key: {"code": code, "name": indicator_names.get(key, code)} for key, code in INDICATORS.items()},
    "repec": repec_note,
    "countries": dict(sorted(countries.items())),
}

previous.pop("retrieved", None)
if previous == data:
    print("No change in country data.")
    sys.exit(0)

data["retrieved"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=1)
print(f"Saved {len(countries)} countries to {OUT}")
