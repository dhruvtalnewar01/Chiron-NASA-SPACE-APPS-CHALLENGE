// ---------------------------------------------------------------------------
// CHIRON v2.0 - useChironAPI Hook
// WebSocket + REST communication layer for all backend endpoints.
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef, useCallback } from "react";

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

export interface AxisScore {
  axis_id: string;
  label: string;
  score: number | null;
  provenance: "REAL" | "SIMULATED" | "DERIVED" | "ABSTAIN";
  confidence_interval: [number, number] | null;
  updated_at: string;
}

export interface OrbitalWindow {
  t_crit_hours: number;
  t_evac_hours: number;
  t_margin_hours: number;
  window_status: "OPEN" | "NARROWING" | "CRITICAL" | "CLOSED";
  trajectory_type: "LEO" | "LUNAR_NRHO" | "MARS_TRANSIT";
  delta_v_budget_mps: number;
  reentry_site: string | null;
}

export interface VitalSign {
  metric_id: string;
  label: string;
  value: number;
  unit: string;
  provenance: "REAL" | "SIMULATED" | "DERIVED" | "ABSTAIN";
  timestamp: string;
}

export interface TwinState {
  crew_member_id: string;
  crew_member_name: string;
  mission_elapsed_time_hours: number;
  ari_score?: number;
  axes: AxisScore[];
  orbital_window: OrbitalWindow | null;
  vitals: VitalSign[];
  overall_status: "NOMINAL" | "WATCH" | "CAUTION" | "WARNING" | "EMERGENCY";
  last_updated: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
  axis_id: string | null;
}

export interface ChironAPIState {
  twinState: TwinState | null;
  isConnected: boolean;
  connectionError: string | null;
  lastMessageAt: number | null;
}

export interface ChironAPIActions {
  fetchTwinState: (crewId?: string) => Promise<TwinState | null>;
  fetchAuditLog: (limit?: number) => Promise<AuditLogEntry[]>;
  submitCommand: (command: string, payload?: Record<string, unknown>) => Promise<unknown>;
  setSimulatedVital: (metricId: string, value: number) => Promise<void>;
  reconnect: () => void;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const WS_URL = "ws://localhost:8000/ws/telemetry";
const API_BASE = "/api/v1";
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 20;
const HEARTBEAT_INTERVAL_MS = 15000;

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

export function useChironAPI(): ChironAPIState & ChironAPIActions {
  const [twinState, setTwinState] = useState<TwinState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // -----------------------------------------------------------------------
  // REST helpers
  // -----------------------------------------------------------------------

  const apiFetch = useCallback(
    async <T>(
      path: string,
      options?: RequestInit
    ): Promise<T> => {
      const url = `${API_BASE}${path}`;
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(options?.headers || {}),
        },
        ...options,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "unknown error");
        throw new Error(`API ${res.status}: ${body}`);
      }
      return res.json() as Promise<T>;
    },
    []
  );

  const fetchTwinState = useCallback(
    async (crewId?: string): Promise<TwinState | null> => {
      try {
        const path = crewId ? `/twin/${crewId}` : "/twin";
        const data = await apiFetch<TwinState>(path);
        if (mountedRef.current) {
          setTwinState(data);
        }
        return data;
      } catch (err) {
        console.error("[CHIRON API] fetchTwinState failed:", err);
        return null;
      }
    },
    [apiFetch]
  );

  const fetchAuditLog = useCallback(
    async (limit = 50): Promise<AuditLogEntry[]> => {
      try {
        return await apiFetch<AuditLogEntry[]>(
          `/audit?limit=${limit}`
        );
      } catch (err) {
        console.error("[CHIRON API] fetchAuditLog failed:", err);
        return [];
      }
    },
    [apiFetch]
  );

  const submitCommand = useCallback(
    async (
      command: string,
      payload?: Record<string, unknown>
    ): Promise<unknown> => {
      try {
        return await apiFetch<unknown>("/command", {
          method: "POST",
          body: JSON.stringify({ command, payload: payload || {} }),
        });
      } catch (err) {
        console.error("[CHIRON API] submitCommand failed:", err);
        throw err;
      }
    },
    [apiFetch]
  );

  const setSimulatedVital = useCallback(
    async (metricId: string, value: number): Promise<void> => {
      try {
        await apiFetch<void>("/simulate/vital", {
          method: "POST",
          body: JSON.stringify({ metric_id: metricId, value }),
        });
      } catch (err) {
        console.error("[CHIRON API] setSimulatedVital failed:", err);
        throw err;
      }
    },
    [apiFetch]
  );

  // -----------------------------------------------------------------------
  // WebSocket lifecycle
  // -----------------------------------------------------------------------

  const clearTimers = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    clearTimers();

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        console.log("[CHIRON WS] Connected to telemetry stream");
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;

        // Start heartbeat pings
        heartbeatTimer.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, HEARTBEAT_INTERVAL_MS);
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data as string);
          if (data.type === "twin_state" && data.payload) {
            setTwinState(data.payload as TwinState);
            setLastMessageAt(Date.now());
          } else if (data.type === "pong") {
            // heartbeat acknowledged
          }
        } catch (parseErr) {
          console.error("[CHIRON WS] Failed to parse message:", parseErr);
        }
      };

      ws.onerror = (event: Event) => {
        if (!mountedRef.current) return;
        console.error("[CHIRON WS] Error:", event);
        setConnectionError("WebSocket connection error");
      };

      ws.onclose = (event: CloseEvent) => {
        if (!mountedRef.current) return;
        console.log(
          `[CHIRON WS] Closed: code=${event.code} reason=${event.reason}`
        );
        setIsConnected(false);
        clearTimers();

        // Auto-reconnect with exponential backoff
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          const delay =
            RECONNECT_DELAY_MS *
            Math.min(Math.pow(1.5, reconnectAttempts.current), 30);
          reconnectAttempts.current += 1;
          console.log(
            `[CHIRON WS] Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})`
          );
          reconnectTimer.current = setTimeout(() => {
            if (mountedRef.current) {
              connect();
            }
          }, delay);
        } else {
          setConnectionError(
            `Failed to reconnect after ${MAX_RECONNECT_ATTEMPTS} attempts`
          );
        }
      };
    } catch (err) {
      console.error("[CHIRON WS] Failed to create WebSocket:", err);
      setConnectionError("Failed to create WebSocket connection");
    }
  }, [clearTimers]);

  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    setConnectionError(null);
    connect();
  }, [connect]);

  // -----------------------------------------------------------------------
  // Mount / unmount
  // -----------------------------------------------------------------------

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      clearTimers();
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounted");
        wsRef.current = null;
      }
    };
  }, [connect, clearTimers]);

  return {
    twinState,
    isConnected,
    connectionError,
    lastMessageAt,
    fetchTwinState,
    fetchAuditLog,
    submitCommand,
    setSimulatedVital,
    reconnect,
  };
}
