import json
import re
import unicodedata

with open("/tmp/nba_contracts.json") as f:
    contracts = json.load(f)

with open("server/nbaRosterData2026.ts") as f:
    content = f.read()

def strip_accents(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')

def normalize(name):
    n = strip_accents(name.lower())
    n = n.replace(".", "").replace("'", "").replace("'", "").replace("-", " ").strip()
    n = re.sub(r'\s+(jr|sr|ii|iii|iv|v)$', '', n)
    return n

all_players_flat = []
for team_code, players in contracts.items():
    for p in players:
        p["_bbref_team"] = team_code
        all_players_flat.append(p)

contract_by_norm = {}
for p in all_players_flat:
    norm = normalize(p["name"])
    if norm not in contract_by_norm:
        contract_by_norm[norm] = p
    parts = p["name"].split()
    if len(parts) >= 2:
        last = strip_accents(parts[-1]).lower()
        first = strip_accents(parts[0]).lower()
        key2 = f"{first} {last}"
        if key2 not in contract_by_norm:
            contract_by_norm[key2] = p

def find_contract(name):
    norm = normalize(name)
    c = contract_by_norm.get(norm)
    if c:
        return c
    parts = name.split()
    if len(parts) >= 2:
        last = strip_accents(parts[-1]).lower()
        first = strip_accents(parts[0]).lower()
        for p in all_players_flat:
            cp = p["name"].split()
            if len(cp) >= 2:
                clast = strip_accents(cp[-1]).lower()
                cfirst = strip_accents(cp[0]).lower()
                if clast == last and cfirst[:3] == first[:3]:
                    return p
                if clast == last and len(first) <= 2 and cfirst.startswith(first):
                    return p
    return None

roster_pattern = re.compile(
    r'\{\s*teamCode:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*position:\s*"([^"]+)",\s*'
    r'depthOrder:\s*(\d+),\s*age:\s*(\d+),\s*capHit:\s*([\d.]+),\s*'
    r'contractYears:\s*(\d+),\s*status:\s*"([^"]+)",\s*sport:\s*"NBA"'
    r'(?:,\s*salaryByYear:\s*\{[^}]*\})?'
    r'(?:,\s*contractEndYear:\s*\w+)?'
    r'(?:,\s*optionType:\s*"[^"]*")?'
    r'\s*\}'
)

matched = 0
not_matched = 0
not_found_names = []
updates = []

def replace_entry(m):
    global matched, not_matched
    team = m.group(1)
    name = m.group(2)
    pos = m.group(3)
    depth = m.group(4)
    old_age = m.group(5)
    old_cap = m.group(6)
    old_years = m.group(7)
    status = m.group(8)

    contract = find_contract(name)

    if contract:
        matched += 1
        sby = contract["salary_by_year"]

        cap_hit = sby.get("2025")
        if not cap_hit or cap_hit == 0:
            cap_hit = sby.get("2026")
        if not cap_hit:
            years_sorted = sorted(sby.keys())
            for y in years_sorted:
                if sby[y] > 0:
                    cap_hit = sby[y]
                    break
        if not cap_hit:
            cap_hit = float(old_cap)

        future_salaries = {k: v for k, v in sby.items() if v > 0}

        contract_years = len(future_salaries) if future_salaries else int(old_years)
        contract_end = contract.get("contract_end_year")
        option_type = contract.get("option_type", "none")
        age = contract.get("age") or int(old_age)

        salary_json = json.dumps(future_salaries)

        result = f'{{ teamCode: "{team}", name: "{name}", position: "{pos}", depthOrder: {depth}, age: {age}, capHit: {cap_hit}, contractYears: {contract_years}, status: "{status}", sport: "NBA", salaryByYear: {salary_json}, contractEndYear: {contract_end}, optionType: "{option_type}" }}'
        return result
    else:
        not_matched += 1
        not_found_names.append(f"{name} ({team})")
        return m.group(0)

new_content = roster_pattern.sub(replace_entry, content)

with open("server/nbaRosterData2026.ts", "w") as f:
    f.write(new_content)

print(f"Matched: {matched}, Not matched: {not_matched}")
if not_found_names:
    print(f"\nNot found ({len(not_found_names)}):")
    for n in sorted(not_found_names):
        print(f"  {n}")
