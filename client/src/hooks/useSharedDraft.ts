import { useState, useEffect, useRef, useCallback } from "react";
import type { DraftSession } from "@shared/schema";

interface SharedDraftState {
  session: DraftSession | null;
  clientCount: number;
  connected: boolean;
  error: string | null;
}

export function useSharedDraft(sessionCode: string | null) {
  const [state, setState] = useState<SharedDraftState>({
    session: null,
    clientCount: 0,
    connected: false,
    error: null,
  });
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!sessionCode) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/draft`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", code: sessionCode }));
      setState((s) => ({ ...s, connected: true, error: null }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "session_state") {
          setState((s) => ({
            ...s,
            session: msg.session,
            clientCount: msg.clients || s.clientCount,
          }));
        }

        if (msg.type === "client_count") {
          setState((s) => ({ ...s, clientCount: msg.clients }));
        }

        if (
          msg.type === "pick_made" ||
          msg.type === "draft_started" ||
          msg.type === "draft_reset"
        ) {
          setState((s) => ({
            ...s,
            session: msg.session,
          }));
        }

        if (msg.type === "error") {
          setState((s) => ({ ...s, error: msg.message }));
        }
      } catch {}
    };

    ws.onclose = () => {
      setState((s) => ({ ...s, connected: false }));
      reconnectTimer.current = setTimeout(() => connect(), 2000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [sessionCode]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendPick = useCallback(
    (pick: any) => {
      wsRef.current?.send(JSON.stringify({ type: "pick", pick }));
    },
    [],
  );

  const sendSimPick = useCallback(
    (pick: any) => {
      wsRef.current?.send(JSON.stringify({ type: "sim_pick", pick }));
    },
    [],
  );

  const startDraft = useCallback(
    (teamControllers: any, rounds: number, availablePlayerIds: string[]) => {
      wsRef.current?.send(
        JSON.stringify({
          type: "start_draft",
          teamControllers,
          rounds,
          availablePlayerIds,
        }),
      );
    },
    [],
  );

  const resetDraft = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "reset_draft" }));
  }, []);

  return {
    ...state,
    sendPick,
    sendSimPick,
    startDraft,
    resetDraft,
  };
}
