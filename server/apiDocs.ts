import type { Express } from "express";

interface EndpointDoc {
  method: string;
  path: string;
  description: string;
  queryParams?: { name: string; type: string; required: boolean; description: string }[];
  bodySchema?: string;
  response?: string;
  category: string;
}

const endpoints: EndpointDoc[] = [
  { method: "GET", path: "/api/prospects", description: "Get draft prospects filtered by sport and year", queryParams: [
    { name: "sport", type: "NFL | NBA", required: false, description: "Sport filter (default: NFL)" },
    { name: "year", type: "number", required: false, description: "Draft year filter" },
  ], response: "Prospect[]", category: "Prospects & Draft" },
  { method: "GET", path: "/api/teams", description: "Get all teams for a sport", queryParams: [
    { name: "sport", type: "NFL | NBA", required: false, description: "Sport filter (default: NFL)" },
  ], response: "Team[]", category: "Teams" },
  { method: "GET", path: "/api/teams/:code", description: "Get a single team by code", queryParams: [
    { name: "sport", type: "NFL | NBA", required: false, description: "Sport filter (default: NFL)" },
  ], response: "Team", category: "Teams" },
  { method: "GET", path: "/api/free-agents", description: "Get free agents", queryParams: [
    { name: "sport", type: "NFL | NBA", required: false, description: "Sport filter (default: NFL)" },
  ], response: "FreeAgent[]", category: "Teams" },
  { method: "GET", path: "/api/roster", description: "Get roster players", queryParams: [
    { name: "sport", type: "NFL | NBA", required: false, description: "Sport filter (default: NFL)" },
    { name: "team", type: "string", required: false, description: "Team code filter" },
  ], response: "RosterPlayer[]", category: "Teams" },
  { method: "GET", path: "/api/draft-order", description: "Get draft order", queryParams: [
    { name: "sport", type: "NFL | NBA", required: false, description: "Sport filter (default: NFL)" },
    { name: "year", type: "number", required: false, description: "Draft year filter" },
  ], response: "DraftOrder[]", category: "Prospects & Draft" },
  { method: "GET", path: "/api/mock-drafts", description: "List all mock drafts", queryParams: [
    { name: "sport", type: "NFL | NBA", required: false, description: "Sport filter (default: NFL)" },
  ], response: "MockDraft[]", category: "Mock Drafts" },
  { method: "GET", path: "/api/mock-drafts/:id", description: "Get a specific mock draft with picks", response: "MockDraft & { picks: MockPick[] }", category: "Mock Drafts" },
  { method: "POST", path: "/api/mock-drafts", description: "Create a new mock draft", bodySchema: "{ name: string, year?: number, method?: string, rounds?: number, teamScope?: string, sport?: string, picks?: MockPick[] }", response: "MockDraft & { picks: MockPick[] }", category: "Mock Drafts" },
  { method: "DELETE", path: "/api/mock-drafts/:id", description: "Delete a mock draft", response: "204 No Content", category: "Mock Drafts" },
  { method: "GET", path: "/api/historical-performance", description: "Get historical draft pick performance data", queryParams: [
    { name: "sport", type: "NFL | NBA", required: false, description: "Sport filter (default: NFL)" },
  ], response: "HistoricalPerformance[]", category: "Analysis" },
  { method: "GET", path: "/api/cap-settings", description: "Get salary cap settings", queryParams: [
    { name: "sport", type: "NFL | NBA", required: false, description: "Sport filter (default: NBA)" },
  ], response: "CapSetting[]", category: "Trade Machine" },
  { method: "PUT", path: "/api/cap-settings/:year", description: "Update cap settings for a year", bodySchema: "{ salaryCap?: number, taxLine?: number, firstApron?: number, secondApron?: number, minSalary?: number, maxSalary?: number }", response: "CapSetting", category: "Trade Machine" },
  { method: "POST", path: "/api/trades/validate", description: "Validate a trade proposal against CBA rules", bodySchema: "{ teams: TradeTeamState[] (2-4 teams), year?: number }", response: "TradeValidationResult", category: "Trade Machine" },
  { method: "GET", path: "/api/trades", description: "List trade proposals", queryParams: [
    { name: "sport", type: "NFL | NBA", required: false, description: "Sport filter (default: NBA)" },
  ], response: "TradeProposal[]", category: "Trade Machine" },
  { method: "POST", path: "/api/trades", description: "Create a trade proposal", bodySchema: "{ name: string, sport?: string, status?: string, legs: TradeLeg[], validationResult?: object }", response: "TradeProposal", category: "Trade Machine" },
  { method: "DELETE", path: "/api/trades/:id", description: "Delete a trade proposal", response: "{ success: true }", category: "Trade Machine" },
  { method: "POST", path: "/api/trades/:id/apply", description: "Execute an accepted trade, updating rosters", response: "{ success: true, message: string }", category: "Trade Machine" },
  { method: "PUT", path: "/api/roster/:id", description: "Update a roster player", bodySchema: "Partial<RosterPlayer>", response: "RosterPlayer", category: "Teams" },
  { method: "POST", path: "/api/roster/move", description: "Move a player to a different team", bodySchema: "{ playerId: number, toTeamCode: string }", response: "RosterPlayer", category: "Teams" },
  { method: "GET", path: "/api/team-builder-saves", description: "List team builder saves", queryParams: [
    { name: "sport", type: "NFL | NBA", required: false, description: "Sport filter (default: NFL)" },
  ], response: "TeamBuilderSave[]", category: "Team Builder" },
  { method: "POST", path: "/api/team-builder-saves", description: "Save team builder state", bodySchema: "{ name: string, sport: string, state: object }", response: "TeamBuilderSave", category: "Team Builder" },
  { method: "DELETE", path: "/api/team-builder-saves/:id", description: "Delete a team builder save", response: "{ success: true }", category: "Team Builder" },
  { method: "GET", path: "/api/nba-stats", description: "Get NBA season player statistics", response: "PlayerSeasonStats[]", category: "Stats" },
  { method: "POST", path: "/api/nba-stats/scrape", description: "Trigger NBA stats scrape from Basketball Reference", response: "{ success: true, count: number }", category: "Stats" },
  { method: "GET", path: "/api/nba-standings", description: "Get NBA team standings", response: "TeamStandings[]", category: "Stats" },
  { method: "POST", path: "/api/nba-standings/scrape", description: "Trigger NBA standings scrape", response: "{ success: true, count: number }", category: "Stats" },
  { method: "GET", path: "/api/college-stats", description: "Get college basketball stats for NBA prospects", queryParams: [
    { name: "sport", type: "NFL | NBA", required: false, description: "Sport filter (default: NBA)" },
  ], response: "CollegeStats[]", category: "Stats" },
  { method: "POST", path: "/api/college-stats/scrape", description: "Trigger college stats scrape from Sports Reference", response: "{ success: true, count: number }", category: "Stats" },
];

export function registerApiDocs(app: Express) {
  app.get("/api/docs", (_req, res) => {
    const grouped: Record<string, EndpointDoc[]> = {};
    for (const ep of endpoints) {
      if (!grouped[ep.category]) grouped[ep.category] = [];
      grouped[ep.category].push(ep);
    }
    res.json({
      title: "DEGEN GM API Documentation",
      version: "1.0.0",
      description: "Multi-sport Draft Analysis Dashboard API",
      baseUrl: "/api",
      categories: grouped,
    });
  });

  app.get("/api/docs/html", (_req, res) => {
    const grouped: Record<string, EndpointDoc[]> = {};
    for (const ep of endpoints) {
      if (!grouped[ep.category]) grouped[ep.category] = [];
      grouped[ep.category].push(ep);
    }

    const methodColors: Record<string, string> = {
      GET: "#61affe",
      POST: "#49cc90",
      PUT: "#fca130",
      DELETE: "#f93e3e",
    };

    let html = `<!DOCTYPE html><html><head><title>DEGEN GM API Docs</title>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #1a1a2e; color: #e0e0e0; padding: 2rem; }
  h1 { color: #00d4ff; margin-bottom: 0.5rem; font-size: 2rem; }
  .subtitle { color: #888; margin-bottom: 2rem; }
  h2 { color: #00d4ff; margin: 2rem 0 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #333; }
  .endpoint { background: #16213e; border-radius: 8px; margin-bottom: 0.75rem; padding: 1rem 1.25rem; }
  .endpoint-header { display: flex; align-items: center; gap: 0.75rem; }
  .method { padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 0.85rem; color: #fff; min-width: 60px; text-align: center; }
  .path { font-family: monospace; font-size: 1rem; color: #fff; }
  .desc { color: #aaa; margin-top: 0.5rem; font-size: 0.9rem; }
  .params { margin-top: 0.75rem; }
  .params-title { font-size: 0.8rem; color: #00d4ff; text-transform: uppercase; margin-bottom: 0.25rem; }
  .param { font-size: 0.85rem; padding: 0.25rem 0; color: #ccc; }
  .param code { background: #0a0a1a; padding: 2px 6px; border-radius: 3px; color: #00d4ff; }
  .response { margin-top: 0.5rem; font-size: 0.85rem; color: #888; }
  .response code { color: #49cc90; }
</style></head><body>
<h1>DEGEN GM API</h1>
<p class="subtitle">Multi-sport Draft Analysis Dashboard - v1.0.0</p>`;

    for (const [category, eps] of Object.entries(grouped)) {
      html += `<h2>${category}</h2>`;
      for (const ep of eps) {
        const color = methodColors[ep.method] || "#888";
        html += `<div class="endpoint">
          <div class="endpoint-header">
            <span class="method" style="background:${color}">${ep.method}</span>
            <span class="path">${ep.path}</span>
          </div>
          <div class="desc">${ep.description}</div>`;
        if (ep.queryParams && ep.queryParams.length > 0) {
          html += `<div class="params"><div class="params-title">Query Parameters</div>`;
          for (const p of ep.queryParams) {
            html += `<div class="param"><code>${p.name}</code> (${p.type}${p.required ? ', required' : ''}) - ${p.description}</div>`;
          }
          html += `</div>`;
        }
        if (ep.bodySchema) {
          html += `<div class="params"><div class="params-title">Request Body</div><div class="param"><code>${ep.bodySchema}</code></div></div>`;
        }
        if (ep.response) {
          html += `<div class="response">Response: <code>${ep.response}</code></div>`;
        }
        html += `</div>`;
      }
    }

    html += `</body></html>`;
    res.type('html').send(html);
  });
}
