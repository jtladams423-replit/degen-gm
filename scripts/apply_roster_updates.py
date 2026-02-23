import json
import re
import sys

with open("/tmp/scraped_rosters.json") as f:
    scraped = json.load(f)

with open("server/nbaRosterData2026.ts") as f:
    content = f.read()

roster_entries = re.findall(
    r'teamCode:\s*"([^"]+)",\s*name:\s*"([^"]+)"', content
)

scraped_by_normalized = {}
for key, val in scraped.items():
    norm = key.replace(".", "").replace("'", "").replace("'", "").lower().strip()
    scraped_by_normalized[norm] = val
    parts = key.split()
    if len(parts) >= 2:
        scraped_by_normalized[f"{parts[0]} {parts[-1]}".lower()] = val

def find_player(name):
    key = name.lower()
    if key in scraped:
        return scraped[key]
    
    norm = key.replace(".", "").replace("'", "").replace("'", "").strip()
    if norm in scraped_by_normalized:
        return scraped_by_normalized[norm]
    
    parts = name.split()
    if len(parts) >= 2:
        short = f"{parts[0]} {parts[-1]}".lower()
        if short in scraped_by_normalized:
            return scraped_by_normalized[short]
    
    for skey, sval in scraped.items():
        sname = sval["name"]
        if parts[-1].lower() == sname.split()[-1].lower():
            if parts[0].lower()[:3] == sname.split()[0].lower()[:3]:
                return sval
    
    return None

updates = []
matched = 0
not_found = []

for team_code, name in roster_entries:
    player = find_player(name)
    if not player:
        not_found.append(f"{name} ({team_code})")
    elif player["team"] != team_code:
        updates.append({
            "name": name,
            "oldTeam": team_code,
            "newTeam": player["team"],
        })
    else:
        matched += 1

print(f"Total: {len(roster_entries)}, Matched: {matched}, Updates: {len(updates)}, Not found: {len(not_found)}")

if updates:
    print(f"\n=== APPLYING {len(updates)} TEAM CHANGES ===")
    modified = content
    for u in updates:
        old_pattern = f'teamCode: "{u["oldTeam"]}", name: "{u["name"]}"'
        new_pattern = f'teamCode: "{u["newTeam"]}", name: "{u["name"]}"'
        if old_pattern in modified:
            modified = modified.replace(old_pattern, new_pattern, 1)
            print(f"  {u['name']}: {u['oldTeam']} -> {u['newTeam']}")
        else:
            print(f"  SKIP (not found in file): {u['name']}")
    
    with open("server/nbaRosterData2026.ts", "w") as f:
        f.write(modified)
    print(f"\nSeed file updated!")

if not_found:
    print(f"\n=== NOT FOUND ({len(not_found)}) ===")
    for n in not_found:
        print(f"  {n}")

print("\nDone!")
