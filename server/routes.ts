import type { Express } from "express";
import { createServer, type Server } from "http";
import { eq } from "drizzle-orm";
import { storage, db } from "./storage";
import { draftLiveService } from "./draftLive";
import { teams, freeAgents, draftOrder, prospects, rosterPlayers, capSettings } from "@shared/schema";
import { generateCode, setupDraftSessionWS } from "./draftSession";
import { prospects2026 } from "./prospects2026";
import { nbaTeams2026, nbaDraftOrder2026, nbaProspects2026, nbaFreeAgents2026 } from "./nbaData2026";
import { nflRosters2026 } from "./rosterData2026";
import { nbaRosters2026 } from "./nbaRosterData2026";
import { validateTrade, getDefaultCapSettings, getTeamTaxStatus, type TradeTeamState } from "./tradeEngine";
import { syncRosterTeams } from "./balldontlie";
import { z } from "zod";
import { asyncHandler, NotFoundError } from "./middleware";
import { registerApiDocs } from "./apiDocs";
import { metrics } from "./metrics";
import { responseCache } from "./cache";

function buildNflDraftOrder2026(): { year: number; pickNumber: number; round: number; teamCode: string }[] {
  return [
    ...[
      'LV','NYJ','ARI','TEN','NYG','CLE','WAS','NO','KC','CIN','MIA','DAL','LAR','BAL','TB','NYJ',
      'DET','MIN','CAR','DAL','PIT','LAC','PHI','CLE','CHI','BUF','SF','HOU','LAR','DEN','NE','SEA'
    ].map((t,i) => ({ year: 2026, pickNumber: i+1, round: 1, teamCode: t })),
    ...[
      'NYJ','ARI','TEN','LV','NYG','HOU','CLE','KC','CIN','NO','MIA','NYJ','BAL','TB','IND','ATL',
      'MIN','DET','CAR','GB','PIT','PHI','LAC','JAX','CHI','SF','HOU','BUF','LAR','DEN','NE','SEA'
    ].map((t,i) => ({ year: 2026, pickNumber: 33+i, round: 2, teamCode: t })),
    ...[
      'ARI','TEN','LV','PHI','HOU','CLE','WAS','CIN','NO','KC','MIA','PIT','TB','IND','ATL','BAL',
      'JAX','MIN','CAR','GB','PIT','LAC','MIA','JAX','CHI','MIA','BUF','SF','LAR','DEN','NE','SEA',
      'MIN','PHI','PIT','JAX'
    ].map((t,i) => ({ year: 2026, pickNumber: 65+i, round: 3, teamCode: t })),
    ...[
      'TEN','LV','NYJ','ARI','NYG','HOU','CLE','DEN','KC','CIN','MIA','DAL','IND','ATL','BAL','TB',
      'LV','DET','CAR','GB','PIT','PHI','LAC','JAX','NE','BUF','SF','HOU','CHI','DEN','NE','NO',
      'SF','LV','PIT','NO','PHI','SF'
    ].map((t,i) => ({ year: 2026, pickNumber: 101+i, round: 4, teamCode: t })),
    ...[
      'CLE','TEN','ARI','TEN','NYG','CLE','WAS','KC','CLE','NO','MIA','DAL','PHI','BAL','TB','IND',
      'DET','CAR','CAR','GB','PIT','BAL','MIN','JAX','CHI','JAX','HOU','BUF','LAR','DEN','NE','NO',
      'SF','BAL','BAL','LV','NYJ','KC','DAL','NYJ','PHI','DET'
    ].map((t,i) => ({ year: 2026, pickNumber: 139+i, round: 5, teamCode: t })),
    ...[
      'LV','ARI','TEN','LV','NYG','WAS','DET','CIN','NO','NE','NYG','NYG','NYJ','TB','MIN','ATL',
      'WAS','CIN','CAR','GB','NE','JAX','LAC','DET','CLE','LAR','NYJ','NE','LAR','BAL','NE','SEA',
      'PIT','LAC','PIT','DAL','IND'
    ].map((t,i) => ({ year: 2026, pickNumber: 181+i, round: 6, teamCode: t })),
    ...[
      'ARI','NYJ','LV','BUF','DAL','DET','WAS','PIT','DAL','CIN','MIA','BUF','TB','IND','ATL','LAR',
      'JAX','MIN','CAR','GB','PIT','TEN','CHI','MIN','CHI','NYJ','HOU','HOU','JAX','DEN','NE','CLE',
      'BAL','LAR','BAL','IND','GB','DEN','LAR','GB'
    ].map((t,i) => ({ year: 2026, pickNumber: 218+i, round: 7, teamCode: t })),
  ];
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerApiDocs(app);

  app.get("/api/metrics", asyncHandler(async (_req, res) => {
    const window = parseInt((_req.query as any).window || "60000");
    res.json(metrics.getStats(window));
  }));

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cache: responseCache.stats(),
    });
  });

  const sportQuerySchema = z.object({
    sport: z.enum(["NFL", "NBA"]).default("NFL"),
    year: z.coerce.number().optional(),
  });

  // Prospects
  app.get("/api/prospects", asyncHandler(async (req, res) => {
    const { sport, year } = sportQuerySchema.parse(req.query);
    const cacheKey = `prospects:${sport}:${year || 'all'}`;
    const cached = responseCache.get(cacheKey);
    if (cached) {
      res.set('ETag', cached.etag);
      if (req.headers['if-none-match'] === cached.etag) return res.status(304).end();
      return res.json(cached.data);
    }
    const prospects = await storage.getProspects(sport, year);
    responseCache.set(cacheKey, prospects, 300000);
    res.json(prospects);
  }));

  // Teams
  app.get("/api/teams", asyncHandler(async (req, res) => {
    const { sport } = sportQuerySchema.parse(req.query);
    const cacheKey = `teams:${sport}`;
    const cached = responseCache.get(cacheKey);
    if (cached) {
      res.set('ETag', cached.etag);
      if (req.headers['if-none-match'] === cached.etag) return res.status(304).end();
      return res.json(cached.data);
    }
    const teams = await storage.getTeams(sport);
    responseCache.set(cacheKey, teams, 300000);
    res.json(teams);
  }));

  app.get("/api/teams/:code", asyncHandler(async (req, res) => {
    const { sport } = sportQuerySchema.parse(req.query);
    const team = await storage.getTeamByCode(req.params.code, sport);
    if (!team) throw new NotFoundError("Team not found");
    res.json(team);
  }));

  // Free Agents
  app.get("/api/free-agents", asyncHandler(async (req, res) => {
    const { sport } = sportQuerySchema.parse(req.query);
    const cacheKey = `free-agents:${sport}`;
    const cached = responseCache.get(cacheKey);
    if (cached) {
      res.set('ETag', cached.etag);
      if (req.headers['if-none-match'] === cached.etag) return res.status(304).end();
      return res.json(cached.data);
    }
    const agents = await storage.getFreeAgents(sport);
    responseCache.set(cacheKey, agents, 300000);
    res.json(agents);
  }));

  // Roster / Depth Chart
  app.get("/api/roster", asyncHandler(async (req, res) => {
    const { sport } = sportQuerySchema.parse(req.query);
    const teamCode = req.query.team as string | undefined;
    const cacheKey = `roster:${sport}:${teamCode || 'all'}`;
    const cached = responseCache.get(cacheKey);
    if (cached) {
      res.set('ETag', cached.etag);
      if (req.headers['if-none-match'] === cached.etag) return res.status(304).end();
      return res.json(cached.data);
    }
    const roster = await storage.getRosterPlayers(sport, teamCode);
    responseCache.set(cacheKey, roster, 120000);
    res.json(roster);
  }));

  // Draft Order
  app.get("/api/draft-order", asyncHandler(async (req, res) => {
    const { sport, year } = sportQuerySchema.parse(req.query);
    const cacheKey = `draft-order:${sport}:${year || 'all'}`;
    const cached = responseCache.get(cacheKey);
    if (cached) {
      res.set('ETag', cached.etag);
      if (req.headers['if-none-match'] === cached.etag) return res.status(304).end();
      return res.json(cached.data);
    }
    const order = await storage.getDraftOrder(sport, year);
    responseCache.set(cacheKey, order, 300000);
    res.json(order);
  }));

  // Mock Drafts
  app.get("/api/mock-drafts", asyncHandler(async (req, res) => {
    const { sport } = sportQuerySchema.parse(req.query);
    const drafts = await storage.getMockDrafts(sport);
    res.json(drafts);
  }));

  app.get("/api/mock-drafts/:id", asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const draft = await storage.getMockDraft(id);
    if (!draft) throw new NotFoundError("Mock draft not found");
    const picks = await storage.getMockPicks(id);
    res.json({ ...draft, picks });
  }));

  app.post("/api/mock-drafts", asyncHandler(async (req, res) => {
    const { name, year, method, rounds, teamScope, picks, sport } = req.body;
    const draft = await storage.createMockDraft({ name, year: year || 2026, method: method || "User", rounds: rounds || 1, teamScope: teamScope || "All", sport: sport || "NFL" });
    if (picks && picks.length > 0) {
      const picksWithDraftId = picks.map((p: any) => ({ ...p, mockDraftId: draft.id }));
      await storage.createMockPicks(picksWithDraftId);
    }
    const savedPicks = await storage.getMockPicks(draft.id);
    res.status(201).json({ ...draft, picks: savedPicks });
  }));

  app.delete("/api/mock-drafts/:id", asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteMockDraft(id);
    res.status(204).send();
  }));

  // Historical Performance
  app.get("/api/historical-performance", asyncHandler(async (req, res) => {
    const { sport } = sportQuerySchema.parse(req.query);
    const perf = await storage.getHistoricalPerformance(sport);
    res.json(perf);
  }));

  // Seed endpoint (for initial data load)
  app.post("/api/seed", asyncHandler(async (_req, res) => {
    const existingTeams = await storage.getTeams();
    if (existingTeams.length > 0) {
      return res.json({ message: "Data already seeded" });
    }

    // Seed teams
    const teamsData = [
      { code: 'LV', name: 'Las Vegas Raiders', primaryColor: '#000000', needs: ['QB', 'OL', 'WR', 'CB', 'EDGE'], capSpace: 91.5 },
      { code: 'NYJ', name: 'New York Jets', primaryColor: '#125740', needs: ['QB', 'CB', 'WR', 'DL', 'OL'], capSpace: 79.7 },
      { code: 'ARI', name: 'Arizona Cardinals', primaryColor: '#97233F', needs: ['QB', 'OL', 'EDGE', 'S', 'DL'], capSpace: 39.2 },
      { code: 'TEN', name: 'Tennessee Titans', primaryColor: '#0C2340', needs: ['WR', 'EDGE', 'CB', 'OL', 'S'], capSpace: 104.8 },
      { code: 'NYG', name: 'New York Giants', primaryColor: '#0B2265', needs: ['WR', 'OL', 'CB', 'LB', 'DL'], capSpace: 6.9 },
      { code: 'CLE', name: 'Cleveland Browns', primaryColor: '#311D00', needs: ['QB', 'OL', 'WR', 'CB', 'LB'], capSpace: 2.3 },
      { code: 'WAS', name: 'Washington Commanders', primaryColor: '#5A1414', needs: ['EDGE', 'CB', 'LB', 'TE', 'WR'], capSpace: 74.6 },
      { code: 'NO', name: 'New Orleans Saints', primaryColor: '#D3BC8D', needs: ['EDGE', 'WR', 'CB', 'OL', 'DL'], capSpace: -6.0 },
      { code: 'KC', name: 'Kansas City Chiefs', primaryColor: '#E31837', needs: ['RB', 'WR', 'OL', 'CB', 'TE'], capSpace: -54.9 },
      { code: 'CIN', name: 'Cincinnati Bengals', primaryColor: '#FB4F14', needs: ['EDGE', 'OL', 'CB', 'DL', 'S'], capSpace: 53.5 },
      { code: 'MIA', name: 'Miami Dolphins', primaryColor: '#008E97', needs: ['QB', 'OL', 'CB', 'S', 'WR'], capSpace: 3.2 },
      { code: 'DAL', name: 'Dallas Cowboys', primaryColor: '#003594', needs: ['EDGE', 'S', 'CB', 'LB', 'RB'], capSpace: -30.2 },
      { code: 'LAR', name: 'Los Angeles Rams', primaryColor: '#003594', needs: ['OL', 'CB', 'S', 'WR', 'QB'], capSpace: 44.9 },
      { code: 'BAL', name: 'Baltimore Ravens', primaryColor: '#241773', needs: ['EDGE', 'DL', 'OL', 'CB', 'S'], capSpace: 22.0 },
      { code: 'TB', name: 'Tampa Bay Buccaneers', primaryColor: '#D50A0A', needs: ['EDGE', 'LB', 'CB', 'TE', 'OL'], capSpace: 23.9 },
      { code: 'IND', name: 'Indianapolis Colts', primaryColor: '#002C5F', needs: ['QB', 'DL', 'LB', 'S', 'OL'], capSpace: 35.7 },
      { code: 'DET', name: 'Detroit Lions', primaryColor: '#0076B6', needs: ['EDGE', 'DL', 'OL', 'CB', 'S'], capSpace: -9.9 },
      { code: 'MIN', name: 'Minnesota Vikings', primaryColor: '#4F2683', needs: ['S', 'CB', 'OL', 'WR', 'LB'], capSpace: -40.2 },
      { code: 'CAR', name: 'Carolina Panthers', primaryColor: '#0085CA', needs: ['OL', 'EDGE', 'LB', 'S', 'WR'], capSpace: 13.0 },
      { code: 'PIT', name: 'Pittsburgh Steelers', primaryColor: '#FFB612', needs: ['QB', 'WR', 'CB', 'S', 'OL'], capSpace: 44.9 },
      { code: 'LAC', name: 'Los Angeles Chargers', primaryColor: '#0080C6', needs: ['OL', 'EDGE', 'DL', 'S', 'CB'], capSpace: 82.9 },
      { code: 'PHI', name: 'Philadelphia Eagles', primaryColor: '#004C54', needs: ['EDGE', 'CB', 'TE', 'OL', 'S'], capSpace: 18.2 },
      { code: 'CHI', name: 'Chicago Bears', primaryColor: '#0B162A', needs: ['DL', 'EDGE', 'LB', 'S', 'OL'], capSpace: -5.3 },
      { code: 'HOU', name: 'Houston Texans', primaryColor: '#03202F', needs: ['RB', 'OL', 'DL', 'CB', 'S'], capSpace: -4.7 },
      { code: 'BUF', name: 'Buffalo Bills', primaryColor: '#00338D', needs: ['WR', 'EDGE', 'LB', 'CB', 'S'], capSpace: -12.3 },
      { code: 'SF', name: 'San Francisco 49ers', primaryColor: '#AA0000', needs: ['WR', 'OL', 'EDGE', 'S', 'CB'], capSpace: 41.9 },
      { code: 'NE', name: 'New England Patriots', primaryColor: '#002244', needs: ['OL', 'EDGE', 'LB', 'CB', 'S'], capSpace: 41.0 },
      { code: 'SEA', name: 'Seattle Seahawks', primaryColor: '#005C5C', needs: ['RB', 'OL', 'LB', 'CB', 'S'], capSpace: 63.6 },
      { code: 'DEN', name: 'Denver Broncos', primaryColor: '#FB4F14', needs: ['RB', 'TE', 'OL', 'LB', 'CB'], capSpace: 28.9 },
      { code: 'GB', name: 'Green Bay Packers', primaryColor: '#203731', needs: ['OL', 'DL', 'CB', 'S', 'EDGE'], capSpace: -1.6 },
      { code: 'ATL', name: 'Atlanta Falcons', primaryColor: '#A71930', needs: ['WR', 'TE', 'DL', 'CB', 'EDGE'], capSpace: 26.5 },
      { code: 'JAX', name: 'Jacksonville Jaguars', primaryColor: '#006778', needs: ['OL', 'DL', 'S', 'CB', 'LB'], capSpace: -13.0 },
    ];
    await storage.createTeams(teamsData);

    // Seed prospects - 2026 NFL Draft class from ETR + consensus big boards
    const prospectsData = prospects2026;
    // Old inline prospect data replaced with prospects2026.ts import (ETR + consensus big boards)
    await storage.createProspects(prospectsData);

    // Seed free agents
    const freeAgentsData = [
      { name: 'Tyreek Hill', position: 'WR', age: 32, prevTeam: 'MIA', marketValue: 30.0, tier: 'Elite', projectedYears: 3, projectedTotal: 94.0 },
      { name: 'Trey Hendrickson', position: 'EDGE', age: 31, prevTeam: 'CIN', marketValue: 25.4, tier: 'Elite', projectedYears: 4, projectedTotal: 105.0 },
      { name: 'Khalil Mack', position: 'EDGE', age: 35, prevTeam: 'LAC', marketValue: 18.4, tier: 'Elite', projectedYears: 2, projectedTotal: 37.0 },
      { name: 'Deebo Samuel', position: 'WR', age: 30, prevTeam: 'WAS', marketValue: 15.8, tier: 'Elite', projectedYears: 3, projectedTotal: 49.0 },
      { name: 'Braden Smith', position: 'OT', age: 30, prevTeam: 'IND', marketValue: 13.5, tier: 'Elite', projectedYears: 4, projectedTotal: 56.0 },
      { name: 'Joey Bosa', position: 'EDGE', age: 31, prevTeam: 'BUF', marketValue: 13.7, tier: 'Elite', projectedYears: 3, projectedTotal: 42.0 },
      { name: 'Mike Evans', position: 'WR', age: 32, prevTeam: 'TB', marketValue: 13.3, tier: 'Elite', projectedYears: 2, projectedTotal: 27.0 },
      { name: 'Cam Robinson', position: 'OT', age: 30, prevTeam: 'CLE', marketValue: 13.1, tier: 'Elite', projectedYears: 4, projectedTotal: 54.0 },
      { name: 'Joel Bitonio', position: 'OL', age: 34, prevTeam: 'CLE', marketValue: 12.9, tier: 'Elite', projectedYears: 2, projectedTotal: 26.0 },
      { name: 'Jamel Dean', position: 'CB', age: 29, prevTeam: 'TB', marketValue: 12.5, tier: 'Elite', projectedYears: 4, projectedTotal: 52.0 },
      { name: 'Travis Kelce', position: 'TE', age: 36, prevTeam: 'KC', marketValue: 10.8, tier: 'Starter', projectedYears: 1, projectedTotal: 10.8 },
      { name: 'Kyle Pitts', position: 'TE', age: 25, prevTeam: 'ATL', marketValue: 10.8, tier: 'Starter', projectedYears: 4, projectedTotal: 46.0 },
      { name: 'Daniel Jones', position: 'QB', age: 29, prevTeam: 'IND', marketValue: 43.6, tier: 'Starter', projectedYears: 3, projectedTotal: 135.0 },
      { name: 'Aaron Rodgers', position: 'QB', age: 42, prevTeam: 'PIT', marketValue: 10.6, tier: 'Starter', projectedYears: 1, projectedTotal: 10.6 },
      { name: 'Dre\'Mont Jones', position: 'EDGE', age: 29, prevTeam: 'BAL', marketValue: 10.3, tier: 'Starter', projectedYears: 4, projectedTotal: 43.0 },
      { name: 'Wyatt Teller', position: 'OL', age: 31, prevTeam: 'CLE', marketValue: 10.2, tier: 'Starter', projectedYears: 3, projectedTotal: 31.0 },
      { name: 'Jonah Williams', position: 'OT', age: 28, prevTeam: 'ARI', marketValue: 10.3, tier: 'Starter', projectedYears: 4, projectedTotal: 43.0 },
      { name: 'David Njoku', position: 'TE', age: 30, prevTeam: 'CLE', marketValue: 10.0, tier: 'Starter', projectedYears: 3, projectedTotal: 31.0 },
      { name: 'Malcolm Koonce', position: 'EDGE', age: 28, prevTeam: 'LV', marketValue: 9.9, tier: 'Starter', projectedYears: 4, projectedTotal: 41.0 },
      { name: 'Isaac Seumalo', position: 'OL', age: 32, prevTeam: 'PIT', marketValue: 9.6, tier: 'Starter', projectedYears: 2, projectedTotal: 19.0 },
      { name: 'Jalen Thompson', position: 'S', age: 28, prevTeam: 'ARI', marketValue: 9.5, tier: 'Starter', projectedYears: 4, projectedTotal: 40.0 },
      { name: 'Demario Davis', position: 'LB', age: 37, prevTeam: 'NO', marketValue: 9.5, tier: 'Starter', projectedYears: 1, projectedTotal: 9.5 },
      { name: 'Kevin Zeitler', position: 'OL', age: 36, prevTeam: 'TEN', marketValue: 9.2, tier: 'Starter', projectedYears: 1, projectedTotal: 9.2 },
      { name: 'Leonard Floyd', position: 'EDGE', age: 33, prevTeam: 'ATL', marketValue: 8.9, tier: 'Starter', projectedYears: 2, projectedTotal: 18.0 },
      { name: 'David Onyemata', position: 'DL', age: 33, prevTeam: 'ATL', marketValue: 8.6, tier: 'Starter', projectedYears: 2, projectedTotal: 17.0 },
      { name: 'Trevon Diggs', position: 'CB', age: 28, prevTeam: 'GB', marketValue: 7.5, tier: 'Starter', projectedYears: 3, projectedTotal: 23.0 },
      { name: 'Bobby Wagner', position: 'LB', age: 36, prevTeam: 'WAS', marketValue: 7.7, tier: 'Starter', projectedYears: 1, projectedTotal: 7.7 },
      { name: 'Lavonte David', position: 'LB', age: 36, prevTeam: 'TB', marketValue: 7.4, tier: 'Starter', projectedYears: 1, projectedTotal: 7.4 },
      { name: 'Christian Kirk', position: 'WR', age: 29, prevTeam: 'HOU', marketValue: 5.4, tier: 'Rotation', projectedYears: 3, projectedTotal: 16.0 },
      { name: 'Kyle Dugger', position: 'S', age: 30, prevTeam: 'PIT', marketValue: 5.9, tier: 'Rotation', projectedYears: 3, projectedTotal: 18.0 },
      { name: 'Dallas Goedert', position: 'TE', age: 31, prevTeam: 'PHI', marketValue: 6.0, tier: 'Rotation', projectedYears: 2, projectedTotal: 12.0 },
      { name: 'Russell Wilson', position: 'QB', age: 37, prevTeam: 'NYG', marketValue: 5.7, tier: 'Rotation', projectedYears: 1, projectedTotal: 5.7 },
      { name: 'Tyler Higbee', position: 'TE', age: 33, prevTeam: 'LAR', marketValue: 5.4, tier: 'Rotation', projectedYears: 2, projectedTotal: 11.0 },
      { name: 'Haason Reddick', position: 'EDGE', age: 31, prevTeam: 'TB', marketValue: 4.9, tier: 'Rotation', projectedYears: 2, projectedTotal: 10.0 },
      { name: 'Kenneth Murray', position: 'LB', age: 27, prevTeam: 'DAL', marketValue: 4.9, tier: 'Rotation', projectedYears: 3, projectedTotal: 15.0 },
      { name: 'D.J. Reader', position: 'DL', age: 32, prevTeam: 'DET', marketValue: 3.9, tier: 'Rotation', projectedYears: 2, projectedTotal: 8.0 },
      { name: 'Bradley Chubb', position: 'EDGE', age: 30, prevTeam: 'MIA', marketValue: 18.2, tier: 'Elite', projectedYears: 3, projectedTotal: 57.0 },
      { name: 'Andre Cisco', position: 'S', age: 26, prevTeam: 'NYJ', marketValue: 3.6, tier: 'Rotation', projectedYears: 3, projectedTotal: 11.0 },
      { name: 'Yetur Gross-Matos', position: 'EDGE', age: 28, prevTeam: 'SF', marketValue: 3.5, tier: 'Rotation', projectedYears: 3, projectedTotal: 11.0 },
      { name: 'Samson Ebukam', position: 'EDGE', age: 31, prevTeam: 'IND', marketValue: 2.9, tier: 'Rotation', projectedYears: 2, projectedTotal: 6.0 },
    ];
    await storage.createFreeAgents(freeAgentsData);

    const draftOrderData = buildNflDraftOrder2026();
    await storage.createDraftOrderEntries(draftOrderData);

    // Seed historical performance
    const historicalData = [
      { year: 2023, pick: 1, team: 'CAR', player: 'Bryce Young', position: 'QB', av: 6, expectedAv: 12, valueDiff: -6 },
      { year: 2023, pick: 2, team: 'HOU', player: 'C.J. Stroud', position: 'QB', av: 16, expectedAv: 10, valueDiff: 6 },
      { year: 2023, pick: 3, team: 'HOU', player: 'Will Anderson Jr.', position: 'EDGE', av: 10, expectedAv: 9, valueDiff: 1 },
      { year: 2023, pick: 4, team: 'IND', player: 'Anthony Richardson', position: 'QB', av: 4, expectedAv: 8, valueDiff: -4 },
      { year: 2023, pick: 5, team: 'SEA', player: 'Devon Witherspoon', position: 'CB', av: 11, expectedAv: 8, valueDiff: 3 },
      { year: 2023, pick: 20, team: 'SEA', player: 'Jaxon Smith-Njigba', position: 'WR', av: 8, expectedAv: 5, valueDiff: 3 },
      { year: 2023, pick: 175, team: 'LAR', player: 'Puka Nacua', position: 'WR', av: 14, expectedAv: 2, valueDiff: 12 },
      { year: 2022, pick: 1, team: 'JAX', player: 'Travon Walker', position: 'EDGE', av: 7, expectedAv: 10, valueDiff: -3 },
      { year: 2022, pick: 2, team: 'DET', player: 'Aidan Hutchinson', position: 'EDGE', av: 15, expectedAv: 9, valueDiff: 6 },
      { year: 2022, pick: 262, team: 'SF', player: 'Brock Purdy', position: 'QB', av: 18, expectedAv: 1, valueDiff: 17 },
    ];
    await storage.createHistoricalPerformances(historicalData);

    // Seed NBA data
    await storage.createTeams(nbaTeams2026);
    await storage.createProspects(nbaProspects2026.map(p => ({
      name: p.name,
      position: p.position,
      college: p.college,
      height: p.height,
      weight: p.weight,
      grade: p.grade,
      projectedRound: p.projectedRound,
      sport: p.sport,
      wingspan: p.wingspan,
      standingReach: p.standingReach,
      vertical: p.vertical,
      laneAgility: p.laneAgility,
      sprint: p.sprint,
    })));
    await storage.createFreeAgents(nbaFreeAgents2026);
    await storage.createDraftOrderEntries(nbaDraftOrder2026);

    // Seed NFL roster data
    const existingRoster = await storage.getRosterPlayers("NFL");
    if (existingRoster.length === 0) {
      await storage.createRosterPlayers(nflRosters2026);
    }

    res.json({ message: "Database seeded successfully" });
  }));

  app.post("/api/reseed", asyncHandler(async (_req, res) => {
      await db.delete(freeAgents);
      await db.delete(draftOrder);
      await db.delete(teams);

      const teamsData = [
        { code: 'LV', name: 'Las Vegas Raiders', primaryColor: '#000000', needs: ['QB', 'OL', 'WR', 'CB', 'EDGE'], capSpace: 91.5 },
        { code: 'NYJ', name: 'New York Jets', primaryColor: '#125740', needs: ['QB', 'CB', 'WR', 'DL', 'OL'], capSpace: 79.7 },
        { code: 'ARI', name: 'Arizona Cardinals', primaryColor: '#97233F', needs: ['QB', 'OL', 'EDGE', 'S', 'DL'], capSpace: 39.2 },
        { code: 'TEN', name: 'Tennessee Titans', primaryColor: '#0C2340', needs: ['WR', 'EDGE', 'CB', 'OL', 'S'], capSpace: 104.8 },
        { code: 'NYG', name: 'New York Giants', primaryColor: '#0B2265', needs: ['WR', 'OL', 'CB', 'LB', 'DL'], capSpace: 6.9 },
        { code: 'CLE', name: 'Cleveland Browns', primaryColor: '#311D00', needs: ['QB', 'OL', 'WR', 'CB', 'LB'], capSpace: 2.3 },
        { code: 'WAS', name: 'Washington Commanders', primaryColor: '#5A1414', needs: ['EDGE', 'CB', 'LB', 'TE', 'WR'], capSpace: 74.6 },
        { code: 'NO', name: 'New Orleans Saints', primaryColor: '#D3BC8D', needs: ['EDGE', 'WR', 'CB', 'OL', 'DL'], capSpace: -6.0 },
        { code: 'KC', name: 'Kansas City Chiefs', primaryColor: '#E31837', needs: ['RB', 'WR', 'OL', 'CB', 'TE'], capSpace: -54.9 },
        { code: 'CIN', name: 'Cincinnati Bengals', primaryColor: '#FB4F14', needs: ['EDGE', 'OL', 'CB', 'DL', 'S'], capSpace: 53.5 },
        { code: 'MIA', name: 'Miami Dolphins', primaryColor: '#008E97', needs: ['QB', 'OL', 'CB', 'S', 'WR'], capSpace: 3.2 },
        { code: 'DAL', name: 'Dallas Cowboys', primaryColor: '#003594', needs: ['EDGE', 'S', 'CB', 'LB', 'RB'], capSpace: -30.2 },
        { code: 'LAR', name: 'Los Angeles Rams', primaryColor: '#003594', needs: ['OL', 'CB', 'S', 'WR', 'QB'], capSpace: 44.9 },
        { code: 'BAL', name: 'Baltimore Ravens', primaryColor: '#241773', needs: ['EDGE', 'DL', 'OL', 'CB', 'S'], capSpace: 22.0 },
        { code: 'TB', name: 'Tampa Bay Buccaneers', primaryColor: '#D50A0A', needs: ['EDGE', 'LB', 'CB', 'TE', 'OL'], capSpace: 23.9 },
        { code: 'IND', name: 'Indianapolis Colts', primaryColor: '#002C5F', needs: ['QB', 'DL', 'LB', 'S', 'OL'], capSpace: 35.7 },
        { code: 'DET', name: 'Detroit Lions', primaryColor: '#0076B6', needs: ['EDGE', 'DL', 'OL', 'CB', 'S'], capSpace: -9.9 },
        { code: 'MIN', name: 'Minnesota Vikings', primaryColor: '#4F2683', needs: ['S', 'CB', 'OL', 'WR', 'LB'], capSpace: -40.2 },
        { code: 'CAR', name: 'Carolina Panthers', primaryColor: '#0085CA', needs: ['OL', 'EDGE', 'LB', 'S', 'WR'], capSpace: 13.0 },
        { code: 'PIT', name: 'Pittsburgh Steelers', primaryColor: '#FFB612', needs: ['QB', 'WR', 'CB', 'S', 'OL'], capSpace: 44.9 },
        { code: 'LAC', name: 'Los Angeles Chargers', primaryColor: '#0080C6', needs: ['OL', 'EDGE', 'DL', 'S', 'CB'], capSpace: 82.9 },
        { code: 'PHI', name: 'Philadelphia Eagles', primaryColor: '#004C54', needs: ['EDGE', 'CB', 'TE', 'OL', 'S'], capSpace: 18.2 },
        { code: 'CHI', name: 'Chicago Bears', primaryColor: '#0B162A', needs: ['DL', 'EDGE', 'LB', 'S', 'OL'], capSpace: -5.3 },
        { code: 'HOU', name: 'Houston Texans', primaryColor: '#03202F', needs: ['RB', 'OL', 'DL', 'CB', 'S'], capSpace: -4.7 },
        { code: 'BUF', name: 'Buffalo Bills', primaryColor: '#00338D', needs: ['WR', 'EDGE', 'LB', 'CB', 'S'], capSpace: -12.3 },
        { code: 'SF', name: 'San Francisco 49ers', primaryColor: '#AA0000', needs: ['WR', 'OL', 'EDGE', 'S', 'CB'], capSpace: 41.9 },
        { code: 'NE', name: 'New England Patriots', primaryColor: '#002244', needs: ['OL', 'EDGE', 'LB', 'CB', 'S'], capSpace: 41.0 },
        { code: 'SEA', name: 'Seattle Seahawks', primaryColor: '#005C5C', needs: ['RB', 'OL', 'LB', 'CB', 'S'], capSpace: 63.6 },
        { code: 'DEN', name: 'Denver Broncos', primaryColor: '#FB4F14', needs: ['RB', 'TE', 'OL', 'LB', 'CB'], capSpace: 28.9 },
        { code: 'GB', name: 'Green Bay Packers', primaryColor: '#203731', needs: ['OL', 'DL', 'CB', 'S', 'EDGE'], capSpace: -1.6 },
        { code: 'ATL', name: 'Atlanta Falcons', primaryColor: '#A71930', needs: ['WR', 'TE', 'DL', 'CB', 'EDGE'], capSpace: 26.5 },
        { code: 'JAX', name: 'Jacksonville Jaguars', primaryColor: '#006778', needs: ['OL', 'DL', 'S', 'CB', 'LB'], capSpace: -13.0 },
      ];
      await storage.createTeams(teamsData);

      const freeAgentsData = [
        { name: 'Tyreek Hill', position: 'WR', age: 32, prevTeam: 'MIA', marketValue: 30.0, tier: 'Elite', projectedYears: 3, projectedTotal: 94.0 },
        { name: 'Trey Hendrickson', position: 'EDGE', age: 31, prevTeam: 'CIN', marketValue: 25.4, tier: 'Elite', projectedYears: 4, projectedTotal: 105.0 },
        { name: 'Khalil Mack', position: 'EDGE', age: 35, prevTeam: 'LAC', marketValue: 18.4, tier: 'Elite', projectedYears: 2, projectedTotal: 37.0 },
        { name: 'Deebo Samuel', position: 'WR', age: 30, prevTeam: 'WAS', marketValue: 15.8, tier: 'Elite', projectedYears: 3, projectedTotal: 49.0 },
        { name: 'Braden Smith', position: 'OT', age: 30, prevTeam: 'IND', marketValue: 13.5, tier: 'Elite', projectedYears: 4, projectedTotal: 56.0 },
        { name: 'Joey Bosa', position: 'EDGE', age: 31, prevTeam: 'BUF', marketValue: 13.7, tier: 'Elite', projectedYears: 3, projectedTotal: 42.0 },
        { name: 'Mike Evans', position: 'WR', age: 32, prevTeam: 'TB', marketValue: 13.3, tier: 'Elite', projectedYears: 2, projectedTotal: 27.0 },
        { name: 'Cam Robinson', position: 'OT', age: 30, prevTeam: 'CLE', marketValue: 13.1, tier: 'Elite', projectedYears: 4, projectedTotal: 54.0 },
        { name: 'Joel Bitonio', position: 'OL', age: 34, prevTeam: 'CLE', marketValue: 12.9, tier: 'Elite', projectedYears: 2, projectedTotal: 26.0 },
        { name: 'Jamel Dean', position: 'CB', age: 29, prevTeam: 'TB', marketValue: 12.5, tier: 'Elite', projectedYears: 4, projectedTotal: 52.0 },
        { name: 'Travis Kelce', position: 'TE', age: 36, prevTeam: 'KC', marketValue: 10.8, tier: 'Starter', projectedYears: 1, projectedTotal: 10.8 },
        { name: 'Kyle Pitts', position: 'TE', age: 25, prevTeam: 'ATL', marketValue: 10.8, tier: 'Starter', projectedYears: 4, projectedTotal: 46.0 },
        { name: 'Daniel Jones', position: 'QB', age: 29, prevTeam: 'IND', marketValue: 43.6, tier: 'Starter', projectedYears: 3, projectedTotal: 135.0 },
        { name: 'Aaron Rodgers', position: 'QB', age: 42, prevTeam: 'PIT', marketValue: 10.6, tier: 'Starter', projectedYears: 1, projectedTotal: 10.6 },
        { name: 'Dre\'Mont Jones', position: 'EDGE', age: 29, prevTeam: 'BAL', marketValue: 10.3, tier: 'Starter', projectedYears: 4, projectedTotal: 43.0 },
        { name: 'Wyatt Teller', position: 'OL', age: 31, prevTeam: 'CLE', marketValue: 10.2, tier: 'Starter', projectedYears: 3, projectedTotal: 31.0 },
        { name: 'Jonah Williams', position: 'OT', age: 28, prevTeam: 'ARI', marketValue: 10.3, tier: 'Starter', projectedYears: 4, projectedTotal: 43.0 },
        { name: 'David Njoku', position: 'TE', age: 30, prevTeam: 'CLE', marketValue: 10.0, tier: 'Starter', projectedYears: 3, projectedTotal: 31.0 },
        { name: 'Malcolm Koonce', position: 'EDGE', age: 28, prevTeam: 'LV', marketValue: 9.9, tier: 'Starter', projectedYears: 4, projectedTotal: 41.0 },
        { name: 'Isaac Seumalo', position: 'OL', age: 32, prevTeam: 'PIT', marketValue: 9.6, tier: 'Starter', projectedYears: 2, projectedTotal: 19.0 },
        { name: 'Jalen Thompson', position: 'S', age: 28, prevTeam: 'ARI', marketValue: 9.5, tier: 'Starter', projectedYears: 4, projectedTotal: 40.0 },
        { name: 'Demario Davis', position: 'LB', age: 37, prevTeam: 'NO', marketValue: 9.5, tier: 'Starter', projectedYears: 1, projectedTotal: 9.5 },
        { name: 'Kevin Zeitler', position: 'OL', age: 36, prevTeam: 'TEN', marketValue: 9.2, tier: 'Starter', projectedYears: 1, projectedTotal: 9.2 },
        { name: 'Leonard Floyd', position: 'EDGE', age: 33, prevTeam: 'ATL', marketValue: 8.9, tier: 'Starter', projectedYears: 2, projectedTotal: 18.0 },
        { name: 'David Onyemata', position: 'DL', age: 33, prevTeam: 'ATL', marketValue: 8.6, tier: 'Starter', projectedYears: 2, projectedTotal: 17.0 },
        { name: 'Trevon Diggs', position: 'CB', age: 28, prevTeam: 'GB', marketValue: 7.5, tier: 'Starter', projectedYears: 3, projectedTotal: 23.0 },
        { name: 'Bobby Wagner', position: 'LB', age: 36, prevTeam: 'WAS', marketValue: 7.7, tier: 'Starter', projectedYears: 1, projectedTotal: 7.7 },
        { name: 'Lavonte David', position: 'LB', age: 36, prevTeam: 'TB', marketValue: 7.4, tier: 'Starter', projectedYears: 1, projectedTotal: 7.4 },
        { name: 'Christian Kirk', position: 'WR', age: 29, prevTeam: 'HOU', marketValue: 5.4, tier: 'Rotation', projectedYears: 3, projectedTotal: 16.0 },
        { name: 'Kyle Dugger', position: 'S', age: 30, prevTeam: 'PIT', marketValue: 5.9, tier: 'Rotation', projectedYears: 3, projectedTotal: 18.0 },
        { name: 'Dallas Goedert', position: 'TE', age: 31, prevTeam: 'PHI', marketValue: 6.0, tier: 'Rotation', projectedYears: 2, projectedTotal: 12.0 },
        { name: 'Russell Wilson', position: 'QB', age: 37, prevTeam: 'NYG', marketValue: 5.7, tier: 'Rotation', projectedYears: 1, projectedTotal: 5.7 },
        { name: 'Tyler Higbee', position: 'TE', age: 33, prevTeam: 'LAR', marketValue: 5.4, tier: 'Rotation', projectedYears: 2, projectedTotal: 11.0 },
        { name: 'Haason Reddick', position: 'EDGE', age: 31, prevTeam: 'TB', marketValue: 4.9, tier: 'Rotation', projectedYears: 2, projectedTotal: 10.0 },
        { name: 'Kenneth Murray', position: 'LB', age: 27, prevTeam: 'DAL', marketValue: 4.9, tier: 'Rotation', projectedYears: 3, projectedTotal: 15.0 },
        { name: 'D.J. Reader', position: 'DL', age: 32, prevTeam: 'DET', marketValue: 3.9, tier: 'Rotation', projectedYears: 2, projectedTotal: 8.0 },
        { name: 'Bradley Chubb', position: 'EDGE', age: 30, prevTeam: 'MIA', marketValue: 18.2, tier: 'Elite', projectedYears: 3, projectedTotal: 57.0 },
        { name: 'Andre Cisco', position: 'S', age: 26, prevTeam: 'NYJ', marketValue: 3.6, tier: 'Rotation', projectedYears: 3, projectedTotal: 11.0 },
        { name: 'Yetur Gross-Matos', position: 'EDGE', age: 28, prevTeam: 'SF', marketValue: 3.5, tier: 'Rotation', projectedYears: 3, projectedTotal: 11.0 },
        { name: 'Samson Ebukam', position: 'EDGE', age: 31, prevTeam: 'IND', marketValue: 2.9, tier: 'Rotation', projectedYears: 2, projectedTotal: 6.0 },
      ];
      await storage.createFreeAgents(freeAgentsData);

      const draftOrderData = buildNflDraftOrder2026();
      await storage.createDraftOrderEntries(draftOrderData);

      res.json({ message: "Data refreshed successfully" });
  }));

  app.post("/api/seed-nba", asyncHandler(async (_req, res) => {
      const existingNbaTeams = await storage.getTeams("NBA");
      if (existingNbaTeams.length > 0) {
        return res.json({ message: "NBA data already seeded" });
      }
      await storage.createTeams(nbaTeams2026);
      await storage.createProspects(nbaProspects2026.map(p => ({
        name: p.name,
        position: p.position,
        college: p.college,
        height: p.height,
        weight: p.weight,
        grade: p.grade,
        projectedRound: p.projectedRound,
        sport: p.sport,
        wingspan: p.wingspan,
        standingReach: p.standingReach,
        vertical: p.vertical,
        laneAgility: p.laneAgility,
        sprint: p.sprint,
      })));
      await storage.createFreeAgents(nbaFreeAgents2026);
      await storage.createDraftOrderEntries(nbaDraftOrder2026);
      await storage.createRosterPlayers(nbaRosters2026);
      res.json({ message: "NBA data seeded successfully", roster: nbaRosters2026.length });
  }));

  app.post("/api/reseed-nba", asyncHandler(async (_req, res) => {
      await db.delete(prospects).where(eq(prospects.sport, 'NBA'));
      await db.delete(freeAgents).where(eq(freeAgents.sport, 'NBA'));
      await db.delete(draftOrder).where(eq(draftOrder.sport, 'NBA'));
      await db.delete(teams).where(eq(teams.sport, 'NBA'));
      await db.delete(rosterPlayers).where(eq(rosterPlayers.sport, 'NBA'));

      await storage.createTeams(nbaTeams2026);
      await storage.createProspects(nbaProspects2026.map(p => ({
        name: p.name,
        position: p.position,
        college: p.college,
        height: p.height,
        weight: p.weight,
        grade: p.grade,
        projectedRound: p.projectedRound,
        sport: p.sport,
        wingspan: p.wingspan,
        standingReach: p.standingReach,
        vertical: p.vertical,
        laneAgility: p.laneAgility,
        sprint: p.sprint,
      })));
      await storage.createFreeAgents(nbaFreeAgents2026);
      await storage.createDraftOrderEntries(nbaDraftOrder2026);
      await storage.createRosterPlayers(nbaRosters2026);
      res.json({ message: "NBA data reseeded successfully", prospects: nbaProspects2026.length, teams: nbaTeams2026.length, freeAgents: nbaFreeAgents2026.length, roster: nbaRosters2026.length });
  }));

  app.post("/api/reseed-prospects", asyncHandler(async (_req, res) => {
      await db.delete(prospects);
      await storage.createProspects(prospects2026);
      res.json({ message: "Prospects refreshed successfully with ETR + consensus big board data", count: prospects2026.length });
  }));

  app.post("/api/reseed-roster", asyncHandler(async (_req, res) => {
      await db.delete(rosterPlayers);
      await storage.createRosterPlayers(nflRosters2026);
      res.json({ message: "Roster data refreshed successfully", count: nflRosters2026.length });
  }));

  // ===== Sportradar Live Draft Routes =====

  app.get("/api/draft/:year/prospects", asyncHandler(async (req, res) => {
      const year = parseInt(req.params.year);
      const data = await draftLiveService.fetchOnDemand(year, "prospects");
      res.json(data);
  }));

  app.get("/api/draft/:year/top-prospects", asyncHandler(async (req, res) => {
      const year = parseInt(req.params.year);
      const data = await draftLiveService.fetchOnDemand(year, "top-prospects");
      res.json(data);
  }));

  app.get("/api/draft/:year/summary", asyncHandler(async (req, res) => {
      const year = parseInt(req.params.year);
      const data = await draftLiveService.fetchOnDemand(year, "summary");
      res.json(data);
  }));

  app.get("/api/draft/:year/trades", asyncHandler(async (req, res) => {
      const year = parseInt(req.params.year);
      const data = await draftLiveService.fetchOnDemand(year, "trades");
      res.json(data);
  }));

  app.get("/api/draft/:year/live", asyncHandler(async (req, res) => {
    const year = parseInt(req.params.year);
    const payload = draftLiveService.getLivePayload(year);
    res.json(payload);
  }));

  app.post("/api/draft/:year/start-live", asyncHandler(async (req, res) => {
    const year = parseInt(req.params.year);
    await draftLiveService.startLive(year);
    res.json({ message: `Live polling started for ${year}`, year });
  }));

  app.post("/api/draft/:year/stop-live", asyncHandler(async (_req, res) => {
    draftLiveService.stopLive();
    res.json({ message: "Live polling stopped" });
  }));

  app.get("/api/draft/status", asyncHandler(async (_req, res) => {
    const activeYear = draftLiveService.getActiveYear();
    res.json({ activeYear, isLive: activeYear !== null });
  }));

  // ===== Draft Session Routes =====

  app.post("/api/draft-sessions", asyncHandler(async (_req, res) => {
      const code = generateCode();
      const session = await storage.createDraftSession({
        code,
        status: "waiting",
        rounds: 1,
        currentPickIndex: 0,
        teamControllers: {},
        picks: [],
        availablePlayerIds: [],
      });
      res.json(session);
  }));

  app.get("/api/draft-sessions/:code", asyncHandler(async (req, res) => {
      const session = await storage.getDraftSessionByCode(req.params.code);
      if (!session) throw new NotFoundError("Session not found");
      res.json(session);
  }));

  setupDraftSessionWS(httpServer);

  // ===== Trade Machine Routes =====

  app.get("/api/cap-settings", asyncHandler(async (req, res) => {
    const sport = (req.query.sport as string) || "NBA";
    const settings = await storage.getCapSettings(sport);
    if (settings.length === 0) {
      const defaults = [];
      for (let y = 2025; y <= 2031; y++) {
        defaults.push({ year: y, sport, ...getDefaultCapSettings(y) });
      }
      res.json(defaults);
    } else {
      res.json(settings);
    }
  }));

  const capSettingsBodySchema = z.object({
    salaryCap: z.number().optional(),
    taxLine: z.number().optional(),
    firstApron: z.number().optional(),
    secondApron: z.number().optional(),
    minSalary: z.number().optional(),
    maxSalary: z.number().optional(),
  });

  const tradeValidateSchema = z.object({
    teams: z.array(z.object({
      teamCode: z.string(),
      currentSalary: z.number(),
      capSpace: z.number(),
      rosterSize: z.number(),
      playersOut: z.array(z.object({ id: z.number(), name: z.string(), salary: z.number() })),
      playersIn: z.array(z.object({ id: z.number(), name: z.string(), salary: z.number() })),
      picksOut: z.array(z.object({ id: z.number(), description: z.string() })),
      picksIn: z.array(z.object({ id: z.number(), description: z.string() })),
    })).min(2).max(4),
    year: z.number().optional(),
  });

  const tradeCreateSchema = z.object({
    name: z.string(),
    sport: z.string().default("NBA"),
    status: z.string().default("draft"),
    legs: z.array(z.any()),
    validationResult: z.any().optional(),
  });

  app.put("/api/cap-settings/:year", asyncHandler(async (req, res) => {
      const year = parseInt(req.params.year);
      const sport = (req.query.sport as string) || "NBA";
      const parsed = capSettingsBodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const { salaryCap, taxLine, firstApron, secondApron, minSalary, maxSalary } = parsed.data;
      const result = await storage.upsertCapSetting({
        year,
        sport,
        salaryCap: salaryCap ?? getDefaultCapSettings(year).salaryCap,
        taxLine: taxLine ?? getDefaultCapSettings(year).taxLine,
        firstApron: firstApron ?? getDefaultCapSettings(year).firstApron,
        secondApron: secondApron ?? getDefaultCapSettings(year).secondApron,
        minSalary: minSalary ?? 1.1,
        maxSalary: maxSalary ?? 51.4,
      });
      res.json(result);
  }));

  app.post("/api/seed-cap-settings", asyncHandler(async (_req, res) => {
      const results = [];
      for (let y = 2025; y <= 2031; y++) {
        const defaults = getDefaultCapSettings(y);
        const result = await storage.upsertCapSetting({
          year: y,
          sport: "NBA",
          salaryCap: defaults.salaryCap,
          taxLine: defaults.taxLine,
          firstApron: defaults.firstApron,
          secondApron: defaults.secondApron,
          minSalary: 1.1,
          maxSalary: 51.4,
        });
        results.push(result);
      }
      res.json({ message: "Cap settings seeded", count: results.length });
  }));

  app.post("/api/trades/validate", asyncHandler(async (req, res) => {
      const parsed = tradeValidateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const { teams: tradeTeams, year = 2026 } = parsed.data;
      const result = validateTrade(tradeTeams as TradeTeamState[], year);
      res.json(result);
  }));

  app.get("/api/trades", asyncHandler(async (req, res) => {
    const sport = (req.query.sport as string) || "NBA";
    const proposals = await storage.getTradeProposals(sport);
    res.json(proposals);
  }));

  app.get("/api/trades/:id", asyncHandler(async (req, res) => {
    const proposal = await storage.getTradeProposal(parseInt(req.params.id));
    if (!proposal) throw new NotFoundError("Trade not found");
    res.json(proposal);
  }));

  app.post("/api/trades", asyncHandler(async (req, res) => {
      const parsed = tradeCreateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const proposal = await storage.createTradeProposal(parsed.data);
      res.json(proposal);
  }));

  app.delete("/api/trades/:id", asyncHandler(async (req, res) => {
      await storage.deleteTradeProposal(parseInt(req.params.id));
      res.json({ success: true });
  }));

  app.post("/api/trades/:id/apply", asyncHandler(async (req, res) => {
      const proposal = await storage.getTradeProposal(parseInt(req.params.id));
      if (!proposal) throw new NotFoundError("Trade not found");
      
      const legs = proposal.legs as any[];
      for (const leg of legs) {
        if (leg.playerIds && leg.playerIds.length > 0) {
          for (const playerId of leg.playerIds) {
            await storage.moveRosterPlayer(playerId, leg.toTeamCode);
          }
        }
      }
      
      await storage.updateTradeProposal(proposal.id, { status: "applied" });
      responseCache.invalidate("roster");
      res.json({ success: true, message: "Trade applied to rosters" });
  }));

  app.put("/api/roster/:id", asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const result = await storage.updateRosterPlayer(id, updates);
      if (!result) throw new NotFoundError("Player not found");
      responseCache.invalidate("roster");
      res.json(result);
  }));

  app.post("/api/roster/move", asyncHandler(async (req, res) => {
      const { playerId, toTeamCode } = req.body;
      const result = await storage.moveRosterPlayer(playerId, toTeamCode);
      if (!result) throw new NotFoundError("Player not found");
      responseCache.invalidate("roster");
      res.json(result);
  }));

  app.post("/api/roster/sync-balldontlie", asyncHandler(async (req, res) => {
      const applyChanges = req.query.apply === "true";
      const allRoster = await storage.getRosterPlayers("NBA");
      const rosterForSync = allRoster.map((p) => ({
        id: p.id,
        name: p.name,
        teamCode: p.teamCode,
        position: p.position,
      }));

      const result = await syncRosterTeams(rosterForSync);

      if (applyChanges && result.updates.length > 0) {
        for (const update of result.updates) {
          const player = allRoster.find((p) => p.name === update.playerName);
          if (player) {
            await storage.moveRosterPlayer(player.id, update.newTeam);
          }
        }
      }

      res.json({
        applied: applyChanges,
        totalPlayers: allRoster.length,
        matched: result.matched,
        updatesNeeded: result.updates.length,
        updates: result.updates,
        notFound: result.notFound,
        errors: result.errors,
      });
  }));

  // ===== Team Builder Save Routes =====
  app.get("/api/team-builder-saves", asyncHandler(async (req, res) => {
    const sport = (req.query.sport as string) || "NFL";
    const saves = await storage.getTeamBuilderSaves(sport);
    res.json(saves);
  }));

  app.get("/api/team-builder-saves/:id", asyncHandler(async (req, res) => {
    const save = await storage.getTeamBuilderSave(parseInt(req.params.id));
    if (!save) throw new NotFoundError("Save not found");
    res.json(save);
  }));

  app.post("/api/team-builder-saves", asyncHandler(async (req, res) => {
      const { name, sport, state } = req.body;
      if (!name || !sport || !state) {
        return res.status(400).json({ error: "name, sport, and state are required" });
      }
      const save = await storage.createTeamBuilderSave({ name, sport, state });
      res.json(save);
  }));

  app.delete("/api/team-builder-saves/:id", asyncHandler(async (req, res) => {
      await storage.deleteTeamBuilderSave(parseInt(req.params.id));
      res.json({ success: true });
  }));

  // ===== NBA Season Stats Routes =====
  app.get("/api/nba-stats", asyncHandler(async (_req, res) => {
      const stats = await storage.getPlayerSeasonStats("NBA");
      res.json(stats);
  }));

  app.post("/api/nba-stats/scrape", asyncHandler(async (_req, res) => {
      const { scrapeNBAPerGameStats } = await import("./nbaStatsScraper");
      const stats = await scrapeNBAPerGameStats();
      await storage.upsertPlayerSeasonStats(stats);
      res.json({ success: true, count: stats.length });
  }));

  app.get("/api/nba-standings", asyncHandler(async (_req, res) => {
      const standings = await storage.getTeamStandings("NBA");
      res.json(standings);
  }));

  app.post("/api/nba-standings/scrape", asyncHandler(async (_req, res) => {
      const { scrapeNBAStandings } = await import("./nbaStandingsScraper");
      const standings = await scrapeNBAStandings();
      await storage.upsertTeamStandings(standings);
      res.json({ success: true, count: standings.length });
  }));

  app.get("/api/college-stats", asyncHandler(async (req, res) => {
      const sport = (req.query.sport as string) || "NBA";
      const stats = await storage.getCollegeStats(sport);
      res.json(stats);
  }));

  app.get("/api/college-stats/:playerName", asyncHandler(async (req, res) => {
      const stats = await storage.getCollegeStatsByPlayer(req.params.playerName);
      res.json(stats);
  }));

  app.post("/api/college-stats/scrape", asyncHandler(async (_req, res) => {
      const allProspects = await storage.getProspects("NBA");
      const prospectInfos = allProspects
        .filter(p => p.college && p.college !== "International" && p.college !== "N/A")
        .map(p => ({ name: p.name, college: p.college! }));
      const { scrapeCollegeStats } = await import("./collegeStatsScraper");
      const stats = await scrapeCollegeStats(prospectInfos);
      await storage.upsertCollegeStats(stats);
      res.json({ success: true, count: stats.length });
  }));

  return httpServer;
}
