import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { storage } from "./storage";
import { log } from "./index";

interface SessionClient {
  ws: WebSocket;
  sessionCode: string;
}

const clients: SessionClient[] = [];

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function broadcastToSession(sessionCode: string, message: object) {
  const payload = JSON.stringify(message);
  clients.forEach((c) => {
    if (c.sessionCode === sessionCode && c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(payload);
    }
  });
}

function getSessionClientCount(sessionCode: string): number {
  return clients.filter(
    (c) => c.sessionCode === sessionCode && c.ws.readyState === WebSocket.OPEN,
  ).length;
}

export function setupDraftSessionWS(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws/draft" });

  wss.on("connection", (ws) => {
    let client: SessionClient | null = null;

    ws.on("message", async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === "join") {
          const code = msg.code as string;
          const session = await storage.getDraftSessionByCode(code);
          if (!session) {
            ws.send(JSON.stringify({ type: "error", message: "Session not found" }));
            return;
          }
          client = { ws, sessionCode: code };
          clients.push(client);
          ws.send(
            JSON.stringify({
              type: "session_state",
              session,
              clients: getSessionClientCount(code),
            }),
          );
          broadcastToSession(code, {
            type: "client_count",
            clients: getSessionClientCount(code),
          });
        }

        if (msg.type === "pick" && client) {
          const session = await storage.getDraftSessionByCode(
            client.sessionCode,
          );
          if (!session || session.status !== "active") return;

          const currentPicks = session.picks as any[];
          const pick = msg.pick;
          const newPicks = [...currentPicks, pick];
          const usedPlayerIds = new Set(newPicks.map((p: any) => p.player?.id));
          const currentAvailable = (session.availablePlayerIds as string[]).filter(
            (id) => !usedPlayerIds.has(id),
          );

          const updated = await storage.updateDraftSession(
            client.sessionCode,
            {
              picks: newPicks,
              currentPickIndex: session.currentPickIndex + 1,
              availablePlayerIds: currentAvailable,
            },
          );

          if (updated) {
            broadcastToSession(client.sessionCode, {
              type: "pick_made",
              pick,
              session: updated,
            });
          }
        }

        if (msg.type === "sim_pick" && client) {
          const session = await storage.getDraftSessionByCode(
            client.sessionCode,
          );
          if (!session || session.status !== "active") return;

          const currentPicks = session.picks as any[];
          const pick = msg.pick;
          const newPicks = [...currentPicks, pick];
          const usedPlayerIds = new Set(newPicks.map((p: any) => p.player?.id));
          const currentAvailable = (session.availablePlayerIds as string[]).filter(
            (id) => !usedPlayerIds.has(id),
          );

          const newIndex = session.currentPickIndex + 1;
          const totalSlots = session.rounds * 32;
          const status =
            newIndex >= totalSlots || currentAvailable.length === 0
              ? "completed"
              : "active";

          const updated = await storage.updateDraftSession(
            client.sessionCode,
            {
              picks: newPicks,
              currentPickIndex: newIndex,
              availablePlayerIds: currentAvailable,
              status,
            },
          );

          if (updated) {
            broadcastToSession(client.sessionCode, {
              type: "pick_made",
              pick,
              session: updated,
            });
          }
        }

        if (msg.type === "start_draft" && client) {
          const updated = await storage.updateDraftSession(
            client.sessionCode,
            {
              status: "active",
              teamControllers: msg.teamControllers,
              rounds: msg.rounds,
              availablePlayerIds: msg.availablePlayerIds,
              picks: [],
              currentPickIndex: 0,
            },
          );
          if (updated) {
            broadcastToSession(client.sessionCode, {
              type: "draft_started",
              session: updated,
            });
          }
        }

        if (msg.type === "reset_draft" && client) {
          const session = await storage.getDraftSessionByCode(
            client.sessionCode,
          );
          if (!session) return;
          const updated = await storage.updateDraftSession(
            client.sessionCode,
            {
              status: "waiting",
              picks: [],
              currentPickIndex: 0,
              availablePlayerIds: [],
            },
          );
          if (updated) {
            broadcastToSession(client.sessionCode, {
              type: "draft_reset",
              session: updated,
            });
          }
        }
      } catch (err: any) {
        log(`WS error: ${err.message}`, "ws");
      }
    });

    ws.on("close", () => {
      if (client) {
        const idx = clients.indexOf(client);
        if (idx !== -1) clients.splice(idx, 1);
        broadcastToSession(client.sessionCode, {
          type: "client_count",
          clients: getSessionClientCount(client.sessionCode),
        });
      }
    });
  });

  return wss;
}

export { generateCode };
