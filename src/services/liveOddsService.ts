import { useState, useEffect, useCallback } from "react";

export interface LiveOdds {
  eventId: string;
  marketId: string;
  odds: number;
  previousOdds?: number;
  trend?: "up" | "down" | "stable";
  lastUpdate: string;
}

export interface LiveEvent {
  id: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  isLive: boolean;
  score?: { home: number; away: number };
  markets: {
    id: string;
    name: string;
    outcomes: Array<{
      id: string;
      name: string;
      odds: number;
      previousOdds?: number;
      trend?: "up" | "down" | "stable";
    }>;
  }[];
}

class LiveOddsWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    
    // In demo mode, simulate WebSocket connection
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      this.simulateDemoConnection();
      return;
    }

    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_ODDS_URL || "wss://demo-odds.primebet.com";
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("[LiveOdds] WebSocket connected");
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.emit("connection", { status: "connected" });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (err) {
          console.error("[LiveOdds] Parse error:", err);
        }
      };

      this.ws.onerror = (error) => {
        console.error("[LiveOdds] WebSocket error:", error);
        this.emit("error", { error: "Connection error" });
      };

      this.ws.onclose = () => {
        console.log("[LiveOdds] WebSocket closed");
        this.isConnecting = false;
        this.stopHeartbeat();
        this.emit("connection", { status: "disconnected" });
        this.attemptReconnect();
      };
    } catch (err) {
      console.error("[LiveOdds] Connection failed:", err);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  private simulateDemoConnection() {
    console.log("[LiveOdds] Demo mode - simulating WebSocket");
    this.isConnecting = false;
    this.emit("connection", { status: "connected" });
    
    // Simulate odds updates every 3-5 seconds
    setInterval(() => {
      this.simulateOddsUpdate();
    }, 3000 + Math.random() * 2000);
  }

  private simulateOddsUpdate() {
    const demoEvents = this.generateDemoEvents();
    demoEvents.forEach(event => {
      this.emit("oddsUpdate", event);
    });
  }

  private generateDemoEvents(): LiveEvent[] {
    const sports = ["Soccer", "Basketball", "Tennis", "Football"];
    const leagues = {
      Soccer: ["Premier League", "La Liga", "Serie A"],
      Basketball: ["NBA", "EuroLeague"],
      Tennis: ["ATP Tour", "WTA Tour"],
      Football: ["NFL", "NCAA"]
    };

    return sports.slice(0, 2).map((sport, idx) => ({
      id: `event-${idx + 1}`,
      sport,
      league: leagues[sport as keyof typeof leagues][0],
      homeTeam: `Team ${String.fromCharCode(65 + idx * 2)}`,
      awayTeam: `Team ${String.fromCharCode(66 + idx * 2)}`,
      startTime: new Date(Date.now() + idx * 3600000).toISOString(),
      isLive: idx === 0,
      score: idx === 0 ? { home: Math.floor(Math.random() * 3), away: Math.floor(Math.random() * 3) } : undefined,
      markets: [
        {
          id: `market-${idx}-1`,
          name: "Match Winner",
          outcomes: [
            {
              id: `outcome-${idx}-1-1`,
              name: `Team ${String.fromCharCode(65 + idx * 2)}`,
              odds: 1.5 + Math.random() * 2,
              previousOdds: 1.6 + Math.random() * 2,
              trend: Math.random() > 0.5 ? "up" : "down"
            },
            {
              id: `outcome-${idx}-1-2`,
              name: "Draw",
              odds: 3.0 + Math.random() * 1,
              previousOdds: 3.1 + Math.random() * 1,
              trend: "stable"
            },
            {
              id: `outcome-${idx}-1-3`,
              name: `Team ${String.fromCharCode(66 + idx * 2)}`,
              odds: 2.0 + Math.random() * 2,
              previousOdds: 2.1 + Math.random() * 2,
              trend: Math.random() > 0.5 ? "up" : "down"
            }
          ]
        }
      ]
    }));
  }

  private handleMessage(data: any) {
    if (data.type === "oddsUpdate") {
      this.emit("oddsUpdate", data.payload);
    } else if (data.type === "eventUpdate") {
      this.emit("eventUpdate", data.payload);
    } else if (data.type === "scoreUpdate") {
      this.emit("scoreUpdate", data.payload);
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("[LiveOdds] Max reconnect attempts reached");
      this.emit("error", { error: "Failed to reconnect" });
      return;
    }

    this.reconnectAttempts++;
    console.log(`[LiveOdds] Reconnecting in ${this.reconnectDelay}ms... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }

  subscribe(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Send subscription to server
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "subscribe", event }));
    }
  }

  unsubscribe(event: string, callback: (data: any) => void) {
    this.listeners.get(event)?.delete(callback);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "unsubscribe", event }));
    }
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error(`[LiveOdds] Listener error for ${event}:`, err);
      }
    });
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }
}

export const liveOddsService = new LiveOddsWebSocketService();

export function useLiveOdds() {
  const [connected, setConnected] = useState(false);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleConnection = (data: any) => {
      setConnected(data.status === "connected");
    };

    const handleOddsUpdate = (event: LiveEvent) => {
      setLiveEvents(prev => {
        const index = prev.findIndex(e => e.id === event.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = event;
          return updated;
        }
        return [...prev, event];
      });
    };

    const handleError = (data: any) => {
      setError(data.error);
    };

    liveOddsService.subscribe("connection", handleConnection);
    liveOddsService.subscribe("oddsUpdate", handleOddsUpdate);
    liveOddsService.subscribe("error", handleError);
    liveOddsService.connect();

    return () => {
      liveOddsService.unsubscribe("connection", handleConnection);
      liveOddsService.unsubscribe("oddsUpdate", handleOddsUpdate);
      liveOddsService.unsubscribe("error", handleError);
    };
  }, []);

  return { connected, liveEvents, error };
}