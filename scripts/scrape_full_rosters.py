import requests
from bs4 import BeautifulSoup
import json
import time
import re
import sys
import os

BBREF_TEAMS = {
    "ATL": "ATL", "BOS": "BOS", "BRK": "BKN", "CHI": "CHI", "CHO": "CHA",
    "CLE": "CLE", "DAL": "DAL", "DEN": "DEN", "DET": "DET", "GSW": "GSW",
    "HOU": "HOU", "IND": "IND", "LAC": "LAC", "LAL": "LAL", "MEM": "MEM",
    "MIA": "MIA", "MIL": "MIL", "MIN": "MIN", "NOP": "NOP", "NYK": "NYK",
    "OKC": "OKC", "ORL": "ORL", "PHI": "PHI", "PHO": "PHX", "POR": "POR",
    "SAC": "SAC", "SAS": "SAS", "TOR": "TOR", "UTA": "UTA", "WAS": "WAS",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

CURRENT_SEASON_START = 2025
DELAY = 3.1

def parse_salary(val):
    if not val or val.strip() in ('', '-'):
        return None
    val = val.strip().replace('$', '').replace(',', '')
    try:
        return round(float(val) / 1_000_000, 2)
    except ValueError:
        return None

def normalize_name(name):
    name = name.strip()
    name = re.sub(r'\s*\(TW\)\s*$', '', name)
    name = name.replace('\xa0', ' ')
    return name

def scrape_roster(bbref_code):
    url = f"https://www.basketball-reference.com/teams/{bbref_code}/2026.html"
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    resp.encoding = 'utf-8'
    soup = BeautifulSoup(resp.text, 'html.parser')
    table = soup.find('table', {'id': 'roster'})
    if not table:
        return {}
    tbody = table.find('tbody')
    if not tbody:
        return {}
    roster = {}
    for row in tbody.find_all('tr'):
        name_td = row.find('td', {'data-stat': 'player'})
        pos_td = row.find('td', {'data-stat': 'pos'})
        if not name_td or not pos_td:
            continue
        name_link = name_td.find('a')
        name = normalize_name(name_link.get_text(strip=True) if name_link else name_td.get_text(strip=True))
        pos = pos_td.get_text(strip=True)
        pos_map = {
            'PG': 'PG', 'SG': 'SG', 'SF': 'SF', 'PF': 'PF', 'C': 'C',
            'G': 'SG', 'F': 'SF', 'G-F': 'SG', 'F-G': 'SF', 'F-C': 'PF', 'C-F': 'C',
        }
        pos = pos_map.get(pos, pos.split('-')[0] if '-' in pos else pos)
        roster[name] = pos
    return roster

def scrape_contracts(bbref_code):
    url = f"https://www.basketball-reference.com/contracts/{bbref_code}.html"
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    resp.encoding = 'utf-8'
    soup = BeautifulSoup(resp.text, 'html.parser')
    table = soup.find('table', {'id': 'contracts'})
    if not table:
        return []
    thead = table.find('thead')
    header_rows = thead.find_all('tr') if thead else []
    last_header = header_rows[-1] if header_rows else None
    year_map = {}
    if last_header:
        for th in last_header.find_all('th'):
            stat = th.get('data-stat', '')
            text = th.get_text(strip=True)
            match = re.match(r'(\d{4})-(\d{2})', text)
            if match and stat.startswith('y'):
                year = int(match.group(1))
                year_map[stat] = year
    tbody = table.find('tbody')
    if not tbody:
        return []
    players = []
    for row in tbody.find_all('tr'):
        if row.get('class') and ('thead' in row['class'] or 'over_header' in row['class']):
            continue
        th = row.find('th', {'data-stat': 'player'})
        if not th:
            continue
        player_link = th.find('a')
        if not player_link:
            continue
        name = normalize_name(player_link.get_text(strip=True))
        age_td = row.find('td', {'data-stat': 'age_today'})
        age = None
        if age_td:
            try:
                age = int(age_td.get_text(strip=True))
            except (ValueError, TypeError):
                pass
        salary_by_year = {}
        option_info = {}
        for stat_key, year in year_map.items():
            td = row.find('td', {'data-stat': stat_key})
            if not td:
                continue
            salary = parse_salary(td.get_text(strip=True))
            cell_classes = td.get('class', [])
            if 'iz' in cell_classes:
                continue
            option_type = None
            if 'salary-pl' in cell_classes:
                option_type = 'player'
            elif 'salary-tm' in cell_classes:
                option_type = 'team'
            elif 'salary-et' in cell_classes:
                option_type = 'early_termination'
            if salary is not None and salary > 0:
                salary_by_year[str(year)] = salary
                if option_type:
                    option_info[str(year)] = option_type
        if not salary_by_year:
            continue
        years_list = sorted([int(y) for y in salary_by_year.keys()])
        cap_hit = salary_by_year.get(str(CURRENT_SEASON_START))
        if not cap_hit:
            cap_hit = salary_by_year.get(str(years_list[0]))
        contract_end = max(years_list) + 1 if years_list else None
        contract_years = len(years_list)
        last_year_str = str(years_list[-1])
        final_option = option_info.get(last_year_str, "none")
        players.append({
            "name": name,
            "age": age,
            "salary_by_year": salary_by_year,
            "cap_hit": cap_hit,
            "contract_years": contract_years,
            "contract_end_year": contract_end,
            "option_type": final_option,
        })
    return players

batch = int(sys.argv[1]) if len(sys.argv) > 1 else 0
bbref_codes = list(BBREF_TEAMS.keys())

if batch == 1:
    bbref_codes = bbref_codes[:15]
    print("=== BATCH 1: Teams 1-15 ===")
elif batch == 2:
    bbref_codes = bbref_codes[15:]
    print("=== BATCH 2: Teams 16-30 ===")
else:
    print("=== ALL TEAMS ===")

existing = {}
if batch == 2 and os.path.exists("/tmp/nba_full_rosters.json"):
    with open("/tmp/nba_full_rosters.json") as f:
        existing = json.load(f)

all_teams = existing.copy()
total = len(bbref_codes)

for idx, bbref_code in enumerate(bbref_codes):
    our_code = BBREF_TEAMS[bbref_code]
    print(f"[{idx+1}/{total}] {bbref_code} -> {our_code}...", end=" ", flush=True)
    try:
        roster = scrape_roster(bbref_code)
        print(f"roster={len(roster)}", end=" ", flush=True)
        time.sleep(DELAY)
        contracts = scrape_contracts(bbref_code)
        print(f"contracts={len(contracts)}", end=" ", flush=True)

        merged = []
        for c in contracts:
            pos = roster.get(c['name'], None)
            if not pos:
                for rname, rpos in roster.items():
                    if rname.split()[-1] == c['name'].split()[-1] and rname[0] == c['name'][0]:
                        pos = rpos
                        break
            if not pos:
                pos = 'SF'

            merged.append({
                "teamCode": our_code,
                "name": c['name'],
                "position": pos,
                "age": c['age'],
                "capHit": c['cap_hit'],
                "contractYears": c['contract_years'],
                "contractEndYear": c['contract_end_year'],
                "optionType": c['option_type'],
                "salaryByYear": c['salary_by_year'],
                "on_roster": c['name'] in roster,
            })
        all_teams[our_code] = merged
        print(f"OK ({len(merged)} players)")
    except Exception as e:
        print(f"ERROR: {e}")
        all_teams[our_code] = []

    if idx < total - 1:
        time.sleep(DELAY)

with open("/tmp/nba_full_rosters.json", "w") as f:
    json.dump(all_teams, f, indent=2)

total_players = sum(len(v) for v in all_teams.values())
print(f"\nSaved {total_players} players across {len(all_teams)} teams to /tmp/nba_full_rosters.json")
