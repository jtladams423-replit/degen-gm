import json
import re
import unicodedata

with open("/tmp/scraped_rosters.json") as f:
    scraped = json.load(f)

with open("server/nbaRosterData2026.ts") as f:
    content = f.read()

def strip_accents(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')

def normalize(name):
    n = strip_accents(name.lower())
    n = n.replace(".", "").replace("'", "").replace("'", "").replace("-", " ").strip()
    n = re.sub(r'\s+(jr|sr|ii|iii|iv)$', '', n)
    return n

scraped_normalized = {}
for key, val in scraped.items():
    norm = normalize(val["name"])
    scraped_normalized[norm] = val
    parts = val["name"].split()
    if len(parts) >= 2:
        last = strip_accents(parts[-1]).lower()
        first = strip_accents(parts[0]).lower()
        scraped_normalized[f"{first} {last}"] = val

not_found_players = [
    ("ATL", "Dejounte Murray"), ("ATL", "Bogdan Bogdanovic"),
    ("BOS", "Jayson Tatum"), ("BOS", "Nikola Vucevic"),
    ("BOS", "Jaden Springer"), ("BOS", "Xavier Tillman"),
    ("BKN", "Ben Simmons"), ("BKN", "Dennis Schroder"),
    ("BKN", "Keon Johnson"), ("BKN", "Dariq Whitehead"),
    ("CHA", "Tidjane Salaun"), ("CHA", "Vasilije Micic"), ("CHA", "JT Thor"),
    ("CHI", "Torrey Craig"),
    ("CLE", "Max Strus"), ("CLE", "Tristan Thompson"),
    ("DAL", "Kyrie Irving"),
    ("DEN", "Nikola Jokic"), ("DEN", "Reggie Jackson"),
    ("DET", "Alec Burks"), ("DET", "Dario Saric"),
    ("GSW", "Kristaps Porzingis"),
    ("HOU", "Alperen Sengun"), ("HOU", "Fred VanVleet"),
    ("IND", "Tyrese Haliburton"),
    ("LAC", "PJ Tucker"), ("LAC", "Brandon Boston Jr"),
    ("LAL", "Luka Doncic"), ("LAL", "Christian Wood"),
    ("LAL", "Cam Reddish"), ("LAL", "Jalen Hood-Schifino"), ("LAL", "Maxwell Lewis"),
    ("MEM", "GG Jackson"), ("MEM", "Kenneth Lofton Jr"), ("MEM", "Georges Niang"),
    ("MIA", "Terry Rozier"), ("MIA", "Nikola Jovic"),
    ("MIA", "Josh Richardson"), ("MIA", "Haywood Highsmith"),
    ("MIL", "Damian Lillard"), ("MIL", "Malik Beasley"), ("MIL", "Robin Lopez"),
    ("NOP", "Dereon Seabron"), ("NOP", "Karlo Matkovic"),
    ("NYK", "Keita Bates-Diop"),
    ("OKC", "Lu Dort"), ("OKC", "Nikola Topic"),
    ("PHI", "Robert Covington"), ("PHI", "KJ Martin"), ("PHI", "Jeff Dowtin Jr"), ("PHI", "Ricky Council IV"),
    ("PHX", "Jusuf Nurkic"), ("PHX", "Nassir Little"), ("PHX", "Bol Bol"), ("PHX", "TyTy Washington"),
    ("POR", "Robert Williams III"), ("POR", "Malcolm Brogdon"),
    ("SAC", "Chris Duarte"), ("SAC", "Alex Len"), ("SAC", "Trey Lyles"), ("SAC", "Mason Jones"),
    ("WAS", "Johnny Davis"), ("WAS", "Jonas Valanciunas"), ("WAS", "Dante Exum"),
    ("IND", "TJ McConnell"), ("LAC", "Derrick Jones Jr"),
    ("MIA", "Jaime Jaquez Jr"), ("MIL", "AJ Green"), ("MIL", "Andre Jackson Jr"),
    ("MIN", "Terrence Shannon Jr"), ("NOP", "Herb Jones"),
    ("CLE", "Craig Porter Jr"), ("MEM", "Scotty Pippen Jr"),
    ("CHI", "Rob Dillingham"),
]

updates = []
still_not_found = []

for team_code, name in not_found_players:
    norm = normalize(name)
    player = scraped_normalized.get(norm)
    
    if not player:
        parts = name.split()
        last = strip_accents(parts[-1]).lower() if parts else ""
        first = strip_accents(parts[0]).lower() if parts else ""
        for skey, sval in scraped.items():
            sparts = sval["name"].split()
            slast = strip_accents(sparts[-1]).lower() if sparts else ""
            sfirst = strip_accents(sparts[0]).lower() if sparts else ""
            if slast == last and sfirst[:3] == first[:3]:
                player = sval
                break
            if len(first) <= 3 and slast == last and sfirst.startswith(first.lower()):
                player = sval
                break
    
    if player:
        if player["team"] != team_code:
            updates.append({"name": name, "oldTeam": team_code, "newTeam": player["team"], "scraped": player["name"]})
            print(f"  UPDATE: {name} ({team_code}) -> {player['team']} [matched: {player['name']}]")
        else:
            print(f"  OK: {name} ({team_code}) [matched: {player['name']}]")
    else:
        still_not_found.append(f"{name} ({team_code})")
        print(f"  NOT FOUND: {name} ({team_code})")

if updates:
    print(f"\nApplying {len(updates)} additional updates...")
    modified = content
    for u in updates:
        old = f'teamCode: "{u["oldTeam"]}", name: "{u["name"]}"'
        new = f'teamCode: "{u["newTeam"]}", name: "{u["name"]}"'
        if old in modified:
            modified = modified.replace(old, new, 1)
        else:
            print(f"  SKIP: {u['name']} pattern not found")
    
    with open("server/nbaRosterData2026.ts", "w") as f:
        f.write(modified)
    print("Seed file updated!")

print(f"\nStill not found: {len(still_not_found)}")
for n in still_not_found:
    print(f"  {n}")
