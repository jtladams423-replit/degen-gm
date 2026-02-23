import json
import sys
from basketball_reference_web_scraper import client
from basketball_reference_web_scraper.data import Team

TEAM_ABBREV_MAP = {
    Team.ATLANTA_HAWKS: "ATL",
    Team.BOSTON_CELTICS: "BOS",
    Team.BROOKLYN_NETS: "BKN",
    Team.CHARLOTTE_HORNETS: "CHA",
    Team.CHICAGO_BULLS: "CHI",
    Team.CLEVELAND_CAVALIERS: "CLE",
    Team.DALLAS_MAVERICKS: "DAL",
    Team.DENVER_NUGGETS: "DEN",
    Team.DETROIT_PISTONS: "DET",
    Team.GOLDEN_STATE_WARRIORS: "GSW",
    Team.HOUSTON_ROCKETS: "HOU",
    Team.INDIANA_PACERS: "IND",
    Team.LOS_ANGELES_CLIPPERS: "LAC",
    Team.LOS_ANGELES_LAKERS: "LAL",
    Team.MEMPHIS_GRIZZLIES: "MEM",
    Team.MIAMI_HEAT: "MIA",
    Team.MILWAUKEE_BUCKS: "MIL",
    Team.MINNESOTA_TIMBERWOLVES: "MIN",
    Team.NEW_ORLEANS_PELICANS: "NOP",
    Team.NEW_YORK_KNICKS: "NYK",
    Team.OKLAHOMA_CITY_THUNDER: "OKC",
    Team.ORLANDO_MAGIC: "ORL",
    Team.PHILADELPHIA_76ERS: "PHI",
    Team.PHOENIX_SUNS: "PHX",
    Team.PORTLAND_TRAIL_BLAZERS: "POR",
    Team.SACRAMENTO_KINGS: "SAC",
    Team.SAN_ANTONIO_SPURS: "SAS",
    Team.TORONTO_RAPTORS: "TOR",
    Team.UTAH_JAZZ: "UTA",
    Team.WASHINGTON_WIZARDS: "WAS",
}

def scrape_all_rosters():
    all_players = {}
    
    for team_enum, abbrev in TEAM_ABBREV_MAP.items():
        try:
            roster = client.players_season_totals(season_end_year=2026)
            break
        except Exception as e:
            print(f"Testing API: {e}", file=sys.stderr)
            break

    print("Fetching season totals for 2025-26...", file=sys.stderr)
    try:
        players = client.players_season_totals(season_end_year=2026)
        print(f"Got {len(players)} player records", file=sys.stderr)
        
        for p in players:
            name = p.get("name", "")
            team = p.get("team")
            if team and name:
                abbrev = TEAM_ABBREV_MAP.get(team, str(team))
                all_players[name.lower()] = {
                    "name": name,
                    "team": abbrev,
                }
    except Exception as e:
        print(f"Error fetching season totals: {e}", file=sys.stderr)
        print("Trying roster approach...", file=sys.stderr)
        
        for team_enum, abbrev in TEAM_ABBREV_MAP.items():
            try:
                roster = client.players_season_totals(season_end_year=2026)
                for p in roster:
                    if p.get("team") == team_enum:
                        name = p.get("name", "")
                        if name:
                            all_players[name.lower()] = {
                                "name": name,
                                "team": abbrev,
                            }
            except Exception as e2:
                print(f"  Error for {abbrev}: {e2}", file=sys.stderr)

    print(f"\nTotal unique players: {len(all_players)}", file=sys.stderr)
    
    print(json.dumps(all_players, indent=2))

if __name__ == "__main__":
    scrape_all_rosters()
