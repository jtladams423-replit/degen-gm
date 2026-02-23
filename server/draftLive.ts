import { log } from "./index";
import * as sportradar from "./sportradar";

export interface NormalizedPick {
  id: string;
  round: number;
  overall: number;
  teamAlias: string;
  teamName: string;
  teamId: string;
  playerName: string;
  position: string;
  college: string;
  traded: boolean;
  trades: any[];
}

export interface NormalizedProspect {
  id: string;
  name: string;
  position: string;
  college: string;
  height: string;
  weight: number;
  topRank?: number;
}

export interface LivePayload {
  year: number;
  status: string;
  startDate: string;
  endDate: string;
  isLive: boolean;
  lastUpdated: string;
  picks: NormalizedPick[];
  topProspects: NormalizedProspect[];
  trades: any[];
  newPickIds: string[];
  totalPicks: number;
  error?: string;
}

class DraftLiveService {
  private liveYear: number | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private previousPickIds: Set<string> = new Set();
  private newPickIds: string[] = [];

  private summaryData: any = null;
  private tradesData: any = null;
  private prospectsData: any = null;
  private topProspectsData: any = null;
  private lastUpdated: string = new Date().toISOString();
  private lastError: string | null = null;

  isLiveFor(year: number): boolean {
    return this.liveYear === year;
  }

  getActiveYear(): number | null {
    return this.liveYear;
  }

  async startLive(year: number): Promise<void> {
    if (!process.env.SPORTRADAR_API_KEY) {
      throw new Error("SPORTRADAR_API_KEY is not configured");
    }
    if (year < 2000 || year > 2100 || isNaN(year)) {
      throw new Error("Invalid draft year");
    }
    if (this.liveYear === year) return;
    this.stopLive();

    this.liveYear = year;
    this.previousPickIds = new Set();
    this.newPickIds = [];
    this.lastError = null;
    log(`Starting live draft polling for ${year}`, "draft-live");

    await this.fetchAll(year);

    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollLiveData(year);
        this.lastError = null;
      } catch (err: any) {
        this.lastError = err.message;
        log(`Live poll error: ${err.message}`, "draft-live");
      }
    }, 2000);
  }

  stopLive(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    if (this.liveYear) {
      log(`Stopped live draft polling for ${this.liveYear}`, "draft-live");
    }
    this.liveYear = null;
  }

  private async fetchAll(year: number): Promise<void> {
    try {
      const [summary, trades, prospects, topProspects] = await Promise.allSettled([
        sportradar.getDraftSummary(year),
        sportradar.getTrades(year),
        sportradar.getProspects(year),
        sportradar.getTopProspects(year),
      ]);

      if (summary.status === "fulfilled") this.summaryData = summary.value;
      if (trades.status === "fulfilled") this.tradesData = trades.value;
      if (prospects.status === "fulfilled") this.prospectsData = prospects.value;
      if (topProspects.status === "fulfilled") this.topProspectsData = topProspects.value;

      this.lastUpdated = new Date().toISOString();
      this.updateNewPicks();
      log(`Fetched all data for ${year}`, "draft-live");
    } catch (err: any) {
      this.lastError = err.message;
      log(`Error fetching initial data: ${err.message}`, "draft-live");
    }
  }

  private async pollLiveData(year: number): Promise<void> {
    const [summary, trades] = await Promise.allSettled([
      sportradar.getDraftSummary(year),
      sportradar.getTrades(year),
    ]);

    if (summary.status === "fulfilled") this.summaryData = summary.value;
    if (trades.status === "fulfilled") this.tradesData = trades.value;

    this.lastUpdated = new Date().toISOString();
    this.updateNewPicks();
  }

  private updateNewPicks(): void {
    const currentPicks = this.flattenPicks();
    const currentIds = new Set(currentPicks.map(p => p.id));
    this.newPickIds = currentPicks
      .filter(p => !this.previousPickIds.has(p.id))
      .map(p => p.id);
    this.previousPickIds = currentIds;
  }

  private flattenPicks(): NormalizedPick[] {
    if (!this.summaryData?.draft?.rounds) return [];

    const picks: NormalizedPick[] = [];
    for (const round of this.summaryData.draft.rounds) {
      if (!round.picks) continue;
      for (const pick of round.picks) {
        const prospect = pick.prospect || {};
        picks.push({
          id: pick.id || `${round.number}-${pick.number}`,
          round: round.number,
          overall: pick.overall || pick.number,
          teamAlias: pick.team?.alias || pick.team?.market || "",
          teamName: pick.team ? `${pick.team.market || ""} ${pick.team.name || ""}`.trim() : "",
          teamId: pick.team?.id || "",
          playerName: prospect.name
            ? `${prospect.first_name || ""} ${prospect.last_name || ""}`.trim() || prospect.name
            : "TBD",
          position: prospect.position || prospect.pos || "",
          college: prospect.source?.team?.name || prospect.college || "",
          traded: !!(pick.traded || pick.trade),
          trades: pick.trades || [],
        });
      }
    }
    return picks.sort((a, b) => a.overall - b.overall);
  }

  private normalizeTopProspects(): NormalizedProspect[] {
    if (!this.topProspectsData?.prospects) return [];

    return this.topProspectsData.prospects.map((p: any, idx: number) => ({
      id: p.id || `tp-${idx}`,
      name: p.name || `${p.first_name || ""} ${p.last_name || ""}`.trim(),
      position: p.position || p.pos || "",
      college: p.source?.team?.name || p.college || "",
      height: p.height ? `${Math.floor(p.height / 12)}'${p.height % 12}"` : "",
      weight: p.weight || 0,
      topRank: p.rank || idx + 1,
    }));
  }

  async fetchOnDemand(year: number, endpoint: "prospects" | "top-prospects" | "summary" | "trades"): Promise<any> {
    switch (endpoint) {
      case "prospects":
        return sportradar.getProspects(year);
      case "top-prospects":
        return sportradar.getTopProspects(year);
      case "summary":
        return sportradar.getDraftSummary(year);
      case "trades":
        return sportradar.getTrades(year);
    }
  }

  getLivePayload(year: number): LivePayload {
    const draft = this.summaryData?.draft || {};
    return {
      year,
      status: draft.status || "unknown",
      startDate: draft.start_date || "",
      endDate: draft.end_date || "",
      isLive: this.liveYear === year,
      lastUpdated: this.lastUpdated,
      picks: this.flattenPicks(),
      topProspects: this.normalizeTopProspects(),
      trades: this.tradesData?.trades || this.tradesData?.draft?.trades || [],
      newPickIds: this.newPickIds,
      totalPicks: this.flattenPicks().length,
      error: this.lastError || undefined,
    };
  }
}

export const draftLiveService = new DraftLiveService();
