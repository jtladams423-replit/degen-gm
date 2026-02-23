import requests
from bs4 import BeautifulSoup
import json
import time
import re
import unicodedata

BBREF_TEAMS = {
    "ATL": "ATL", "BOS": "BOS", "BRK": "BKN", "CHI": "CHI", "CHO": "CHA",
    "CLE": "CLE", "DAL": "DAL", "DEN": "DEN", "DET": "DET", "GSW": "GSW",
    "HOU": "HOU", "IND": "IND", "LAC": "LAC", "LAL": "LAL", "MEM": "MEM",
    "MIA": "MIA", "MIL": "MIL", "MIN": "MIN", "NOP": "NOP", "NYK": "NYK",
    "OKC": "OKC", "ORL": "ORL", "PHI": "PHI", "PHO": "PHX", "POR": "POR",
    "SAC": "SAC", "SAS": "SAS", "TOR": "TOR", "UTA": "UTA", "WAS": "WAS",
}

CURRENT_SEASON_START = 2025

def parse_salary(val):
    if not val or val.strip() in ('', '-'):
        return None
    val = val.strip().replace('$', '').replace(',', '')
    try:
        return round(float(val) / 1_000_000, 2)
    except ValueError:
        return None

def scrape_team(bbref_code):
    url = f"https://www.basketball-reference.com/contracts/{bbref_code}.html"
    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    resp.encoding = 'utf-8'

    soup = BeautifulSoup(resp.text, 'html.parser')

    table = soup.find('table', {'id': 'contracts'})
    if not table:
        print(f"  No contracts table found for {bbref_code}")
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

        name = player_link.get_text(strip=True)

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

        gtd_td = row.find('td', {'data-stat': 'remain_gtd'})
        guaranteed = None
        if gtd_td:
            guaranteed = parse_salary(gtd_td.get_text(strip=True))

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
            "guaranteed": guaranteed,
        })

    return players

all_contracts = {}
bbref_codes = list(BBREF_TEAMS.keys())
total = len(bbref_codes)

for idx, bbref_code in enumerate(bbref_codes):
    our_code = BBREF_TEAMS[bbref_code]
    print(f"[{idx+1}/{total}] Scraping {bbref_code} -> {our_code}...")
    try:
        players = scrape_team(bbref_code)
        all_contracts[our_code] = players
        print(f"  Found {len(players)} players with contracts")
    except Exception as e:
        print(f"  ERROR: {e}")
        all_contracts[our_code] = []

    if idx < total - 1:
        time.sleep(3.5)

with open("/tmp/nba_contracts.json", "w") as f:
    json.dump(all_contracts, f, indent=2)

total_players = sum(len(v) for v in all_contracts.values())
print(f"\nDone! Scraped {total_players} player contracts across {len(all_contracts)} teams")

for team in ["BOS", "LAL", "GSW"]:
    print(f"\n=== {team} Sample ===")
    for p in all_contracts.get(team, [])[:3]:
        print(f"  {p['name']:25s} cap=${p['cap_hit']:.2f}M  years={p['contract_years']}  end={p['contract_end_year']}  opt={p['option_type']}  salary={p['salary_by_year']}")
