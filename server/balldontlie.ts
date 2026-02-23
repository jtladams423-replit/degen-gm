const BALLDONTLIE_BASE = "https://api.balldontlie.io/v1";

function getApiKey(): string {
  const key = process.env.BALLDONTLIE_API_KEY;
  if (!key) throw new Error("BALLDONTLIE_API_KEY not set");
  return key;
}

async function fetchWithAuth(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { Authorization: getApiKey() },
  });
  if (res.status === 429) {
    console.log("[balldontlie] Rate limited, waiting 15s...");
    await new Promise((r) => setTimeout(r, 15000));
    return fetchWithAuth(url);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`balldontlie API error ${res.status}: ${text}`);
  }
  return res.json();
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

interface BDLPlayer {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  team: {
    id: number;
    abbreviation: string;
    full_name: string;
  };
}

interface RosterUpdate {
  playerName: string;
  oldTeam: string;
  newTeam: string;
  bdlPosition: string;
}

export async function fetchPlayerTeam(
  searchName: string
): Promise<BDLPlayer | null> {
  const encoded = encodeURIComponent(searchName);
  const data = await fetchWithAuth(
    `${BALLDONTLIE_BASE}/players?search=${encoded}&per_page=25`
  );
  if (!data.data || data.data.length === 0) return null;

  const exactMatch = data.data.find((p: BDLPlayer) => {
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    return fullName === searchName.toLowerCase();
  });

  return exactMatch || null;
}

export async function syncRosterTeams(
  rosterPlayers: { id: number; name: string; teamCode: string; position: string }[]
): Promise<{
  updates: RosterUpdate[];
  notFound: string[];
  matched: number;
  errors: string[];
}> {
  const updates: RosterUpdate[] = [];
  const notFound: string[] = [];
  const errors: string[] = [];
  let matched = 0;

  const BATCH_SIZE = 4;
  const BATCH_DELAY = 13000;

  for (let i = 0; i < rosterPlayers.length; i += BATCH_SIZE) {
    const batch = rosterPlayers.slice(i, i + BATCH_SIZE);

    if (i > 0) {
      console.log(
        `[balldontlie] Waiting between batches... (${i}/${rosterPlayers.length} processed)`
      );
      await delay(BATCH_DELAY);
    }

    const results = await Promise.all(
      batch.map(async (player) => {
        try {
          const bdlPlayer = await fetchPlayerTeam(player.name);
          if (!bdlPlayer) {
            return { player, bdlPlayer: null, error: null };
          }
          return { player, bdlPlayer, error: null };
        } catch (err: any) {
          return { player, bdlPlayer: null, error: err.message };
        }
      })
    );

    for (const { player, bdlPlayer, error } of results) {
      if (error) {
        errors.push(`${player.name}: ${error}`);
        continue;
      }
      if (!bdlPlayer) {
        notFound.push(player.name);
        continue;
      }

      const apiTeam = bdlPlayer.team.abbreviation;
      if (apiTeam !== player.teamCode) {
        updates.push({
          playerName: player.name,
          oldTeam: player.teamCode,
          newTeam: apiTeam,
          bdlPosition: bdlPlayer.position,
        });
      } else {
        matched++;
      }
    }
  }

  console.log(
    `[balldontlie] Sync complete: ${matched} matched, ${updates.length} updates, ${notFound.length} not found, ${errors.length} errors`
  );
  return { updates, notFound, matched, errors };
}
