import json
import unicodedata

with open("/tmp/nba_full_rosters.json") as f:
    all_teams = json.load(f)

TEAM_NAMES = {
    "ATL": "Atlanta Hawks", "BOS": "Boston Celtics", "BKN": "Brooklyn Nets",
    "CHA": "Charlotte Hornets", "CHI": "Chicago Bulls", "CLE": "Cleveland Cavaliers",
    "DAL": "Dallas Mavericks", "DEN": "Denver Nuggets", "DET": "Detroit Pistons",
    "GSW": "Golden State Warriors", "HOU": "Houston Rockets", "IND": "Indiana Pacers",
    "LAC": "LA Clippers", "LAL": "Los Angeles Lakers", "MEM": "Memphis Grizzlies",
    "MIA": "Miami Heat", "MIL": "Milwaukee Bucks", "MIN": "Minnesota Timberwolves",
    "NOP": "New Orleans Pelicans", "NYK": "New York Knicks", "OKC": "Oklahoma City Thunder",
    "ORL": "Orlando Magic", "PHI": "Philadelphia 76ers", "PHX": "Phoenix Suns",
    "POR": "Portland Trail Blazers", "SAC": "Sacramento Kings", "SAS": "San Antonio Spurs",
    "TOR": "Toronto Raptors", "UTA": "Utah Jazz", "WAS": "Washington Wizards",
}

TEAM_ORDER = [
    "ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GSW",
    "HOU", "IND", "LAC", "LAL", "MEM", "MIA", "MIL", "MIN", "NOP", "NYK",
    "OKC", "ORL", "PHI", "PHX", "POR", "SAC", "SAS", "TOR", "UTA", "WAS",
]

def normalize_to_ascii(name):
    nfkd = unicodedata.normalize('NFKD', name)
    ascii_name = ''.join(c for c in nfkd if not unicodedata.combining(c))
    ascii_name = ascii_name.replace('ё', 'e').replace('Ё', 'E')
    ascii_name = ascii_name.replace('ø', 'o').replace('Ø', 'O')
    ascii_name = ascii_name.replace('đ', 'd').replace('Đ', 'D')
    return ascii_name

lines = []
lines.append('import type { InsertRosterPlayer } from "@shared/schema";')
lines.append('')
lines.append('export const nbaRosters2026: InsertRosterPlayer[] = [')

total_players = 0
name_changes = []

for team_code in TEAM_ORDER:
    players = all_teams.get(team_code, [])
    team_name = TEAM_NAMES.get(team_code, team_code)
    lines.append(f'  // ========== {team_code} - {team_name} ==========')

    sorted_players = sorted(players, key=lambda p: -p['capHit'])

    for depth_idx, p in enumerate(sorted_players):
        depth = (depth_idx // 5) + 1
        if depth > 3:
            depth = 3

        original_name = p['name']
        ascii_name = normalize_to_ascii(original_name)
        if ascii_name != original_name:
            name_changes.append(f"  {original_name} -> {ascii_name}")

        name = ascii_name.replace("'", "\\'")
        salary_json = json.dumps(p['salaryByYear'])
        salary_str = salary_json.replace('"', '"')

        contract_years = p['contractYears']
        salary_count = len(p['salaryByYear'])
        if contract_years != salary_count:
            contract_years = salary_count

        line = (
            f'  {{ teamCode: "{team_code}", name: "{name}", position: "{p["position"]}", '
            f'depthOrder: {depth}, age: {p["age"] or 25}, capHit: {p["capHit"]}, '
            f'contractYears: {contract_years}, status: "active", sport: "NBA", '
            f'salaryByYear: {salary_str}, '
            f'contractEndYear: {p["contractEndYear"]}, optionType: "{p["optionType"]}" }},'
        )
        lines.append(line)
        total_players += 1

    lines.append('')

lines.append('];')
lines.append('')

output = '\n'.join(lines)
with open("server/nbaRosterData2026.ts", "w") as f:
    f.write(output)

print(f"Generated server/nbaRosterData2026.ts with {total_players} players across {len(TEAM_ORDER)} teams")
if name_changes:
    print(f"\nNormalized {len(name_changes)} names with diacritics:")
    for c in name_changes:
        print(c)
