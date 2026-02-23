import { nbaRosters2026 } from "../server/nbaRosterData2026";
import * as fs from "fs";

const BALLDONTLIE_BASE = "https://api.balldontlie.io/v1";
const API_KEY = process.env.BALLDONTLIE_API_KEY!;
const PROGRESS_FILE = "/tmp/bdl-progress.json";
const RESULTS_FILE = "/tmp/roster-sync-results.json";

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

interface BDLPlayer {
  first_name: string;
  last_name: string;
  position: string;
  team: { abbreviation: string };
}

async function searchByLastName(lastName: string): Promise<BDLPlayer[]> {
  const encoded = encodeURIComponent(lastName);
  const url = `${BALLDONTLIE_BASE}/players?search=${encoded}&per_page=100`;

  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const res = await fetch(url, { headers: { Authorization: API_KEY } });
      if (res.status === 429) {
        const wait = 14000 + attempt * 5000;
        process.stdout.write(`[429:${wait/1000}s]`);
        await delay(wait);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.data || [];
    } catch (err: any) {
      if (attempt >= 7) throw err;
      await delay(5000);
    }
  }
  return [];
}

async function main() {
  console.log(`Syncing ${nbaRosters2026.length} roster players via last name search\n`);

  const lastNameGroups = new Map<string, typeof nbaRosters2026>();
  for (const player of nbaRosters2026) {
    const parts = player.name.split(" ");
    const lastName = parts[parts.length - 1];
    if (!lastNameGroups.has(lastName)) lastNameGroups.set(lastName, []);
    lastNameGroups.get(lastName)!.push(player);
  }

  const uniqueLastNames = [...lastNameGroups.keys()];
  console.log(`Unique last names to search: ${uniqueLastNames.length}`);
  console.log(`Rate: 1 request per 14s (~4.3/min)\n`);

  let startIdx = 0;
  let playerLookup: Record<string, { team: string; pos: string }> = {};

  if (fs.existsSync(PROGRESS_FILE)) {
    const p = JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8"));
    startIdx = p.lastNameIdx || 0;
    playerLookup = p.playerLookup || {};
    console.log(`Resuming from last name index ${startIdx}, ${Object.keys(playerLookup).length} players cached\n`);
  }

  for (let i = startIdx; i < uniqueLastNames.length; i++) {
    const lastName = uniqueLastNames[i];

    if (i > startIdx) {
      await delay(14000);
    }

    try {
      const results = await searchByLastName(lastName);
      for (const p of results) {
        const key = `${p.first_name} ${p.last_name}`.toLowerCase();
        playerLookup[key] = { team: p.team.abbreviation, pos: p.position };
      }
      if ((i + 1) % 10 === 0 || i === uniqueLastNames.length - 1) {
        process.stdout.write(`[${i+1}/${uniqueLastNames.length}] ${lastName} (${results.length} results, ${Object.keys(playerLookup).length} total)\n`);
      }
    } catch (err: any) {
      process.stdout.write(`[${i+1}/${uniqueLastNames.length}] ERR ${lastName}: ${err.message}\n`);
    }

    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ lastNameIdx: i + 1, playerLookup }));
  }

  console.log(`\nSearch complete! ${Object.keys(playerLookup).length} players in lookup\n`);
  console.log("Cross-referencing roster...\n");

  const updates: { name: string; oldTeam: string; newTeam: string }[] = [];
  const notFound: string[] = [];
  let matched = 0;

  for (const player of nbaRosters2026) {
    const key = player.name.toLowerCase();
    const bdl = playerLookup[key];
    if (!bdl) {
      notFound.push(`${player.name} (${player.teamCode})`);
    } else if (bdl.team !== player.teamCode) {
      updates.push({ name: player.name, oldTeam: player.teamCode, newTeam: bdl.team });
    } else {
      matched++;
    }
  }

  console.log("========== RESULTS ==========");
  console.log(`Total: ${nbaRosters2026.length}, Matched: ${matched}, Updates: ${updates.length}, NotFound: ${notFound.length}`);
  if (updates.length > 0) {
    console.log("\nTEAM CHANGES:");
    updates.forEach(u => console.log(`  ${u.name}: ${u.oldTeam} -> ${u.newTeam}`));
  }
  if (notFound.length > 0) {
    console.log("\nNOT FOUND:");
    notFound.forEach(n => console.log(`  ${n}`));
  }

  fs.writeFileSync(RESULTS_FILE, JSON.stringify({ updates, notFound, matched, total: nbaRosters2026.length }, null, 2));
  fs.writeFileSync("/tmp/bdl-done", "done");
  console.log(`\nSaved to ${RESULTS_FILE}`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
