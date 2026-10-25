import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { adminApiError, requireAdminApi } from "@/lib/server/requireAdminApi";
import { decryptProviderSecret } from "@/lib/server/providerSecrets";
import { fetchProviderEvents, type NormalizedSportsEvent, type SportsProviderConfig } from "@/lib/server/sportsProviders";

const actionSchema = z.object({ action: z.enum(["test", "sync"]) });

function ingestionPayload(value: NormalizedSportsEvent) {
  return {
    provider_id: value.providerId,
    provider_event_id: value.providerEventId,
    sport_name: value.sport.name,
    sport_slug: value.sport.slug,
    sport_icon: value.sport.icon || null,
    league_name: value.league.name,
    league_slug: value.league.slug,
    country: value.league.country || null,
    home_team: value.homeTeam,
    away_team: value.awayTeam,
    start_time: value.startTime,
    status: value.status,
    home_score: value.homeScore ?? null,
    away_score: value.awayScore ?? null,
    live_minute: value.liveMinute ?? null,
    resume_markets: false,
    markets: value.markets,
  };
}

export async function syncProvider(admin: any, provider: SportsProviderConfig, action: "test" | "sync") {
  const startedAt = Date.now();
  try {
    const apiKey = decryptProviderSecret(provider.encrypted_api_key);
    const events = await fetchProviderEvents(provider, apiKey);
    if (action === "sync") {
      for (const event of events) {
        const { error } = await admin.rpc("ingest_sports_feed_event", {
          p_update_id: event.updateId,
          p_payload: ingestionPayload(event),
        });
        if (error) throw error;
      }
    }
    const now = new Date().toISOString();
    await admin.from("sports_feed_providers").update({
      status: "healthy",
      last_sync_at: action === "sync" ? now : undefined,
      last_success_at: now,
      last_error: null,
      last_event_count: events.length,
      updated_at: now,
    }).eq("id", provider.id);
    return {
      ok: true,
      eventCount: events.length,
      latencyMs: Date.now() - startedAt,
      sample: events.slice(0, 3).map((event) => ({
        providerEventId: event.providerEventId,
        event: `${event.homeTeam} vs ${event.awayTeam}`,
        league: event.league.name,
        status: event.status,
        score: event.homeScore === null || event.homeScore === undefined ? null : `${event.homeScore}-${event.awayScore ?? 0}`,
        startTime: event.startTime,
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Provider request failed";
    await admin.from("sports_feed_providers").update({ status: "error", last_error: message, updated_at: new Date().toISOString() }).eq("id", provider.id);
    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const parsedId = z.string().uuid().safeParse(req.query.id);
    const parsedAction = actionSchema.safeParse(req.body);
    if (!parsedId.success || !parsedAction.success) return res.status(400).json({ error: "Invalid provider action" });
    const { admin, user } = await requireAdminApi(req, "sports");
    const { data, error } = await (admin as any).from("sports_feed_providers").select("*").eq("id", parsedId.data).single();
    if (error || !data) return res.status(404).json({ error: "Provider not found" });
    if (parsedAction.data.action === "sync" && !data.is_enabled) return res.status(409).json({ error: "Enable the provider before syncing" });

    const result = await syncProvider(admin as any, data as SportsProviderConfig, parsedAction.data.action);
    await (admin as any).from("audit_logs").insert({
      admin_id: user.id,
      action: `sports_provider_${parsedAction.data.action}`,
      entity_type: "sports_provider",
      entity_id: data.id,
      changes: { event_count: result.eventCount, latency_ms: result.latencyMs },
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error("Sports provider action failed", error);
    const result = adminApiError(error);
    return res.status(result.statusCode === 500 ? 502 : result.statusCode).json({ error: result.statusCode === 500 && error instanceof Error ? error.message : result.message });
  }
}

