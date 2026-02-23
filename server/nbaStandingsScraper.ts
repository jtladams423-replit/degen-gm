import * as cheerio from "cheerio";
import type { InsertTeamStanding } from "@shared/schema";

const BBR_BASE = "https://www.basketball-reference.com";
const CURRENT_SEASON = "2025-26";

const BBR_TO_APP: Record<string, string> = {
  ATL: "ATL", BOS: "BOS", BRK: "BKN", CHO: "CHA", CHI: "CHI",
  CLE: "CLE", DAL: "DAL", DEN: "DEN", DET: "DET", GSW: "GSW",
  HOU: "HOU", IND: "IND", LAC: "LAC", LAL: "LAL", MEM: "MEM",
  MIA: "MIA", MIL: "MIL", MIN: "MIN", NOP: "NOP", NYK: "NYK",
  OKC: "OKC", ORL: "ORL", PHI: "PHI", PHO: "PHX", POR: "POR",
  SAC: "SAC", SAS: "SAS", TOR: "TOR", UTA: "UTA", WAS: "WAS",
};

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
        console.log(`[standings-scraper] Rate limited, waiting ${(i + 1) * 10}s...`);
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

export async function scrapeNBAStandings(): Promise<InsertTeamStanding[]> {
  console.log("[standings-scraper] Fetching NBA standings from Basketball Reference...");

  const url = `${BBR_BASE}/leagues/NBA_2026_standings.html`;
  const html = await fetchWithRetry(url);
  const $ = cheerio.load(html);

  const standings: InsertTeamStanding[] = [];

  function parseConferenceTable(tableId: string, conference: string) {
    let rank = 0;
    $(`table#${tableId} tbody tr:not(.thead)`).each((_, row) => {
      const $row = $(row);
      if ($row.hasClass("thead") || $row.hasClass("over_header")) return;

      const teamCell = $row.find('th[data-stat="team_name"]');
      const teamText = teamCell.text().trim();
      if (!teamText) return;

      const teamLink = teamCell.find("a").attr("href") || "";
      const bbrCodeMatch = teamLink.match(/\/teams\/(\w+)\//);
      const bbrCode = bbrCodeMatch ? bbrCodeMatch[1] : "";
      const teamCode = BBR_TO_APP[bbrCode] || bbrCode;
      if (!teamCode) return;

      rank++;

      const wins = parseInt($row.find('td[data-stat="wins"]').text()) || 0;
      const losses = parseInt($row.find('td[data-stat="losses"]').text()) || 0;
      const winPct = parseFloat($row.find('td[data-stat="win_loss_pct"]').text()) || 0;
      const gb = $row.find('td[data-stat="gb"]').text().trim();

      standings.push({
        teamCode,
        sport: "NBA",
        season: CURRENT_SEASON,
        wins,
        losses,
        winPct,
        conference,
        gamesBehind: gb || "0",
        confRank: rank,
        division: null,
        homeRecord: null,
        awayRecord: null,
        streak: null,
        lastTen: null,
      });
    });
  }

  parseConferenceTable("confs_standings_E", "Eastern");
  parseConferenceTable("confs_standings_W", "Western");

  if (standings.length === 0) {
    $("table#expanded_standings tbody tr:not(.thead)").each((_, row) => {
      const $row = $(row);
      const teamCell = $row.find('th[data-stat="team_name"]');
      const teamLink = teamCell.find("a").attr("href") || "";
      const bbrCodeMatch = teamLink.match(/\/teams\/(\w+)\//);
      const bbrCode = bbrCodeMatch ? bbrCodeMatch[1] : "";
      const teamCode = BBR_TO_APP[bbrCode] || bbrCode;
      if (!teamCode) return;

      const wins = parseInt($row.find('td[data-stat="wins"]').text()) || 0;
      const losses = parseInt($row.find('td[data-stat="losses"]').text()) || 0;
      const winPct = parseFloat($row.find('td[data-stat="win_loss_pct"]').text()) || 0;

      standings.push({
        teamCode,
        sport: "NBA",
        season: CURRENT_SEASON,
        wins,
        losses,
        winPct,
        conference: null,
        gamesBehind: null,
        confRank: null,
        division: null,
        homeRecord: null,
        awayRecord: null,
        streak: null,
        lastTen: null,
      });
    });
  }

  console.log(`[standings-scraper] Parsed ${standings.length} team standings`);
  return standings;
}
