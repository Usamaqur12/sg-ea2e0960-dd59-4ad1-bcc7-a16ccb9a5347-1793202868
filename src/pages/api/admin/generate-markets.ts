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
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { admin, user } = await requireAdminApi(req, "sports");
    const parsed = bodySchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error });
    }

    const { eventId, generateForAll, includeAdvanced } = parsed.data;

    // Get events without markets
    let eventsQuery = (admin as any)
      .from("events")
      .select(`
        id,
        home_team,
        away_team,
        status,
        league_id,
        leagues!inner(name)
      `)
      .in("status", ["upcoming", "live"]);

    if (eventId) {
      eventsQuery = eventsQuery.eq("id", eventId);
    } else if (!generateForAll) {
      return res.status(400).json({ error: "Provide eventId or set generateForAll=true" });
    }

    const { data: events, error: eventsError } = await eventsQuery;

    if (eventsError) throw eventsError;
    if (!events || events.length === 0) {
      return res.status(404).json({ error: "No eligible events found" });
    }

    let createdMarketsCount = 0;
    let createdOddsCount = 0;
    const errors: string[] = [];

    for (const event of events) {
      try {
        // Check if event already has markets
        const { data: existingMarkets } = await (admin as any)
          .from("markets")
          .select("id")
          .eq("event_id", event.id)
          .limit(1);

        if (existingMarkets && existingMarkets.length > 0) {
          continue; // Skip events that already have markets
        }

        // Generate markets
        const generatedMarkets = generateMarketsForMatch(
          event.home_team,
          event.away_team,
          event.leagues?.name,
          includeAdvanced
        );

        // Insert markets and odds
        for (const market of generatedMarkets) {
          const marketType = MARKET_TYPE_MAP[market.slug] || "match_result";

          // Insert market
          const { data: insertedMarket, error: marketError } = await (admin as any)
            .from("markets")
            .insert({
              event_id: event.id,
              name: market.name,
              type: marketType,
              status: event.status === "live" ? "active" : "active",
              line: market.slug.includes("over-under") ? 2.5 : null,
            })
            .select("id")
            .single();

          if (marketError) {
            errors.push(`Market creation failed for ${event.home_team} vs ${event.away_team}: ${marketError.message}`);
            continue;
          }

          createdMarketsCount++;

          // Insert odds for this market
          const oddsToInsert = market.outcomes.map((outcome) => ({
            market_id: insertedMarket.id,
            selection: outcome.name,
            value: outcome.odds,
            is_active: true,
            is_locked: false,
          }));

          const { error: oddsError } = await (admin as any)
            .from("odds")
            .insert(oddsToInsert);

          if (oddsError) {
            errors.push(`Odds creation failed for market ${market.name}: ${oddsError.message}`);
          } else {
            createdOddsCount += oddsToInsert.length;
          }
        }
      } catch (eventError) {
        errors.push(`Event ${event.id} processing failed: ${String(eventError)}`);
      }
    }

    // Log audit trail
    await (admin as any).from("audit_logs").insert({
      admin_id: user.id,
      action: "generate_mock_markets",
      entity_type: "markets",
      entity_id: null,
      changes: {
        events_processed: events.length,
        markets_created: createdMarketsCount,
        odds_created: createdOddsCount,
        errors: errors.length,
      },
    });

    return res.status(200).json({
      success: true,
      eventsProcessed: events.length,
      marketsCreated: createdMarketsCount,
      oddsCreated: createdOddsCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Generate markets error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to generate markets",
    });
  }
}