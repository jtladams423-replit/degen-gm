import * as cheerio from "cheerio";
import type { InsertCollegeStats } from "@shared/schema";

const CBB_BASE = "https://www.sports-reference.com/cbb";

const COLLEGE_TO_SLUG: Record<string, string> = {
  "Alabama": "alabama",
  "Arizona": "arizona",
  "Arkansas": "arkansas",
  "Auburn": "auburn",
  "BYU": "brigham-young",
  "Baylor": "baylor",
  "Colorado": "colorado",
  "Duke": "duke",
  "Florida": "florida",
  "Gonzaga": "gonzaga",
  "Houston": "houston",
  "Illinois": "illinois",
  "Indiana": "indiana",
  "Iowa": "iowa",
  "Iowa State": "iowa-state",
  "Kansas": "kansas",
  "Kentucky": "kentucky",
  "Louisville": "louisville",
  "Michigan": "michigan",
  "Mississippi State": "mississippi-state",
  "North Carolina": "north-carolina",
  "Purdue": "purdue",
  "Seton Hall": "seton-hall",
  "St. John's": "st-johns-ny",
  "Stanford": "stanford",
  "Tennessee": "tennessee",
  "Texas": "texas",
  "Texas Tech": "texas-tech",
  "UCLA": "ucla",
  "UConn": "connecticut",
  "Vanderbilt": "vanderbilt",
  "Washington": "washington",
  "Creighton": "creighton",
  "Georgetown": "georgetown",
  "LSU": "louisiana-state",
  "Marquette": "marquette",
  "Memphis": "memphis",
  "Michigan State": "michigan-state",
  "Ohio State": "ohio-state",
  "Oklahoma": "oklahoma",
  "Oregon": "oregon",
  "Pittsburgh": "pittsburgh",
  "Providence": "providence",
  "USC": "southern-california",
  "Syracuse": "syracuse",
  "Virginia": "virginia",
  "Villanova": "villanova",
  "Wake Forest": "wake-forest",
  "West Virginia": "west-virginia",
  "Wisconsin": "wisconsin",
  "Xavier": "xavier",
  "NC State": "north-carolina-state",
  "Georgia": "georgia",
  "Georgia Tech": "georgia-tech",
  "Miami": "miami-fl",
  "Rutgers": "rutgers",
  "Maryland": "maryland",
  "Notre Dame": "notre-dame",
  "Nebraska": "nebraska",
  "Oklahoma State": "oklahoma-state",
  "TCU": "texas-christian",
  "SMU": "southern-methodist",
};

const CURRENT_SEASON_YEAR = "2026";

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z\s\-'.]/g, "")
    .trim()
    .toLowerCase();
}

function stripSuffix(name: string): string {
  return name.replace(/\s+(jr\.?|sr\.?|ii|iii|iv|v)$/i, "").trim();
}

function namesMatch(scraped: string, prospect: string): boolean {
  const a = normalizeName(scraped);
  const b = normalizeName(prospect);
  if (a === b) return true;

  const aStripped = stripSuffix(a);
  const bStripped = stripSuffix(b);
  if (aStripped === bStripped) return true;

  const aParts = aStripped.split(/\s+/);
  const bParts = bStripped.split(/\s+/);
  if (aParts.length >= 2 && bParts.length >= 2) {
    const aFirst = aParts[0];
    const aLast = aParts[aParts.length - 1];
    const bFirst = bParts[0];
    const bLast = bParts[bParts.length - 1];
    if (aLast === bLast && aFirst === bFirst) return true;
    if (aLast === bLast && (aFirst.startsWith(bFirst) || bFirst.startsWith(aFirst))) return true;
  }
  return false;
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
        console.log(`[college-scraper] Rate limited, waiting ${(i + 1) * 15}s...`);
        await new Promise(r => setTimeout(r, (i + 1) * 15000));
        continue;
      }
      if (res.status === 404) {
        return "";
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

interface ProspectInfo {
  name: string;
  college: string;
}

interface SchoolPage {
  college: string;
  slug: string;
  players: Array<{
    name: string;
    stats: Omit<InsertCollegeStats, "playerName" | "college" | "sport">;
  }>;
}

async function scrapeSchoolPage(college: string, slug: string, seasonYear: string): Promise<SchoolPage> {
  const url = `${CBB_BASE}/schools/${slug}/men/${seasonYear}.html`;
  console.log(`[college-scraper] Fetching ${college}: ${url}`);

  const html = await fetchWithRetry(url);
  if (!html) {
    console.log(`[college-scraper] ${college} page not found (404), trying previous year...`);
    const prevYear = String(parseInt(seasonYear) - 1);
    const prevHtml = await fetchWithRetry(`${CBB_BASE}/schools/${slug}/men/${prevYear}.html`);
    if (!prevHtml) {
      console.log(`[college-scraper] ${college} not found for either year`);
      return { college, slug, players: [] };
    }
    return parseSchoolHtml(prevHtml, college, slug, prevYear);
  }
  return parseSchoolHtml(html, college, slug, seasonYear);
}

function parseSchoolHtml(html: string, college: string, slug: string, seasonYear: string): SchoolPage {
  const $ = cheerio.load(html);
  const players: SchoolPage["players"] = [];

  $("table#players_per_game tbody tr:not(.thead)").each((_, row) => {
    const $row = $(row);
    if ($row.hasClass("thead") || $row.hasClass("over_header")) return;

    const name = $row.find('td[data-stat="name_display"]').text().trim() ||
                 $row.find('th[data-stat="name_display"]').text().trim();
    if (!name) return;

    const season = `${parseInt(seasonYear) - 1}-${seasonYear.slice(2)}`;

    players.push({
      name,
      stats: {
        season,
        classYear: $row.find('td[data-stat="class"]').text().trim() || null,
        position: $row.find('td[data-stat="pos"]').text().trim() || null,
        gamesPlayed: parseInt2($row.find('td[data-stat="games"]').text()),
        gamesStarted: parseInt2($row.find('td[data-stat="games_started"]').text()),
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
        fgPerGame: parseFloat2($row.find('td[data-stat="fg_per_g"]').text()),
        fgaPerGame: parseFloat2($row.find('td[data-stat="fga_per_g"]').text()),
        fg3PerGame: parseFloat2($row.find('td[data-stat="fg3_per_g"]').text()),
        fg3aPerGame: parseFloat2($row.find('td[data-stat="fg3a_per_g"]').text()),
        ftPerGame: parseFloat2($row.find('td[data-stat="ft_per_g"]').text()),
        ftaPerGame: parseFloat2($row.find('td[data-stat="fta_per_g"]').text()),
        offRebPerGame: parseFloat2($row.find('td[data-stat="orb_per_g"]').text()),
        defRebPerGame: parseFloat2($row.find('td[data-stat="drb_per_g"]').text()),
        personalFouls: parseFloat2($row.find('td[data-stat="pf_per_g"]').text()),
        efgPct: parseFloat2($row.find('td[data-stat="efg_pct"]').text()),
      },
    });
  });

  return { college, slug, players };
}

export async function scrapeCollegeStats(prospects: ProspectInfo[]): Promise<InsertCollegeStats[]> {
  console.log(`[college-scraper] Starting college stats scrape for ${prospects.length} prospects...`);

  const collegeProspects = new Map<string, ProspectInfo[]>();
  for (const p of prospects) {
    if (!p.college || p.college === "International" || p.college === "N/A") continue;
    const slug = COLLEGE_TO_SLUG[p.college];
    if (!slug) {
      console.log(`[college-scraper] No slug mapping for college: ${p.college}`);
      continue;
    }
    if (!collegeProspects.has(p.college)) {
      collegeProspects.set(p.college, []);
    }
    collegeProspects.get(p.college)!.push(p);
  }

  console.log(`[college-scraper] Need to scrape ${collegeProspects.size} school pages`);

  const allStats: InsertCollegeStats[] = [];
  let scraped = 0;

  for (const [college, collegePlayers] of Array.from(collegeProspects.entries())) {
    const slug = COLLEGE_TO_SLUG[college];
    if (!slug) continue;

    try {
      const page = await scrapeSchoolPage(college, slug, CURRENT_SEASON_YEAR);

      for (const prospect of collegePlayers) {
        const match = page.players.find(p => namesMatch(p.name, prospect.name));
        if (match) {
          allStats.push({
            playerName: prospect.name,
            college: prospect.college,
            sport: "NBA",
            ...match.stats,
          });
          console.log(`[college-scraper] ✓ Matched ${prospect.name} at ${college}`);
        } else {
          console.log(`[college-scraper] ✗ No match for ${prospect.name} at ${college} (available: ${page.players.map(p => p.name).join(", ")})`);
        }
      }

      scraped++;
      if (scraped < collegeProspects.size) {
        await new Promise(r => setTimeout(r, 3000));
      }
    } catch (err: any) {
      console.error(`[college-scraper] Error scraping ${college}: ${err.message}`);
    }
  }

  console.log(`[college-scraper] Completed: ${allStats.length}/${prospects.length} prospects matched`);
  return allStats;
}
