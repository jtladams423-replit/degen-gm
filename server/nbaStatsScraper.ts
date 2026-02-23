import * as cheerio from "cheerio";
import type { InsertPlayerSeasonStats } from "@shared/schema";

const BBR_BASE = "https://www.basketball-reference.com";
const CURRENT_SEASON = "2025-26";

const TEAM_ABBR_MAP: Record<string, string> = {
  ATL: "ATL", BOS: "BOS", BKN: "BRK", CHA: "CHO", CHI: "CHI",
  CLE: "CLE", DAL: "DAL", DEN: "DEN", DET: "DET", GSW: "GSW",
  HOU: "HOU", IND: "IND", LAC: "LAC", LAL: "LAL", MEM: "MEM",
  MIA: "MIA", MIL: "MIL", MIN: "MIN", NOP: "NOP", NYK: "NYK",
  OKC: "OKC", ORL: "ORL", PHI: "PHI", PHX: "PHO", POR: "POR",
  SAC: "SAC", SAS: "SAS", TOR: "TOR", UTA: "UTA", WAS: "WAS",
};

const BBR_TO_APP: Record<string, string> = {};
for (const [app, bbr] of Object.entries(TEAM_ABBR_MAP)) {
  BBR_TO_APP[bbr] = app;
}

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z\s\-'.]/g, "")
    .trim();
}

async function fetchWithRetry(url: string, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      if (res.status === 429) {
        console.log(`[bbr-scraper] Rate limited, waiting ${(i + 1) * 10}s...`);
        await new Promise(r => setTimeout(r, (i + 1) * 10000));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err: any) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw new Error("Max retries exceeded");
}

function parseFloat2(val: string | undefined): number | null {
  if (!val || val === "" || val === "-") return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function parseInt2(val: string | undefined): number | null {
  if (!val || val === "" || val === "-") return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

export async function scrapeNBAPerGameStats(): Promise<InsertPlayerSeasonStats[]> {
  console.log("[bbr-scraper] Fetching NBA per-game stats from Basketball Reference...");

  const url = `${BBR_BASE}/leagues/NBA_2026_per_game.html`;
  const html = await fetchWithRetry(url);
  const $ = cheerio.load(html);

  const stats: InsertPlayerSeasonStats[] = [];
  const seen = new Set<string>();

  $("table#per_game_stats tbody tr:not(.thead)").each((_, row) => {
    const $row = $(row);
    const rankerTh = $row.find('th[data-stat="ranker"]');
    if (rankerTh.length && rankerTh.hasClass("over_header")) return;

    const playerCell = $row.find('td[data-stat="name_display"]');
    const rawName = playerCell.text().trim();
    if (!rawName) return;

    const name = normalizeName(rawName);
    const bbrTeam = $row.find('td[data-stat="team_name_abbr"]').text().trim();
    const teamCode = BBR_TO_APP[bbrTeam] || bbrTeam;

    if (!bbrTeam || bbrTeam === "TOT" || bbrTeam === "2TM" || bbrTeam === "3TM" || bbrTeam === "4TM") return;

    const key = `${name}_${teamCode}`;
    if (seen.has(key)) return;
    seen.add(key);

    const pos = $row.find('td[data-stat="pos"]').text().trim();
    const mappedPos = mapPosition(pos);

    stats.push({
      name,
      teamCode,
      position: mappedPos,
      gamesPlayed: parseInt2($row.find('td[data-stat="games"]').text()),
      minutesPerGame: parseFloat2($row.find('td[data-stat="mp_per_g"]').text()),
      pointsPerGame: parseFloat2($row.find('td[data-stat="pts_per_g"]').text()),
      reboundsPerGame: parseFloat2($row.find('td[data-stat="trb_per_g"]').text()),
      assistsPerGame: parseFloat2($row.find('td[data-stat="ast_per_g"]').text()),
      stealsPerGame: parseFloat2($row.find('td[data-stat="stl_per_g"]').text()),
      blocksPerGame: parseFloat2($row.find('td[data-stat="blk_per_g"]').text()),
      turnoversPerGame: parseFloat2($row.find('td[data-stat="tov_per_g"]').text()),
      fgPct: parseFloat2($row.find('td[data-stat="fg_pct"]').text()),
      fg3Pct: parseFloat2($row.find('td[data-stat="fg3_pct"]').text()),
      ftPct: parseFloat2($row.find('td[data-stat="ft_pct"]').text()),
      offRebPerGame: parseFloat2($row.find('td[data-stat="orb_per_g"]').text()),
      defRebPerGame: parseFloat2($row.find('td[data-stat="drb_per_g"]').text()),
      personalFouls: parseFloat2($row.find('td[data-stat="pf_per_g"]').text()),
      fgaPerGame: parseFloat2($row.find('td[data-stat="fga_per_g"]').text()),
      fgmPerGame: parseFloat2($row.find('td[data-stat="fg_per_g"]').text()),
      fg3aPerGame: parseFloat2($row.find('td[data-stat="fg3a_per_g"]').text()),
      fg3mPerGame: parseFloat2($row.find('td[data-stat="fg3_per_g"]').text()),
      ftaPerGame: parseFloat2($row.find('td[data-stat="fta_per_g"]').text()),
      ftmPerGame: parseFloat2($row.find('td[data-stat="ft_per_g"]').text()),
      season: CURRENT_SEASON,
      sport: "NBA",
    });
  });

  console.log(`[bbr-scraper] Parsed ${stats.length} player stat lines`);
  return stats;
}

function mapPosition(bbrPos: string): string {
  const p = bbrPos.toUpperCase().split("-")[0].trim();
  if (p === "G") return "PG";
  if (p === "F") return "SF";
  return p || "SF";
}
