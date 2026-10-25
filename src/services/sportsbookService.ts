import { supabase } from "@/integrations/supabase/client";
import type { SportsbookEvent, SportsbookMarket, SportsbookOutcome } from "@/types/sportsbook";

type RawOutcome = {
  id: string;
  market_id: string;
  selection: string;
  value: number;
  is_active: boolean | null;
  is_locked: boolean;
};

type RawMarket = {
  id: string;
  name: string;
  type: string;
  status: string | null;
  odds: RawOutcome[] | null;
};

type RawEvent = {
  id: string;
  home_team: string;
  away_team: string;
  start_time: string;
  status: string | null;
  live_score_home: number | null;
  live_score_away: number | null;
  live_minute: number | null;
  leagues: { name: string } | null;
  sports: { name: string; slug: string };
  markets: RawMarket[] | null;
};

function formatStartTime(startTime: string, isLive: boolean): string {
  if (isLive) return "LIVE";

  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) return "TBA";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeOutcome(raw: RawOutcome): SportsbookOutcome {
  return {
    id: raw.id,
    marketId: raw.market_id,
    selection: raw.selection,
    value: Number(raw.value),
  };
}

function normalizeMarket(raw: RawMarket): SportsbookMarket {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    outcomes: (raw.odds || [])
      .filter((outcome) => outcome.is_active !== false && !outcome.is_locked)
      .map(normalizeOutcome),
  };
}

function findOutcome(market: SportsbookMarket | undefined, name: string) {
  return market?.outcomes.find(
    (outcome) => outcome.selection.trim().toLowerCase() === name.toLowerCase()
  );
}

function normalizeEvent(raw: RawEvent): SportsbookEvent {
  const markets = (raw.markets || [])
    .filter((market) => market.status === "active")
    .map(normalizeMarket)
    .filter((market) => market.outcomes.length > 0);

  const mainMarket = markets.find((market) => market.type === "match_result") || markets[0];
  const home = findOutcome(mainMarket, "Home") || findOutcome(mainMarket, raw.home_team);
  const draw = findOutcome(mainMarket, "Draw");
  const away = findOutcome(mainMarket, "Away") || findOutcome(mainMarket, raw.away_team);

  const isLive = raw.status === "live";
  return {
    id: raw.id,
    sport: raw.sports.name,
    sportSlug: raw.sports.slug,
    homeTeam: raw.home_team,
    awayTeam: raw.away_team,
    league: raw.leagues?.name || raw.sports.name,
    startTime: formatStartTime(raw.start_time, isLive),
    startTimeIso: raw.start_time,
    isLive,
    liveScore:
      isLive && raw.live_score_home !== null && raw.live_score_away !== null
        ? { home: raw.live_score_home, away: raw.live_score_away }
        : undefined,
    liveMinute: raw.live_minute ?? undefined,
    homeOdds: home?.value || 0,
    drawOdds: draw?.value,
    awayOdds: away?.value || 0,
    marketCount: markets.length,
    outcomes: { Home: home, Draw: draw, Away: away },
    markets,
  };
}

export async function getSportsbookEvents(options?: {
  sportSlug?: string;
  liveOnly?: boolean;
  limit?: number;
}): Promise<{ events: SportsbookEvent[]; error?: string }> {
  try {
    let query = supabase
      .from("events")
      .select(`
        id,
        home_team,
        away_team,
        start_time,
        status,
        live_score_home,
        live_score_away,
        live_minute,
        leagues(name),
        sports!inner(name, slug),
        markets(
          id,
          name,
          type,
          status,
          odds(id, market_id, selection, value, is_active, is_locked)
        )
      `)
      .eq("is_suspended", false)
      .in("status", options?.liveOnly ? ["live"] : ["upcoming", "live"])
      .order("start_time", { ascending: true })
      .limit(options?.limit || 100);

    if (options?.sportSlug) {
      query = query.eq("sports.slug", options.sportSlug);
    }

    const { data, error } = await query;
    if (error) throw error;

    const events = ((data || []) as unknown as RawEvent[]).map(normalizeEvent);

    return { events };
  } catch (error) {
    console.error("Sportsbook events error:", error);
    return {
      events: [],
      error: error instanceof Error ? error.message : "Unable to load sportsbook events",
    };
  }
}
