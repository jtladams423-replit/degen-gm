import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { requestId, errorHandler } from "./middleware";
import { logger } from "./logger";
import { metrics } from "./metrics";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export const log = (message: string, source = "express") => logger.info(message, { source });

app.use(requestId);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      logger.request(req.method, path, res.statusCode, duration, (req as any).id);
    }
    metrics.record({ method: req.method, path, statusCode: res.statusCode, duration, timestamp: Date.now() });
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    async () => {
      log(`serving on port ${port}`);

      try {
        const { startScheduler } = await import("./scheduler");
        startScheduler();
      } catch (err: any) {
        log("Scheduler startup error: " + err.message);
      }

      try {
        const { storage } = await import("./storage");
        const existingTeams = await storage.getTeams("NFL");
        if (existingTeams.length === 0) {
          log("No NFL data found, auto-seeding database...");
          const seedRes = await fetch(`http://localhost:${port}/api/seed`, { method: "POST" });
          if (seedRes.ok) {
            log("Database seeded successfully on startup");
          } else {
            log("Auto-seed failed: " + (await seedRes.text()));
          }
        }
        const existingRoster = await storage.getRosterPlayers("NFL");
        if (existingRoster.length === 0) {
          log("No roster data found, seeding roster...");
          const rosterRes = await fetch(`http://localhost:${port}/api/reseed-roster`, { method: "POST" });
          if (rosterRes.ok) {
            log("Roster data seeded successfully on startup");
          } else {
            log("Roster auto-seed failed: " + (await rosterRes.text()));
          }
        }
        const existingNbaTeams = await storage.getTeams("NBA");
        if (existingNbaTeams.length === 0) {
          log("No NBA data found, auto-seeding NBA...");
          const nbaRes = await fetch(`http://localhost:${port}/api/seed-nba`, { method: "POST" });
          if (nbaRes.ok) {
            log("NBA data seeded successfully on startup");
          } else {
            log("NBA auto-seed failed: " + (await nbaRes.text()));
          }
        } else {
          const nbaDraftOrder = await storage.getDraftOrder("NBA");
          const needsReseed = nbaDraftOrder.length > 0 && !nbaDraftOrder.find(d => d.originalTeamCode);
          if (needsReseed) {
            log("NBA draft order outdated (missing originalTeamCode), reseeding...");
            const nbaRes = await fetch(`http://localhost:${port}/api/reseed-nba`, { method: "POST" });
            if (nbaRes.ok) {
              log("NBA data reseeded successfully on startup");
            } else {
              log("NBA reseed failed: " + (await nbaRes.text()));
            }
          }
        }
      } catch (err: any) {
        log("Auto-seed check error: " + err.message);
      }
    },
  );
})();
