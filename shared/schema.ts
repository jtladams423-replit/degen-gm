import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, serial, timestamp, jsonb, uniqueIndex, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const prospects = pgTable("prospects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  position: text("position").notNull(),
  college: text("college").notNull(),
  height: text("height").notNull(),
  weight: text("weight").notNull(),
  fortyTime: real("forty_time"),
  vertical: integer("vertical"),
  benchReps: integer("bench_reps"),
  broadJump: text("broad_jump"),
  shuttle: real("shuttle"),
  threeCone: real("three_cone"),
  wingspan: text("wingspan"),
  standingReach: text("standing_reach"),
  laneAgility: real("lane_agility"),
  sprint: real("sprint"),
  grade: integer("grade").notNull(),
  projectedRound: integer("projected_round").notNull(),
  year: integer("year").notNull().default(2026),
  sport: text("sport").notNull().default("NFL"),
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  primaryColor: text("primary_color").notNull(),
  needs: text("needs").array().notNull(),
  capSpace: real("cap_space"),
  sport: text("sport").notNull().default("NFL"),
}, (table) => [
  uniqueIndex("teams_code_sport_idx").on(table.code, table.sport),
]);

export const freeAgents = pgTable("free_agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  position: text("position").notNull(),
  age: integer("age").notNull(),
  prevTeam: text("prev_team").notNull(),
  marketValue: real("market_value").notNull(),
  tier: text("tier").notNull(),
  sport: text("sport").notNull().default("NFL"),
  projectedYears: integer("projected_years").notNull().default(2),
  projectedTotal: real("projected_total").notNull().default(0),
});

export const draftOrder = pgTable("draft_order", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull().default(2026),
  pickNumber: integer("pick_number").notNull(),
  round: integer("round").notNull().default(1),
  teamCode: text("team_code").notNull(),
  originalTeamCode: text("original_team_code"),
  sport: text("sport").notNull().default("NFL"),
});

export const mockDrafts = pgTable("mock_drafts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  year: integer("year").notNull().default(2026),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  method: text("method").notNull().default("User"),
  rounds: integer("rounds").notNull().default(1),
  teamScope: text("team_scope").notNull().default("All"),
  sport: text("sport").notNull().default("NFL"),
});

export const mockPicks = pgTable("mock_picks", {
  id: serial("id").primaryKey(),
  mockDraftId: integer("mock_draft_id").notNull(),
  round: integer("round").notNull(),
  overallPick: integer("overall_pick").notNull(),
  teamCode: text("team_code").notNull(),
  playerName: text("player_name").notNull(),
  position: text("position").notNull(),
  college: text("college"),
  notes: text("notes"),
});

export const historicalPerformance = pgTable("historical_performance", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  pick: integer("pick").notNull(),
  team: text("team").notNull(),
  player: text("player").notNull(),
  position: text("position").notNull(),
  av: integer("av").notNull(),
  expectedAv: integer("expected_av").notNull(),
  valueDiff: integer("value_diff").notNull(),
  sport: text("sport").notNull().default("NFL"),
});

export const draftSessions = pgTable("draft_sessions", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 8 }).notNull().unique(),
  status: text("status").notNull().default("waiting"),
  rounds: integer("rounds").notNull().default(1),
  currentPickIndex: integer("current_pick_index").notNull().default(0),
  teamControllers: jsonb("team_controllers").notNull().default({}),
  picks: jsonb("picks").notNull().default([]),
  availablePlayerIds: jsonb("available_player_ids").notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  sport: text("sport").notNull().default("NFL"),
});

export const rosterPlayers = pgTable("roster_players", {
  id: serial("id").primaryKey(),
  teamCode: text("team_code").notNull(),
  name: text("name").notNull(),
  position: text("position").notNull(),
  depthOrder: integer("depth_order").notNull().default(1),
  age: integer("age").notNull(),
  capHit: real("cap_hit"),
  contractYears: integer("contract_years"),
  status: text("status").notNull().default("active"),
  sport: text("sport").notNull().default("NFL"),
  salaryByYear: jsonb("salary_by_year"),
  contractEndYear: integer("contract_end_year"),
  optionType: text("option_type").default("none"),
  freeAgentType: text("free_agent_type").default("UFA"),
  noTradeClause: boolean("no_trade_clause").default(false),
});

export const capSettings = pgTable("cap_settings", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  sport: text("sport").notNull().default("NBA"),
  salaryCap: real("salary_cap").notNull(),
  taxLine: real("tax_line").notNull(),
  firstApron: real("first_apron").notNull(),
  secondApron: real("second_apron").notNull(),
  minSalary: real("min_salary").notNull().default(1.1),
  maxSalary: real("max_salary").notNull().default(51.4),
}, (table) => [
  uniqueIndex("cap_settings_year_sport_idx").on(table.year, table.sport),
]);

export const tradeProposals = pgTable("trade_proposals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sport: text("sport").notNull().default("NBA"),
  status: text("status").notNull().default("draft"),
  legs: jsonb("legs").notNull().default([]),
  validationResult: jsonb("validation_result"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teamBuilderSaves = pgTable("team_builder_saves", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sport: text("sport").notNull().default("NFL"),
  state: jsonb("state").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const playerSeasonStats = pgTable("player_season_stats", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  teamCode: text("team_code").notNull(),
  position: text("position").notNull(),
  gamesPlayed: integer("games_played"),
  minutesPerGame: real("minutes_per_game"),
  pointsPerGame: real("points_per_game"),
  reboundsPerGame: real("rebounds_per_game"),
  assistsPerGame: real("assists_per_game"),
  stealsPerGame: real("steals_per_game"),
  blocksPerGame: real("blocks_per_game"),
  turnoversPerGame: real("turnovers_per_game"),
  fgPct: real("fg_pct"),
  fg3Pct: real("fg3_pct"),
  ftPct: real("ft_pct"),
  offRebPerGame: real("off_reb_per_game"),
  defRebPerGame: real("def_reb_per_game"),
  personalFouls: real("personal_fouls"),
  fgaPerGame: real("fga_per_game"),
  fgmPerGame: real("fgm_per_game"),
  fg3aPerGame: real("fg3a_per_game"),
  fg3mPerGame: real("fg3m_per_game"),
  ftaPerGame: real("fta_per_game"),
  ftmPerGame: real("ftm_per_game"),
  season: text("season").notNull().default("2025-26"),
  sport: text("sport").notNull().default("NBA"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("player_season_stats_name_team_season_idx").on(table.name, table.teamCode, table.season),
]);

export const teamStandings = pgTable("team_standings", {
  id: serial("id").primaryKey(),
  teamCode: text("team_code").notNull(),
  sport: text("sport").notNull().default("NBA"),
  season: text("season").notNull(),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  winPct: real("win_pct"),
  confRank: integer("conf_rank"),
  conference: text("conference"),
  division: text("division"),
  homeRecord: text("home_record"),
  awayRecord: text("away_record"),
  streak: text("streak"),
  lastTen: text("last_ten"),
  gamesBehind: text("games_behind"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("team_standings_team_sport_season_idx").on(table.teamCode, table.sport, table.season),
]);

export const insertTeamStandingsSchema = createInsertSchema(teamStandings).omit({ id: true, updatedAt: true });

export const collegeStats = pgTable("college_stats", {
  id: serial("id").primaryKey(),
  playerName: text("player_name").notNull(),
  college: text("college").notNull(),
  season: text("season").notNull(),
  classYear: text("class_year"),
  position: text("position"),
  gamesPlayed: integer("games_played"),
  gamesStarted: integer("games_started"),
  minutesPerGame: real("minutes_per_game"),
  pointsPerGame: real("points_per_game"),
  reboundsPerGame: real("rebounds_per_game"),
  assistsPerGame: real("assists_per_game"),
  stealsPerGame: real("steals_per_game"),
  blocksPerGame: real("blocks_per_game"),
  turnoversPerGame: real("turnovers_per_game"),
  fgPct: real("fg_pct"),
  fg3Pct: real("fg3_pct"),
  ftPct: real("ft_pct"),
  fgPerGame: real("fg_per_game"),
  fgaPerGame: real("fga_per_game"),
  fg3PerGame: real("fg3_per_game"),
  fg3aPerGame: real("fg3a_per_game"),
  ftPerGame: real("ft_per_game"),
  ftaPerGame: real("fta_per_game"),
  offRebPerGame: real("off_reb_per_game"),
  defRebPerGame: real("def_reb_per_game"),
  personalFouls: real("personal_fouls"),
  efgPct: real("efg_pct"),
  sport: text("sport").notNull().default("NBA"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("college_stats_player_college_season_idx").on(table.playerName, table.college, table.season),
]);

export const insertCollegeStatsSchema = createInsertSchema(collegeStats).omit({ id: true, updatedAt: true });

export const insertPlayerSeasonStatsSchema = createInsertSchema(playerSeasonStats).omit({ id: true, updatedAt: true });

export const insertRosterPlayerSchema = createInsertSchema(rosterPlayers).omit({ id: true });
export const insertCapSettingsSchema = createInsertSchema(capSettings).omit({ id: true });
export const insertTradeProposalSchema = createInsertSchema(tradeProposals).omit({ id: true, createdAt: true });
export const insertTeamBuilderSaveSchema = createInsertSchema(teamBuilderSaves).omit({ id: true, createdAt: true });

export const insertProspectSchema = createInsertSchema(prospects).omit({ id: true });
export const insertTeamSchema = createInsertSchema(teams).omit({ id: true });
export const insertFreeAgentSchema = createInsertSchema(freeAgents).omit({ id: true });
export const insertDraftOrderSchema = createInsertSchema(draftOrder).omit({ id: true });
export const insertMockDraftSchema = createInsertSchema(mockDrafts).omit({ id: true, createdAt: true });
export const insertMockPickSchema = createInsertSchema(mockPicks).omit({ id: true });
export const insertHistoricalPerformanceSchema = createInsertSchema(historicalPerformance).omit({ id: true });
export const insertDraftSessionSchema = createInsertSchema(draftSessions).omit({ id: true, createdAt: true });

export type Prospect = typeof prospects.$inferSelect;
export type InsertProspect = z.infer<typeof insertProspectSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type FreeAgent = typeof freeAgents.$inferSelect;
export type InsertFreeAgent = z.infer<typeof insertFreeAgentSchema>;
export type DraftOrderEntry = typeof draftOrder.$inferSelect;
export type InsertDraftOrderEntry = z.infer<typeof insertDraftOrderSchema>;
export type MockDraft = typeof mockDrafts.$inferSelect;
export type InsertMockDraft = z.infer<typeof insertMockDraftSchema>;
export type MockPick = typeof mockPicks.$inferSelect;
export type InsertMockPick = z.infer<typeof insertMockPickSchema>;
export type HistoricalPerformance = typeof historicalPerformance.$inferSelect;
export type InsertHistoricalPerformance = z.infer<typeof insertHistoricalPerformanceSchema>;
export type DraftSession = typeof draftSessions.$inferSelect;
export type InsertDraftSession = z.infer<typeof insertDraftSessionSchema>;
export type RosterPlayer = typeof rosterPlayers.$inferSelect;
export type InsertRosterPlayer = z.infer<typeof insertRosterPlayerSchema>;
export type CapSetting = typeof capSettings.$inferSelect;
export type InsertCapSetting = z.infer<typeof insertCapSettingsSchema>;
export type TradeProposal = typeof tradeProposals.$inferSelect;
export type InsertTradeProposal = z.infer<typeof insertTradeProposalSchema>;
export type TeamBuilderSave = typeof teamBuilderSaves.$inferSelect;
export type InsertTeamBuilderSave = z.infer<typeof insertTeamBuilderSaveSchema>;

export type PlayerSeasonStats = typeof playerSeasonStats.$inferSelect;
export type InsertPlayerSeasonStats = z.infer<typeof insertPlayerSeasonStatsSchema>;
export type TeamStanding = typeof teamStandings.$inferSelect;
export type InsertTeamStanding = z.infer<typeof insertTeamStandingsSchema>;
export type CollegeStats = typeof collegeStats.$inferSelect;
export type InsertCollegeStats = z.infer<typeof insertCollegeStatsSchema>;

export interface TradeLeg {
  fromTeamCode: string;
  toTeamCode: string;
  playerIds: number[];
  pickIds: number[];
}

export interface TradeValidationResult {
  isValid: boolean;
  teamResults: {
    teamCode: string;
    salaryOut: number;
    salaryIn: number;
    netChange: number;
    rosterSizeAfter: number;
    passed: boolean;
    reasons: string[];
  }[];
  overallReasons: string[];
}
