import cron from "node-cron";

let schedulerStarted = false;

export function startScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  cron.schedule("0 0 * * *", async () => {
    console.log("[scheduler] Starting nightly NBA data scrape (midnight PST)...");

    try {
      const { scrapeNBAPerGameStats } = await import("./nbaStatsScraper");
      const { storage } = await import("./storage");
      const stats = await scrapeNBAPerGameStats();
      await storage.upsertPlayerSeasonStats(stats);
      console.log(`[scheduler] Successfully scraped ${stats.length} player stat lines`);
    } catch (err: any) {
      console.error("[scheduler] Player stats scrape failed:", err.message);
    }

    await new Promise(r => setTimeout(r, 5000));

    try {
      const { scrapeNBAStandings } = await import("./nbaStandingsScraper");
      const { storage } = await import("./storage");
      const standings = await scrapeNBAStandings();
      await storage.upsertTeamStandings(standings);
      console.log(`[scheduler] Successfully scraped ${standings.length} team standings`);
    } catch (err: any) {
      console.error("[scheduler] Standings scrape failed:", err.message);
    }

    await new Promise(r => setTimeout(r, 10000));

    try {
      const { scrapeCollegeStats } = await import("./collegeStatsScraper");
      const { storage } = await import("./storage");
      const allProspects = await storage.getProspects("NBA");
      const prospectInfos = allProspects
        .filter(p => p.college && p.college !== "International" && p.college !== "N/A")
        .map(p => ({ name: p.name, college: p.college! }));
      const collegeData = await scrapeCollegeStats(prospectInfos);
      await storage.upsertCollegeStats(collegeData);
      console.log(`[scheduler] Successfully scraped ${collegeData.length} college stat lines`);
    } catch (err: any) {
      console.error("[scheduler] College stats scrape failed:", err.message);
    }

    console.log("[scheduler] Nightly scrape complete");
  }, {
    timezone: "America/Los_Angeles",
  });

  console.log("[scheduler] Cron job scheduled: NBA stats + standings at midnight PST daily");
}
