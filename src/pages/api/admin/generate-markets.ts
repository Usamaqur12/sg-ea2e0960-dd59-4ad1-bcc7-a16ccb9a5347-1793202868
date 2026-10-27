import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { requireAdminApi } from "@/lib/server/requireAdminApi";
import { generateMarketsForMatch } from "@/services/mockMarketsService";

const bodySchema = z.object({
  eventId: z.string().uuid().optional(),
  generateForAll: z.boolean().optional(),
  includeAdvanced: z.boolean().default(true),
});

const MARKET_TYPE_MAP: Record<string, string> = {
  "match-result": "match_result",
  "over-under-2.5": "over_under",
  "both-teams-to-score": "both_teams_score",
  "double-chance": "double_chance",
  "correct-score": "correct_score",
  "total-goals": "total_goals",
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const adminAuth = await requireAdminApi(req, res);
  if (!adminAuth) return;

  if (!hasAccess(adminAuth.adminRole, "sports_management")) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  const { eventId } = req.body;
  if (!eventId) {
    return res.status(400).json({ error: "eventId is required" });
  }

  try {
    const result = await generateMockMarkets(eventId, adminAuth.userId);
  } catch (error) {
    console.error("Generate markets error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to generate markets",
    });
  }
}