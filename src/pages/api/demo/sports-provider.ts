import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { fetchProviderEvents, type SportsProviderConfig } from "@/lib/server/sportsProviders";

const querySchema = z.object({
  source: z.enum(["thesportsdb", "openligadb"]).default("thesportsdb"),
  leagueId: z.string().regex(/^\d+$/).max(20).default("4328"),
  leagueShortcut: z.string().regex(/^[a-z0-9_-]{2,30}$/i).default("bl1"),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (process.env.NEXT_PUBLIC_ENABLE_DEMO_BACKEND !== "true") {
    return res.status(404).json({ error: "Demo sports provider is disabled" });
  }
  const parsed = querySchema.safeParse({
    source: Array.isArray(req.query.source) ? req.query.source[0] : req.query.source,
    leagueId: Array.isArray(req.query.leagueId) ? req.query.leagueId[0] : req.query.leagueId,
    leagueShortcut: Array.isArray(req.query.leagueShortcut) ? req.query.leagueShortcut[0] : req.query.leagueShortcut,
  });
  if (!parsed.success) return res.status(400).json({ error: "Invalid league id" });

  try {
    const provider: SportsProviderConfig = {
      id: parsed.data.source === "openligadb" ? "demo-openligadb-provider" : "demo-thesportsdb-provider",
      name: parsed.data.source === "openligadb" ? "OpenLigaDB Bundesliga Live Scores" : "TheSportsDB Demo Schedule",
      provider_type: parsed.data.source === "openligadb" ? "openligadb" : "thesportsdb_demo",
      settings: parsed.data.source === "openligadb" ? { leagueShortcut: parsed.data.leagueShortcut, sport: "Soccer" } : { leagueId: parsed.data.leagueId, sport: "Soccer" },
      is_enabled: true,
      is_demo: true,
    };
    const events = await fetchProviderEvents(provider, null);
    return res.status(200).json({ events, source: parsed.data.source === "openligadb" ? "OpenLigaDB public score API" : "TheSportsDB free development API" });
  } catch (error) {
    console.error("Demo sports provider failed", error);
    return res.status(502).json({ error: error instanceof Error ? error.message : "Demo provider failed" });
  }
}

