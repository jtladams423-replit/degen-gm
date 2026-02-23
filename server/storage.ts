import { eq, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  prospects, teams, freeAgents, draftOrder, mockDrafts, mockPicks, historicalPerformance, draftSessions, rosterPlayers, capSettings, tradeProposals, teamBuilderSaves, playerSeasonStats, teamStandings,
  type Prospect, type InsertProspect,
  type Team, type InsertTeam,
  type FreeAgent, type InsertFreeAgent,
  type DraftOrderEntry, type InsertDraftOrderEntry,
  type MockDraft, type InsertMockDraft,
  type MockPick, type InsertMockPick,
  type HistoricalPerformance, type InsertHistoricalPerformance,
  type DraftSession, type InsertDraftSession,
  type RosterPlayer, type InsertRosterPlayer,
  type CapSetting, type InsertCapSetting,
  type TradeProposal, type InsertTradeProposal,
  type TeamBuilderSave, type InsertTeamBuilderSave,
  type PlayerSeasonStats, type InsertPlayerSeasonStats,
  type TeamStanding, type InsertTeamStanding,
  type CollegeStats, type InsertCollegeStats,
  collegeStats,
} from "@shared/schema";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);

export interface IStorage {
  getProspects(sport?: string, year?: number): Promise<Prospect[]>;
  createProspect(prospect: InsertProspect): Promise<Prospect>;
  createProspects(prospects: InsertProspect[]): Promise<Prospect[]>;

  getTeams(sport?: string): Promise<Team[]>;
  getTeamByCode(code: string, sport?: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  createTeams(teams: InsertTeam[]): Promise<Team[]>;

  getFreeAgents(sport?: string): Promise<FreeAgent[]>;
  createFreeAgent(fa: InsertFreeAgent): Promise<FreeAgent>;
  createFreeAgents(fas: InsertFreeAgent[]): Promise<FreeAgent[]>;

  getDraftOrder(sport?: string, year?: number): Promise<DraftOrderEntry[]>;
  createDraftOrderEntry(entry: InsertDraftOrderEntry): Promise<DraftOrderEntry>;
  createDraftOrderEntries(entries: InsertDraftOrderEntry[]): Promise<DraftOrderEntry[]>;

  getMockDrafts(sport?: string): Promise<MockDraft[]>;
  getMockDraft(id: number): Promise<MockDraft | undefined>;
  createMockDraft(draft: InsertMockDraft): Promise<MockDraft>;
  deleteMockDraft(id: number): Promise<void>;

  getMockPicks(mockDraftId: number): Promise<MockPick[]>;
  createMockPick(pick: InsertMockPick): Promise<MockPick>;
  createMockPicks(picks: InsertMockPick[]): Promise<MockPick[]>;

  getHistoricalPerformance(sport?: string): Promise<HistoricalPerformance[]>;
  createHistoricalPerformance(perf: InsertHistoricalPerformance): Promise<HistoricalPerformance>;
  createHistoricalPerformances(perfs: InsertHistoricalPerformance[]): Promise<HistoricalPerformance[]>;

  createDraftSession(session: InsertDraftSession): Promise<DraftSession>;
  getDraftSessionByCode(code: string): Promise<DraftSession | undefined>;
  updateDraftSession(code: string, updates: Partial<InsertDraftSession>): Promise<DraftSession | undefined>;

  getRosterPlayers(sport?: string, teamCode?: string): Promise<RosterPlayer[]>;
  createRosterPlayers(players: InsertRosterPlayer[]): Promise<RosterPlayer[]>;
  updateRosterPlayer(id: number, updates: Partial<InsertRosterPlayer>): Promise<RosterPlayer | undefined>;
  deleteRosterPlayer(id: number): Promise<void>;
  moveRosterPlayer(playerId: number, toTeamCode: string): Promise<RosterPlayer | undefined>;

  getCapSettings(sport?: string): Promise<CapSetting[]>;
  getCapSettingByYear(year: number, sport?: string): Promise<CapSetting | undefined>;
  upsertCapSetting(setting: InsertCapSetting): Promise<CapSetting>;

  getTradeProposals(sport?: string): Promise<TradeProposal[]>;
  getTradeProposal(id: number): Promise<TradeProposal | undefined>;
  createTradeProposal(proposal: InsertTradeProposal): Promise<TradeProposal>;
  updateTradeProposal(id: number, updates: Partial<InsertTradeProposal>): Promise<TradeProposal | undefined>;
  deleteTradeProposal(id: number): Promise<void>;

  getTeamBuilderSaves(sport?: string): Promise<TeamBuilderSave[]>;
  getTeamBuilderSave(id: number): Promise<TeamBuilderSave | undefined>;
  createTeamBuilderSave(save: InsertTeamBuilderSave): Promise<TeamBuilderSave>;
  deleteTeamBuilderSave(id: number): Promise<void>;

  getPlayerSeasonStats(sport?: string): Promise<PlayerSeasonStats[]>;
  upsertPlayerSeasonStats(stats: InsertPlayerSeasonStats[]): Promise<void>;
  clearPlayerSeasonStats(sport?: string): Promise<void>;
  getTeamStandings(sport?: string): Promise<TeamStanding[]>;
  upsertTeamStandings(standings: InsertTeamStanding[]): Promise<void>;

  getCollegeStats(sport?: string): Promise<CollegeStats[]>;
  getCollegeStatsByPlayer(playerName: string): Promise<CollegeStats[]>;
  upsertCollegeStats(stats: InsertCollegeStats[]): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getProspects(sport = "NFL", year?: number): Promise<Prospect[]> {
    const conditions = [eq(prospects.sport, sport)];
    if (year) conditions.push(eq(prospects.year, year));
    return db.select().from(prospects).where(and(...conditions));
  }

  async createProspect(prospect: InsertProspect): Promise<Prospect> {
    const [result] = await db.insert(prospects).values(prospect).returning();
    return result;
  }

  async createProspects(data: InsertProspect[]): Promise<Prospect[]> {
    if (data.length === 0) return [];
    return db.insert(prospects).values(data).returning();
  }

  async getTeams(sport = "NFL"): Promise<Team[]> {
    return db.select().from(teams).where(eq(teams.sport, sport));
  }

  async getTeamByCode(code: string, sport = "NFL"): Promise<Team | undefined> {
    const [result] = await db.select().from(teams).where(and(eq(teams.code, code), eq(teams.sport, sport)));
    return result;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [result] = await db.insert(teams).values(team).returning();
    return result;
  }

  async createTeams(data: InsertTeam[]): Promise<Team[]> {
    if (data.length === 0) return [];
    return db.insert(teams).values(data).returning();
  }

  async getFreeAgents(sport = "NFL"): Promise<FreeAgent[]> {
    return db.select().from(freeAgents).where(eq(freeAgents.sport, sport));
  }

  async createFreeAgent(fa: InsertFreeAgent): Promise<FreeAgent> {
    const [result] = await db.insert(freeAgents).values(fa).returning();
    return result;
  }

  async createFreeAgents(data: InsertFreeAgent[]): Promise<FreeAgent[]> {
    if (data.length === 0) return [];
    return db.insert(freeAgents).values(data).returning();
  }

  async getDraftOrder(sport = "NFL", year?: number): Promise<DraftOrderEntry[]> {
    const conditions = [eq(draftOrder.sport, sport)];
    if (year) conditions.push(eq(draftOrder.year, year));
    return db.select().from(draftOrder).where(and(...conditions));
  }

  async createDraftOrderEntry(entry: InsertDraftOrderEntry): Promise<DraftOrderEntry> {
    const [result] = await db.insert(draftOrder).values(entry).returning();
    return result;
  }

  async createDraftOrderEntries(data: InsertDraftOrderEntry[]): Promise<DraftOrderEntry[]> {
    if (data.length === 0) return [];
    return db.insert(draftOrder).values(data).returning();
  }

  async getMockDrafts(sport = "NFL"): Promise<MockDraft[]> {
    return db.select().from(mockDrafts).where(eq(mockDrafts.sport, sport));
  }

  async getMockDraft(id: number): Promise<MockDraft | undefined> {
    const [result] = await db.select().from(mockDrafts).where(eq(mockDrafts.id, id));
    return result;
  }

  async createMockDraft(draft: InsertMockDraft): Promise<MockDraft> {
    const [result] = await db.insert(mockDrafts).values(draft).returning();
    return result;
  }

  async deleteMockDraft(id: number): Promise<void> {
    await db.delete(mockPicks).where(eq(mockPicks.mockDraftId, id));
    await db.delete(mockDrafts).where(eq(mockDrafts.id, id));
  }

  async getMockPicks(mockDraftId: number): Promise<MockPick[]> {
    return db.select().from(mockPicks).where(eq(mockPicks.mockDraftId, mockDraftId));
  }

  async createMockPick(pick: InsertMockPick): Promise<MockPick> {
    const [result] = await db.insert(mockPicks).values(pick).returning();
    return result;
  }

  async createMockPicks(data: InsertMockPick[]): Promise<MockPick[]> {
    if (data.length === 0) return [];
    return db.insert(mockPicks).values(data).returning();
  }

  async getHistoricalPerformance(sport = "NFL"): Promise<HistoricalPerformance[]> {
    return db.select().from(historicalPerformance).where(eq(historicalPerformance.sport, sport));
  }

  async createHistoricalPerformance(perf: InsertHistoricalPerformance): Promise<HistoricalPerformance> {
    const [result] = await db.insert(historicalPerformance).values(perf).returning();
    return result;
  }

  async createHistoricalPerformances(data: InsertHistoricalPerformance[]): Promise<HistoricalPerformance[]> {
    if (data.length === 0) return [];
    return db.insert(historicalPerformance).values(data).returning();
  }

  async createDraftSession(session: InsertDraftSession): Promise<DraftSession> {
    const [result] = await db.insert(draftSessions).values(session).returning();
    return result;
  }

  async getDraftSessionByCode(code: string): Promise<DraftSession | undefined> {
    const [result] = await db.select().from(draftSessions).where(eq(draftSessions.code, code));
    return result;
  }

  async updateDraftSession(code: string, updates: Partial<InsertDraftSession>): Promise<DraftSession | undefined> {
    const [result] = await db.update(draftSessions).set(updates).where(eq(draftSessions.code, code)).returning();
    return result;
  }

  async getRosterPlayers(sport = "NFL", teamCode?: string): Promise<RosterPlayer[]> {
    const conditions = [eq(rosterPlayers.sport, sport)];
    if (teamCode) conditions.push(eq(rosterPlayers.teamCode, teamCode));
    return db.select().from(rosterPlayers).where(and(...conditions));
  }

  async createRosterPlayers(data: InsertRosterPlayer[]): Promise<RosterPlayer[]> {
    if (data.length === 0) return [];
    return db.insert(rosterPlayers).values(data).returning();
  }

  async updateRosterPlayer(id: number, updates: Partial<InsertRosterPlayer>): Promise<RosterPlayer | undefined> {
    const [result] = await db.update(rosterPlayers).set(updates).where(eq(rosterPlayers.id, id)).returning();
    return result;
  }

  async deleteRosterPlayer(id: number): Promise<void> {
    await db.delete(rosterPlayers).where(eq(rosterPlayers.id, id));
  }

  async moveRosterPlayer(playerId: number, toTeamCode: string): Promise<RosterPlayer | undefined> {
    const [result] = await db.update(rosterPlayers).set({ teamCode: toTeamCode }).where(eq(rosterPlayers.id, playerId)).returning();
    return result;
  }

  async getCapSettings(sport = "NBA"): Promise<CapSetting[]> {
    return db.select().from(capSettings).where(eq(capSettings.sport, sport));
  }

  async getCapSettingByYear(year: number, sport = "NBA"): Promise<CapSetting | undefined> {
    const [result] = await db.select().from(capSettings).where(and(eq(capSettings.year, year), eq(capSettings.sport, sport)));
    return result;
  }

  async upsertCapSetting(setting: InsertCapSetting): Promise<CapSetting> {
    const existing = await this.getCapSettingByYear(setting.year, setting.sport);
    if (existing) {
      const [result] = await db.update(capSettings).set(setting).where(eq(capSettings.id, existing.id)).returning();
      return result;
    }
    const [result] = await db.insert(capSettings).values(setting).returning();
    return result;
  }

  async getTradeProposals(sport = "NBA"): Promise<TradeProposal[]> {
    return db.select().from(tradeProposals).where(eq(tradeProposals.sport, sport));
  }

  async getTradeProposal(id: number): Promise<TradeProposal | undefined> {
    const [result] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, id));
    return result;
  }

  async createTradeProposal(proposal: InsertTradeProposal): Promise<TradeProposal> {
    const [result] = await db.insert(tradeProposals).values(proposal).returning();
    return result;
  }

  async updateTradeProposal(id: number, updates: Partial<InsertTradeProposal>): Promise<TradeProposal | undefined> {
    const [result] = await db.update(tradeProposals).set(updates).where(eq(tradeProposals.id, id)).returning();
    return result;
  }

  async deleteTradeProposal(id: number): Promise<void> {
    await db.delete(tradeProposals).where(eq(tradeProposals.id, id));
  }

  async getTeamBuilderSaves(sport = "NFL"): Promise<TeamBuilderSave[]> {
    return db.select().from(teamBuilderSaves).where(eq(teamBuilderSaves.sport, sport));
  }

  async getTeamBuilderSave(id: number): Promise<TeamBuilderSave | undefined> {
    const [result] = await db.select().from(teamBuilderSaves).where(eq(teamBuilderSaves.id, id));
    return result;
  }

  async createTeamBuilderSave(save: InsertTeamBuilderSave): Promise<TeamBuilderSave> {
    const [result] = await db.insert(teamBuilderSaves).values(save).returning();
    return result;
  }

  async deleteTeamBuilderSave(id: number): Promise<void> {
    await db.delete(teamBuilderSaves).where(eq(teamBuilderSaves.id, id));
  }

  async getPlayerSeasonStats(sport = "NBA"): Promise<PlayerSeasonStats[]> {
    return db.select().from(playerSeasonStats).where(eq(playerSeasonStats.sport, sport));
  }

  async upsertPlayerSeasonStats(stats: InsertPlayerSeasonStats[]): Promise<void> {
    if (stats.length === 0) return;
    await db.transaction(async (tx) => {
      await tx.delete(playerSeasonStats).where(eq(playerSeasonStats.sport, "NBA"));
      const BATCH = 50;
      for (let i = 0; i < stats.length; i += BATCH) {
        const batch = stats.slice(i, i + BATCH);
        await tx.insert(playerSeasonStats).values(batch);
      }
    });
  }

  async clearPlayerSeasonStats(sport = "NBA"): Promise<void> {
    await db.delete(playerSeasonStats).where(eq(playerSeasonStats.sport, sport));
  }

  async getTeamStandings(sport = "NBA"): Promise<TeamStanding[]> {
    return db.select().from(teamStandings).where(eq(teamStandings.sport, sport));
  }

  async upsertTeamStandings(standings: InsertTeamStanding[]): Promise<void> {
    if (standings.length === 0) return;
    const season = standings[0].season;
    const sport = standings[0].sport || "NBA";
    await db.transaction(async (tx) => {
      await tx.delete(teamStandings).where(
        and(eq(teamStandings.sport, sport), eq(teamStandings.season, season))
      );
      const BATCH = 30;
      for (let i = 0; i < standings.length; i += BATCH) {
        const batch = standings.slice(i, i + BATCH);
        await tx.insert(teamStandings).values(batch);
      }
    });
  }
  async getCollegeStats(sport = "NBA"): Promise<CollegeStats[]> {
    return db.select().from(collegeStats).where(eq(collegeStats.sport, sport));
  }

  async getCollegeStatsByPlayer(playerName: string): Promise<CollegeStats[]> {
    return db.select().from(collegeStats).where(eq(collegeStats.playerName, playerName));
  }

  async upsertCollegeStats(stats: InsertCollegeStats[]): Promise<void> {
    if (stats.length === 0) return;
    await db.transaction(async (tx) => {
      for (const stat of stats) {
        await tx.insert(collegeStats).values(stat).onConflictDoUpdate({
          target: [collegeStats.playerName, collegeStats.college, collegeStats.season],
          set: {
            classYear: stat.classYear,
            position: stat.position,
            gamesPlayed: stat.gamesPlayed,
            gamesStarted: stat.gamesStarted,
            minutesPerGame: stat.minutesPerGame,
            pointsPerGame: stat.pointsPerGame,
            reboundsPerGame: stat.reboundsPerGame,
            assistsPerGame: stat.assistsPerGame,
            stealsPerGame: stat.stealsPerGame,
            blocksPerGame: stat.blocksPerGame,
            turnoversPerGame: stat.turnoversPerGame,
            fgPct: stat.fgPct,
            fg3Pct: stat.fg3Pct,
            ftPct: stat.ftPct,
            fgPerGame: stat.fgPerGame,
            fgaPerGame: stat.fgaPerGame,
            fg3PerGame: stat.fg3PerGame,
            fg3aPerGame: stat.fg3aPerGame,
            ftPerGame: stat.ftPerGame,
            ftaPerGame: stat.ftaPerGame,
            offRebPerGame: stat.offRebPerGame,
            defRebPerGame: stat.defRebPerGame,
            personalFouls: stat.personalFouls,
            efgPct: stat.efgPct,
            updatedAt: new Date(),
          },
        });
      }
    });
  }
}

export const storage = new DatabaseStorage();
