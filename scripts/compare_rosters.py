import json
import re

with open("/tmp/scraped_rosters.json") as f:
    scraped = json.load(f)

with open("server/nbaRosterData2026.ts") as f:
    content = f.read()

roster_entries = re.findall(
    r'teamCode:\s*"([^"]+)",\s*name:\s*"([^"]+)"', content
)

updates = []
matched = 0
not_found = []

name_normalizations = {
    "nic claxton": "nicolas claxton",
    "cam thomas": "cameron thomas",
    "cam johnson": "cameron johnson",
    "pj tucker": "p.j. tucker",
    "kj martin": "kenyon martin jr.",
    "larry nance jr": "larry nance jr.",
    "gary trent jr": "gary trent jr.",
    "wendell carter jr": "wendell carter jr.",
    "kelly oubre jr": "kelly oubre jr.",
    "jaren jackson jr": "jaren jackson jr.",
    "marcus morris sr": "marcus morris sr.",
    "gary payton ii": "gary payton ii",
    "tim hardaway jr": "tim hardaway jr.",
    "dereck lively ii": "dereck lively ii",
    "jabari smith jr": "jabari smith jr.",
    "kenrich williams": "kenrich williams",
}

for team_code, name in roster_entries:
    key = name.lower()
    
    normalized = name_normalizations.get(key, key)
    
    player = scraped.get(normalized) or scraped.get(key)
    
    if not player:
        for scraped_key, scraped_player in scraped.items():
            if key.split()[-1] == scraped_key.split()[-1] and key.split()[0] == scraped_key.split()[0]:
                player = scraped_player
                break
    
    if not player:
        not_found.append(f"{name} ({team_code})")
    elif player["team"] != team_code:
        updates.append({
            "name": name,
            "oldTeam": team_code,
            "newTeam": player["team"],
            "scrapedName": player["name"],
        })
    else:
        matched += 1

print(f"Total roster players: {len(roster_entries)}")
print(f"Matched (correct team): {matched}")
print(f"Need team update: {len(updates)}")
print(f"Not found in scrape: {len(not_found)}")

if updates:
    print("\n=== TEAM CHANGES NEEDED ===")
    for u in updates:
        print(f"  {u['name']}: {u['oldTeam']} -> {u['newTeam']}")

if not_found:
    print(f"\n=== NOT FOUND ({len(not_found)}) ===")
    for n in not_found:
        print(f"  {n}")

with open("/tmp/roster-sync-results.json", "w") as f:
    json.dump({"updates": updates, "not_found": not_found, "matched": matched}, f, indent=2)

print(f"\nResults saved to /tmp/roster-sync-results.json")
