import { systemBetPotentialReturn } from "@/lib/systemBetMath";

type DemoRow = Record<string, any>;
type DemoStore = Record<string, DemoRow[]>;
type DemoFilter = { column: string; operator: "eq" | "in" | "gte" | "lte" | "is" | "ilike"; value: any };

export const DEMO_ADMIN_EMAIL = "admin@primebet.demo";
export const DEMO_ADMIN_PASSWORD = "PrimeBetDemo2026!";
export const DEMO_BACKEND_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEMO_BACKEND === "true";

const STORE_KEY = "primebet-demo-database-v2";
const SESSION_KEY = "primebet-demo-admin-session-v1";
const ADMIN_ID = "demo-admin-0001";

function iso(minutesAgo = 0) {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

function seedStore(): DemoStore {
  const profiles = [
    { id: ADMIN_ID, email: DEMO_ADMIN_EMAIL, full_name: "PrimeBet Demo Admin", is_admin: true, admin_role: "super_admin", is_suspended: false, suspension_reason: null, demo_balance: 10000, kyc_status: "approved", locale: "en", display_currency: "USD", timezone: "Asia/Karachi", odds_format: "decimal", created_at: iso(60_000) },
    { id: "user-001", email: "ali@example.com", full_name: "Ali Khan", is_admin: false, admin_role: null, is_suspended: false, suspension_reason: null, demo_balance: 2450, kyc_status: "approved", created_at: iso(43_200) },
    { id: "user-002", email: "sara@example.com", full_name: "Sara Ahmed", is_admin: false, admin_role: null, is_suspended: false, suspension_reason: null, demo_balance: 1875, kyc_status: "pending", created_at: iso(12_600) },
    { id: "user-003", email: "hamza@example.com", full_name: "Hamza Malik", is_admin: false, admin_role: null, is_suspended: false, suspension_reason: null, demo_balance: 720, kyc_status: "pending", created_at: iso(4_300) },
    { id: "user-004", email: "ayesha@example.com", full_name: "Ayesha Noor", is_admin: false, admin_role: null, is_suspended: true, suspension_reason: "Demo risk review", demo_balance: 310, kyc_status: "rejected", created_at: iso(2_400) },
  ];

  const bets = Array.from({ length: 16 }, (_, index) => {
    const userId = index < 11 ? "user-001" : index % 2 ? "user-002" : "user-003";
    const status = index < 8 ? "won" : index < 11 ? "lost" : index < 14 ? "pending" : "lost";
    const stake = index === 12 ? 1250 : 40 + index * 15;
    const potentialReturn = Number((stake * (1.75 + (index % 4) * 0.22)).toFixed(2));
    return {
      id: `bet-${String(index + 1).padStart(3, "0")}`,
      user_id: userId,
      bet_type: index % 3 === 0 ? "multiple" : "single",
      stake,
      potential_return: potentialReturn,
      payout: status === "won" ? potentialReturn : 0,
      total_odds: Number((potentialReturn / stake).toFixed(2)),
      status,
      created_at: iso(index < 5 ? index * 8 : 180 + index * 60),
      settled_at: status === "pending" ? null : iso(120 + index * 40),
    };
  });

  return {
    profiles,
    sports: [
      { id: "sport-football", name: "Football", slug: "football", icon: "⚽", display_order: 1, is_active: true },
      { id: "sport-cricket", name: "Cricket", slug: "cricket", icon: "🏏", display_order: 2, is_active: true },
      { id: "sport-esports", name: "Esports", slug: "esports", icon: "🎮", display_order: 3, is_active: true },
    ],
    leagues: [
      { id: "league-epl", sport_id: "sport-football", name: "Premier League", country: "England", display_order: 1, is_active: true },
      { id: "league-psl", sport_id: "sport-cricket", name: "Pakistan Super League", country: "Pakistan", display_order: 1, is_active: true },
      { id: "league-esl", sport_id: "sport-esports", name: "ESL Pro League", country: "International", display_order: 1, is_active: true },
    ],
    events: [
      { id: "event-001", sport_id: "sport-football", league_id: "league-epl", home_team: "North City", away_team: "River United", start_time: new Date(Date.now() + 3_600_000).toISOString(), status: "live", is_suspended: false, live_score_home: 1, live_score_away: 0, updated_at: iso(1) },
      { id: "event-002", sport_id: "sport-football", league_id: "league-epl", home_team: "Capital FC", away_team: "Coastal Athletic", start_time: new Date(Date.now() + 10_800_000).toISOString(), status: "upcoming", is_suspended: false, updated_at: iso(2) },
      { id: "event-003", sport_id: "sport-cricket", league_id: "league-psl", home_team: "Falcons XI", away_team: "Titans XI", start_time: new Date(Date.now() + 18_000_000).toISOString(), status: "upcoming", is_suspended: false, updated_at: iso(3) },
      { id: "event-004", sport_id: "sport-esports", league_id: "league-esl", home_team: "Nova", away_team: "Vertex", start_time: new Date(Date.now() + 7_200_000).toISOString(), status: "upcoming", is_suspended: true, updated_at: iso(4) },
    ],
    event_timeline: [
      { id: "timeline-001", event_id: "event-001", incident_type: "kick_off", match_minute: 0, team_side: "neutral", score_home: 0, score_away: 0, description: "Match started", created_at: iso(50) },
      { id: "timeline-002", event_id: "event-001", incident_type: "goal", match_minute: 34, team_side: "home", score_home: 1, score_away: 0, description: "Goal for North City", created_at: iso(16) },
      { id: "timeline-003", event_id: "event-001", incident_type: "yellow_card", match_minute: 41, team_side: "away", score_home: 1, score_away: 0, description: "Yellow card", created_at: iso(9) },
    ],
    event_statistics: [
      { id: "stats-001", event_id: "event-001", home_stats: { possession: 58, shots: 9, shots_on_target: 4, corners: 5, yellow_cards: 1, red_cards: 0 }, away_stats: { possession: 42, shots: 6, shots_on_target: 2, corners: 3, yellow_cards: 2, red_cards: 0 }, provider_updated_at: iso(1), updated_at: iso(1) },
    ],
    event_lineups: [
      { id: "lineup-home-001", event_id: "event-001", team_side: "home", team_name: "North City", formation: "4-3-3", players: [{ number: 1, name: "A. Keeper", position: "GK" }, { number: 4, name: "D. Stone", position: "DEF" }, { number: 8, name: "M. Khan", position: "MID" }, { number: 9, name: "R. Cole", position: "FWD" }], updated_at: iso(2) },
      { id: "lineup-away-001", event_id: "event-001", team_side: "away", team_name: "River United", formation: "4-2-3-1", players: [{ number: 1, name: "J. Hall", position: "GK" }, { number: 5, name: "S. Malik", position: "DEF" }, { number: 10, name: "T. Reed", position: "MID" }, { number: 11, name: "L. Noor", position: "FWD" }], updated_at: iso(2) },
    ],
    markets: [
      { id: "market-001", event_id: "event-001", name: "Match Result", type: "match_result", status: "active", created_at: iso(900) },
      { id: "market-002", event_id: "event-002", name: "Match Result", type: "match_result", status: "active", created_at: iso(850) },
      { id: "market-003", event_id: "event-003", name: "Match Winner", type: "match_result", status: "active", created_at: iso(800) },
      { id: "market-004", event_id: "event-004", name: "Map Winner", type: "match_result", status: "suspended", created_at: iso(750) },
    ],
    odds: [
      { id: "odds-001", market_id: "market-001", selection: "Home", value: 2.1, is_locked: false, is_active: true },
      { id: "odds-002", market_id: "market-001", selection: "Draw", value: 3.4, is_locked: false, is_active: true },
      { id: "odds-003", market_id: "market-001", selection: "Away", value: 3.25, is_locked: false, is_active: true },
      { id: "odds-004", market_id: "market-002", selection: "Home", value: 1.82, is_locked: false, is_active: true },
      { id: "odds-005", market_id: "market-002", selection: "Away", value: 4.1, is_locked: true, is_active: true },
      { id: "odds-006", market_id: "market-003", selection: "Falcons XI", value: 1.72, is_locked: false, is_active: true },
    ],
    bets,
    kyc_documents: [
      { id: "kyc-001", user_id: "user-002", document_type: "national_id", file_url: "demo/national-id.txt", status: "pending", rejection_reason: null, uploaded_at: iso(420), reviewed_at: null, reviewed_by: null },
      { id: "kyc-002", user_id: "user-003", document_type: "proof_of_address", file_url: "demo/address.txt", status: "pending", rejection_reason: null, uploaded_at: iso(360), reviewed_at: null, reviewed_by: null },
      { id: "kyc-003", user_id: "user-001", document_type: "passport", file_url: "demo/passport.txt", status: "approved", rejection_reason: null, uploaded_at: iso(5_000), reviewed_at: iso(4_500), reviewed_by: ADMIN_ID },
    ],
    wallet_transactions: [
      { id: "tx-001", user_id: "user-001", type: "deposit", amount: 1000, balance_before: 1450, balance_after: 2450, description: "Demo wallet top-up", created_at: iso(200) },
      { id: "tx-002", user_id: "user-002", type: "bet_stake", amount: -125, balance_before: 2000, balance_after: 1875, description: "Bet stake reserved", created_at: iso(170) },
      { id: "tx-003", user_id: "user-003", type: "bet_won", amount: 320, balance_before: 400, balance_after: 720, description: "Winning settlement", created_at: iso(140) },
      { id: "tx-004", user_id: "user-004", type: "withdrawal", amount: -200, balance_before: 510, balance_after: 310, description: "Demo withdrawal review", created_at: iso(100) },
    ],
    promotions: [
      { id: "promo-001", title: "Prime Demo Welcome", description: "100 demo credits for new accounts", type: "welcome_bonus", is_active: true, valid_from: iso(1_440), valid_until: new Date(Date.now() + 60 * 86_400_000).toISOString(), bonus_amount: 100, wagering_requirement: 5, promo_code: "PRIME100", min_odds: 1.5, expires_after_days: 30 },
      { id: "promo-002", title: "Weekend Cashback", description: "10% play-money cashback", type: "cashback", is_active: true, valid_from: iso(2_880), valid_until: new Date(Date.now() + 14 * 86_400_000).toISOString(), bonus_amount: 50, wagering_requirement: 3, promo_code: "WEEKEND10", min_odds: 1.4, expires_after_days: 7 },
    ],
    user_bonuses: [
      { id: "bonus-001", promotion_id: "promo-001", user_id: "user-001" },
      { id: "bonus-002", promotion_id: "promo-001", user_id: "user-002" },
      { id: "bonus-003", promotion_id: "promo-002", user_id: "user-003" },
    ],
    support_tickets: [
      { id: "ticket-001", user_id: "user-002", subject: "Bet settlement question", message: "Please review my demo bet settlement.", status: "open", priority: "high", created_at: iso(85), updated_at: iso(85) },
      { id: "ticket-002", user_id: "user-003", subject: "KYC document", message: "I uploaded my address document.", status: "in_progress", priority: "medium", created_at: iso(320), updated_at: iso(240) },
    ],
    support_ticket_messages: [
      { id: "ticket-message-001", ticket_id: "ticket-001", author_id: "user-002", author_role: "customer", message: "Please review my demo bet settlement.", is_internal: false, created_at: iso(85) },
      { id: "ticket-message-002", ticket_id: "ticket-002", author_id: "user-003", author_role: "customer", message: "I uploaded my address document.", is_internal: false, created_at: iso(320) },
      { id: "ticket-message-003", ticket_id: "ticket-002", author_id: ADMIN_ID, author_role: "staff", message: "The document is now in the verification queue.", is_internal: false, created_at: iso(240) },
    ],
    audit_logs: [
      { id: "audit-001", admin_id: ADMIN_ID, action: "market_suspend", entity_type: "market", entity_id: "market-004", changes: { reason: "Demo incident suspension" }, created_at: iso(55) },
      { id: "audit-002", admin_id: ADMIN_ID, action: "kyc_approve", entity_type: "kyc_document", entity_id: "kyc-003", changes: { status: "approved" }, created_at: iso(260) },
    ],
    announcements: [
      { id: "announcement-001", title: "Demo maintenance window", message: "Scheduled demo maintenance tonight at 02:00 UTC.", type: "maintenance", priority: 8, is_active: true, start_date: iso(60), end_date: new Date(Date.now() + 86_400_000).toISOString(), created_at: iso(120), created_by: ADMIN_ID },
      { id: "announcement-002", title: "New live markets", message: "Additional play-money football markets are available.", type: "info", priority: 4, is_active: true, start_date: iso(600), end_date: null, created_at: iso(600), created_by: ADMIN_ID },
    ],
    provider_health: [
      { id: "provider-001", provider_id: "demo-primary", status: "healthy", latency_ms: 84, last_success_at: iso(1), last_error: null, updated_at: iso(1) },
      { id: "provider-002", provider_id: "demo-backup", status: "healthy", latency_ms: 132, last_success_at: iso(2), last_error: null, updated_at: iso(2) },
    ],
    sports_feed_providers: [
      {
        id: "demo-openligadb-provider",
        name: "OpenLigaDB Bundesliga Live Scores",
        provider_type: "openligadb",
        settings: { leagueShortcut: "bl1", sport: "Soccer" },
        is_enabled: true,
        is_demo: true,
        priority: 50,
        sync_interval_seconds: 60,
        status: "not_tested",
        last_sync_at: null,
        last_success_at: null,
        last_error: null,
        last_event_count: 0,
        created_at: iso(10_000),
        updated_at: iso(10_000),
      },
      {
        id: "demo-thesportsdb-provider",
        name: "TheSportsDB Demo Schedule",
        provider_type: "thesportsdb_demo",
        settings: { leagueId: "4328", sport: "Soccer" },
        is_enabled: true,
        is_demo: true,
        priority: 100,
        sync_interval_seconds: 300,
        status: "not_tested",
        last_sync_at: null,
        last_success_at: null,
        last_error: null,
        last_event_count: 0,
        created_at: iso(10_000),
        updated_at: iso(10_000),
      },
    ],
    background_jobs: [
      { id: "job-001", job_type: "settlement", status: "failed", payload: { event_id: "event-004" }, error_message: "Demo retry queued", retry_count: 1, created_at: iso(90) },
    ],
    error_events: [
      { id: "error-demo-001", fingerprint: "demo", source: "provider", severity: "warning", message: "Demo provider briefly exceeded its latency threshold", route: "/api/provider/feed", stack: null, context: {}, resolved_at: null, created_at: iso(35) },
    ],
    casino_providers: [
      { id: "casino-provider-demo", code: "demo", name: "PrimeBet Demo Casino", is_enabled: false, is_demo: true, settings: {}, status: "not_tested", last_health_at: null, created_at: iso(10_000), updated_at: iso(10_000) },
    ],
    casino_games: [],
    casino_sessions: [],
    casino_transactions: [],
    event_exposure: [
      { id: "exposure-001", event_id: "event-001", total_stake: 8_450, total_liability: 12_800, max_potential_payout: 4_200, risk_level: "high", bet_count: 42 },
      { id: "exposure-002", event_id: "event-003", total_stake: 3_200, total_liability: 7_900, max_potential_payout: 2_850, risk_level: "critical", bet_count: 18 },
    ],
    risk_profiles: [
      { id: "risk-001", user_id: "user-001", risk_level: "high", risk_score: 78, total_bets: 64, total_wagered: 18_200, total_won: 16_900, win_rate: 73, avg_stake: 284, unusual_bet_count: 3 },
      { id: "risk-002", user_id: "user-004", risk_level: "critical", risk_score: 92, total_bets: 18, total_wagered: 12_400, total_won: 15_800, win_rate: 78, avg_stake: 689, unusual_bet_count: 8 },
    ],
    sport_config: [{ id: "config-001", sport_id: "sport-football", default_margin: 5 }],
    trader_actions: [],
    odds_history: [
      { id: "history-001", odds_id: "odds-001", old_value: 1.95, new_value: 2.0, change_reason: "feed_update", created_at: iso(45) },
      { id: "history-002", odds_id: "odds-001", old_value: 2.0, new_value: 2.1, change_reason: "market_pressure", created_at: iso(12) },
      { id: "history-003", odds_id: "odds-002", old_value: 3.55, new_value: 3.4, change_reason: "feed_update", created_at: iso(18) },
      { id: "history-004", odds_id: "odds-003", old_value: 3.1, new_value: 3.25, change_reason: "feed_update", created_at: iso(8) },
    ],
    brokers: [],
    broker_players: [],
    broker_commissions: [],
    broker_payout_requests: [],
    payment_methods: [
      { id: "payment-nowpayments", name: "NOWPayments Crypto", code: "nowpayments", method_type: "provider", provider_code: "nowpayments", currency: "USD", network: null, destination_reference: null, instructions: "Automatic invoice and signed callback processing.", min_amount: 10, max_amount: 100000, is_enabled: false, display_order: 10, archived_at: null, created_at: iso(10_000) },
      { id: "payment-usdt-demo", name: "USDT TRC20 Demo", code: "usdt_trc20_demo", method_type: "manual_crypto", provider_code: "manual", currency: "USDT", network: "TRC20", destination_reference: "T-DEMO-NOT-FOR-REAL-PAYMENTS", instructions: "Demo configuration only. Never send real funds to this address.", min_amount: 10, max_amount: 5000, is_enabled: true, display_order: 20, archived_at: null, created_at: iso(9_000) },
    ],
    manual_deposit_requests: [],
    manual_withdrawal_requests: [],
    admin_approval_requests: [],
    early_payout_rules: [
      { id: "early-rule-football", name: "Football two-goal lead after 75 minutes", sport_slug: "football", market_type: "match_result", minimum_lead: 2, minimum_minute: 75, is_enabled: false, created_at: iso(20_000), updated_at: iso(20_000) },
    ],
    early_payout_awards: [],
    notifications: [],
    feature_flags: [
      { id: "flag-maintenance", key: "maintenance_mode", name: "Maintenance mode", description: "Show the maintenance screen to customers", is_enabled: false, config: { message: "PrimeBet is being upgraded. Please check back shortly." }, updated_at: iso(5_000) },
      { id: "flag-missions", key: "missions", name: "Missions", description: "Weekly customer missions and rewards", is_enabled: true, config: {}, updated_at: iso(5_000) },
      { id: "flag-leaderboards", key: "leaderboards", name: "Leaderboards", description: "Public privacy-safe leaderboard", is_enabled: true, config: {}, updated_at: iso(5_000) },
      { id: "flag-statistics", key: "match_statistics", name: "Match statistics", description: "Provider match statistics and lineups", is_enabled: true, config: {}, updated_at: iso(5_000) },
      { id: "flag-whitelist", key: "withdrawal_address_whitelist", name: "Withdrawal address whitelist", description: "Require saved withdrawal destinations", is_enabled: true, config: { cooldown_hours: 0 }, updated_at: iso(5_000) },
      { id: "flag-push", key: "web_push", name: "Browser push", description: "Browser notification permission and delivery readiness", is_enabled: true, config: {}, updated_at: iso(5_000) },
      { id: "flag-telegram", key: "telegram_notifications", name: "Telegram notifications", description: "Telegram delivery connector", is_enabled: false, config: {}, updated_at: iso(5_000) },
    ],
    withdrawal_addresses: [
      { id: "withdrawal-address-demo", user_id: ADMIN_ID, payment_method_id: "payment-usdt-demo", label: "My demo TRC20 wallet", destination_reference: "T-DEMO-CUSTOMER-WALLET-NOT-REAL", status: "active", activates_at: iso(60), created_at: iso(120), updated_at: iso(120) },
    ],
    missions: [
      { id: "mission-bets-5", name: "Weekly starter", description: "Place 5 bets this week", metric: "bets_placed", target_value: 5, reward_points: 100, starts_at: iso(3_000), ends_at: new Date(Date.now() + 7 * 86_400_000).toISOString(), is_active: true, display_order: 10 },
      { id: "mission-stake-250", name: "Active player", description: "Stake 250 demo credits this week", metric: "stake_amount", target_value: 250, reward_points: 250, starts_at: iso(3_000), ends_at: new Date(Date.now() + 7 * 86_400_000).toISOString(), is_active: true, display_order: 20 },
      { id: "mission-wins-3", name: "Winning run", description: "Settle 3 winning bets this week", metric: "bets_won", target_value: 3, reward_points: 175, starts_at: iso(3_000), ends_at: new Date(Date.now() + 7 * 86_400_000).toISOString(), is_active: true, display_order: 30 },
    ],
    mission_claims: [],
    loyalty_accounts: [
      { id: "loyalty-admin", user_id: ADMIN_ID, points: 420, lifetime_points: 1250, tier: "silver", updated_at: iso(20) },
      { id: "loyalty-user-1", user_id: "user-001", points: 980, lifetime_points: 3450, tier: "gold", updated_at: iso(10) },
      { id: "loyalty-user-2", user_id: "user-002", points: 620, lifetime_points: 2180, tier: "silver", updated_at: iso(30) },
      { id: "loyalty-user-3", user_id: "user-003", points: 310, lifetime_points: 980, tier: "bronze", updated_at: iso(45) },
    ],
    crypto_deposit_invoices: [],
    crypto_webhook_events: [],
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function readStore(): DemoStore {
  if (typeof window === "undefined") return seedStore();
  const saved = window.localStorage.getItem(STORE_KEY);
  if (!saved) {
    const seeded = seedStore();
    window.localStorage.setItem(STORE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = JSON.parse(saved) as DemoStore;
    parsed.admin_approval_requests ||= [];
    parsed.manual_withdrawal_requests ||= [];
    parsed.early_payout_rules ||= seedStore().early_payout_rules;
    parsed.early_payout_awards ||= [];
    parsed.notifications ||= [];
    parsed.bet_selections ||= [];
    parsed.feature_flags ||= seedStore().feature_flags;
    if (parsed.feature_flags.some((item) => !item.key)) parsed.feature_flags = seedStore().feature_flags;
    parsed.withdrawal_addresses ||= seedStore().withdrawal_addresses;
    parsed.event_statistics ||= seedStore().event_statistics;
    parsed.event_lineups ||= seedStore().event_lineups;
    parsed.missions ||= seedStore().missions;
    parsed.mission_claims ||= [];
    parsed.loyalty_accounts ||= seedStore().loyalty_accounts;
    parsed.responsible_gaming_limits ||= [];
    parsed.self_exclusions ||= [];
    parsed.cashout_offers ||= [];
    parsed.support_ticket_messages ||= [];
    if (parsed.support_ticket_messages.length === 0) {
      parsed.support_ticket_messages = (parsed.support_tickets || []).map((ticket) => ({
        id: `ticket-message-${ticket.id}`,
        ticket_id: ticket.id,
        author_id: ticket.user_id,
        author_role: "customer",
        message: ticket.message,
        is_internal: false,
        created_at: ticket.created_at,
      }));
    }
    const admin = (parsed.profiles || []).find((item) => item.id === ADMIN_ID);
    if (admin && admin.locale === undefined) {
      Object.assign(admin, { locale: "en", display_currency: "USD", timezone: "Asia/Karachi", odds_format: "decimal" });
      if (Number(admin.demo_balance || 0) === 0) admin.demo_balance = 10000;
      writeStore(parsed);
    }
    return parsed;
  } catch {
    const seeded = seedStore();
    window.localStorage.setItem(STORE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function writeStore(store: DemoStore) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function demoUser() {
  return { id: ADMIN_ID, email: DEMO_ADMIN_EMAIL, user_metadata: { full_name: "PrimeBet Demo Admin" }, app_metadata: { role: "super_admin" } };
}

function hasSession() {
  return typeof window !== "undefined" && window.localStorage.getItem(SESSION_KEY) === "active";
}

function enrichRows(table: string, rows: DemoRow[], store: DemoStore) {
  const profiles = new Map((store.profiles || []).map((profile) => [profile.id, profile]));
  const leagues = new Map((store.leagues || []).map((league) => [league.id, league]));
  const sports = new Map((store.sports || []).map((sport) => [sport.id, sport]));
  return rows.map((row) => {
    const enriched = clone(row);
    if (["bets", "kyc_documents", "wallet_transactions", "support_tickets", "risk_profiles"].includes(table) && row.user_id) {
      enriched.profiles = clone(profiles.get(row.user_id) || null);
    }
    if (table === "bets") {
      enriched.bet_selections = (store.bet_selections || []).filter((selection) => selection.bet_id === row.id).map(clone);
      enriched.selections = enriched.bet_selections;
    }
    if (table === "support_ticket_messages") enriched.profiles = clone(profiles.get(row.author_id) || null);
    if (table === "events") {
      enriched.leagues = clone(row.league_id ? leagues.get(row.league_id) || null : null);
      enriched.sports = clone(sports.get(row.sport_id) || null);
      enriched.markets = (store.markets || [])
        .filter((market) => market.event_id === row.id)
        .map((market) => ({
          ...clone(market),
          odds: (store.odds || []).filter((item) => item.market_id === market.id).map(clone),
        }));
    }
    return enriched;
  });
}

class DemoQuery implements PromiseLike<{ data: any; error: any; count?: number }> {
  private filters: DemoFilter[] = [];
  private orExpressions: string[] = [];
  private sorters: Array<{ column: string; ascending: boolean }> = [];
  private maxRows: number | null = null;
  private singleRow = false;
  private head = false;
  private countRequested = false;
  private operation: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: any = null;
  private conflictColumns: string[] = [];
  private execution?: Promise<{ data: any; error: any; count?: number }>;

  constructor(private table: string) {}

  select(_columns = "*", options?: { count?: string; head?: boolean }) {
    this.countRequested = options?.count === "exact";
    this.head = Boolean(options?.head);
    return this;
  }

  insert(payload: DemoRow | DemoRow[]) { this.operation = "insert"; this.payload = payload; return this; }
  upsert(payload: DemoRow | DemoRow[], options?: { onConflict?: string }) { this.operation = "upsert"; this.payload = payload; this.conflictColumns = (options?.onConflict || "").split(",").map((item) => item.trim()).filter(Boolean); return this; }
  update(payload: DemoRow) { this.operation = "update"; this.payload = payload; return this; }
  delete() { this.operation = "delete"; return this; }
  eq(column: string, value: any) { this.filters.push({ column, operator: "eq", value }); return this; }
  in(column: string, value: any[]) { this.filters.push({ column, operator: "in", value }); return this; }
  gte(column: string, value: any) { this.filters.push({ column, operator: "gte", value }); return this; }
  lte(column: string, value: any) { this.filters.push({ column, operator: "lte", value }); return this; }
  is(column: string, value: any) { this.filters.push({ column, operator: "is", value }); return this; }
  ilike(column: string, value: string) { this.filters.push({ column, operator: "ilike", value }); return this; }
  or(expression: string) { this.orExpressions.push(expression); return this; }
  order(column: string, options?: { ascending?: boolean }) { this.sorters.push({ column, ascending: options?.ascending !== false }); return this; }
  limit(value: number) { this.maxRows = value; return this; }
  single() { this.singleRow = true; return this; }
  maybeSingle() { this.singleRow = true; return this; }

  private matches(row: DemoRow) {
    const matchesFilters = this.filters.every((filter) => {
      const actual = row[filter.column];
      if (filter.operator === "eq") {
        if (filter.column === "is_suspended" && filter.value === false && actual == null) return true;
        return actual === filter.value;
      }
      if (filter.operator === "in") return filter.value.includes(actual);
      if (filter.operator === "gte") return actual >= filter.value;
      if (filter.operator === "lte") return actual <= filter.value;
      if (filter.operator === "is") return filter.value === null ? actual == null : actual === filter.value;
      const needle = String(filter.value || "").replaceAll("%", "").toLowerCase();
      return String(actual || "").toLowerCase().includes(needle);
    });
    if (!matchesFilters) return false;
    return this.orExpressions.every((expression) => expression.split(",").some((condition) => {
      const [column, operator, ...rawValue] = condition.split(".");
      const value = rawValue.join(".");
      const actual = row[column];
      if (operator === "is" && value === "null") return actual === null || actual === undefined;
      if (operator === "eq") return String(actual) === value;
      if (operator === "gte") return actual >= value;
      if (operator === "lte") return actual <= value;
      return false;
    }));
  }

  private async execute() {
    const store = readStore();
    store[this.table] ||= [];
    const rows = store[this.table];
    let resultRows: DemoRow[] = [];

    if (this.operation === "insert") {
      const incoming = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((row) => ({
        id: row.id || `${this.table}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        created_at: row.created_at || new Date().toISOString(),
        ...clone(row),
      }));
      store[this.table].push(...incoming);
      resultRows = incoming;
      writeStore(store);
    } else if (this.operation === "upsert") {
      const incoming = Array.isArray(this.payload) ? this.payload : [this.payload];
      const defaults: Record<string, string[]> = { notification_preferences: ["user_id"], sport_config: ["sport_id"], user_limits: ["user_id", "limit_type"], push_subscriptions: ["user_id", "endpoint"] };
      const keys = this.conflictColumns.length ? this.conflictColumns : defaults[this.table] || (incoming[0]?.id ? ["id"] : []);
      resultRows = incoming.map((item) => {
        const existing = keys.length ? rows.find((row) => keys.every((key) => row[key] === item[key])) : null;
        if (existing) { Object.assign(existing, clone(item), { updated_at: new Date().toISOString() }); return existing; }
        const created = { id: item.id || `${this.table}-${Date.now()}-${Math.random().toString(16).slice(2)}`, created_at: item.created_at || new Date().toISOString(), ...clone(item) };
        rows.push(created); return created;
      });
      writeStore(store);
    } else if (this.operation === "update") {
      resultRows = rows.filter((row) => this.matches(row));
      resultRows.forEach((row) => Object.assign(row, clone(this.payload), { updated_at: new Date().toISOString() }));
      writeStore(store);
    } else if (this.operation === "delete") {
      resultRows = rows.filter((row) => this.matches(row));
      store[this.table] = rows.filter((row) => !this.matches(row));
      writeStore(store);
    } else {
      resultRows = rows.filter((row) => this.matches(row));
    }

    for (const sorter of [...this.sorters].reverse()) {
      resultRows.sort((left, right) => {
        const comparison = left[sorter.column] < right[sorter.column] ? -1 : left[sorter.column] > right[sorter.column] ? 1 : 0;
        return sorter.ascending ? comparison : -comparison;
      });
    }
    if (this.maxRows !== null) resultRows = resultRows.slice(0, this.maxRows);

    const enriched = enrichRows(this.table, resultRows, store);
    const count = this.countRequested ? enriched.length : undefined;
    const data = this.head ? null : this.singleRow ? enriched[0] ?? null : enriched;
    return { data, error: null, ...(count === undefined ? {} : { count }) };
  }

  then<TResult1 = { data: any; error: any; count?: number }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any; count?: number }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    this.execution ||= this.execute();
    return this.execution.then(onfulfilled, onrejected);
  }
}

export function createDemoSupabaseClient() {
  const listeners = new Set<(event: string, session: any) => void>();
  const getSessionValue = () => hasSession() ? { user: demoUser(), access_token: "demo-token" } : null;

  return {
    auth: {
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        if (email.toLowerCase() !== DEMO_ADMIN_EMAIL || password !== DEMO_ADMIN_PASSWORD) {
          return { data: { user: null, session: null }, error: { message: "Invalid demo admin credentials" } };
        }
        window.localStorage.setItem(SESSION_KEY, "active");
        const session = getSessionValue();
        listeners.forEach((listener) => listener("SIGNED_IN", session));
        return { data: { user: demoUser(), session }, error: null };
      },
      async signOut() {
        if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
        listeners.forEach((listener) => listener("SIGNED_OUT", null));
        return { error: null };
      },
      async getUser() { return { data: { user: hasSession() ? demoUser() : null }, error: null }; },
      async getSession() { return { data: { session: getSessionValue() }, error: null }; },
      onAuthStateChange(callback: (event: string, session: any) => void) {
        listeners.add(callback);
        return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
      },
      async updateUser() { return { data: { user: demoUser() }, error: null }; },
      async resetPasswordForEmail() { return { data: {}, error: null }; },
      async verifyOtp() { return { data: { user: demoUser(), session: getSessionValue() }, error: null }; },
      async signUp() { return { data: { user: null, session: null }, error: { message: "Demo backend only supports the admin account" } }; },
      mfa: {
        async getAuthenticatorAssuranceLevel() { return { data: { currentLevel: "aal2", nextLevel: "aal2", currentAuthenticationMethods: [] }, error: null }; },
        async listFactors() { return { data: { all: [], totp: [{ id: "demo-factor", status: "verified", factor_type: "totp" }], phone: [] }, error: null }; },
        async challenge() { return { data: { id: "demo-challenge", expires_at: Date.now() + 60_000 }, error: null }; },
        async verify() { return { data: { access_token: "demo-token" }, error: null }; },
        async enroll() { return { data: { id: "demo-factor", type: "totp", totp: { qr_code: "", secret: "DEMO", uri: "" } }, error: null }; },
        async unenroll() { return { data: { id: "demo-factor" }, error: null }; },
      },
    },
    from(table: string) { return new DemoQuery(table); },
    async rpc(name: string, args: Record<string, any> = {}) {
      if (name === "create_support_ticket") {
        const subject = String(args.p_subject || "").trim();
        const message = String(args.p_message || "").trim();
        const priority = String(args.p_priority || "medium");
        if (subject.length < 3 || subject.length > 160) return { data: null, error: { message: "Subject must be between 3 and 160 characters" } };
        if (message.length < 10 || message.length > 5000) return { data: null, error: { message: "Message must be between 10 and 5000 characters" } };
        if (!["low", "medium", "high", "urgent"].includes(priority)) return { data: null, error: { message: "Invalid ticket priority" } };
        const store = readStore();
        const ticketId = `ticket-${Date.now()}`;
        store.support_tickets ||= [];
        store.support_ticket_messages ||= [];
        store.support_tickets.push({ id: ticketId, user_id: ADMIN_ID, subject, message, status: "open", priority, assigned_to: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        store.support_ticket_messages.push({ id: `ticket-message-${Date.now()}`, ticket_id: ticketId, author_id: ADMIN_ID, author_role: "customer", message, is_internal: false, created_at: new Date().toISOString() });
        writeStore(store);
        return { data: ticketId, error: null };
      }
      if (name === "reply_support_ticket") {
        const message = String(args.p_message || "").trim();
        if (!message || message.length > 5000) return { data: null, error: { message: "Reply must be between 1 and 5000 characters" } };
        const store = readStore();
        const ticket = (store.support_tickets || []).find((item) => item.id === args.p_ticket_id);
        if (!ticket) return { data: null, error: { message: "Support ticket not found" } };
        const messageId = `ticket-message-${Date.now()}`;
        store.support_ticket_messages ||= [];
        store.support_ticket_messages.push({ id: messageId, ticket_id: ticket.id, author_id: ADMIN_ID, author_role: "staff", message, is_internal: Boolean(args.p_internal), created_at: new Date().toISOString() });
        Object.assign(ticket, { status: args.p_status || "in_progress", assigned_to: ADMIN_ID, updated_at: new Date().toISOString() });
        if (!args.p_internal) {
          store.notifications ||= [];
          store.notifications.push({ id: `notification-${Date.now()}`, user_id: ticket.user_id, type: "support_reply", title: "Support replied", message: message.slice(0, 240), is_read: false, metadata: { ticket_id: ticket.id }, created_at: new Date().toISOString() });
        }
        writeStore(store);
        return { data: messageId, error: null };
      }
      if (name === "place_bet_atomic" || name === "place_system_bet_atomic") {
        const store = readStore();
        const profile = (store.profiles || []).find((item) => item.id === ADMIN_ID);
        const selections = Array.isArray(args.p_selections) ? args.p_selections : [];
        const isSystem = name === "place_system_bet_atomic";
        const combinationSize = Number(args.p_combination_size || 2);
        const stake = Number(args.p_stake || 0);
        if (!profile || stake <= 0 || Number(profile.demo_balance || 0) < stake) return { data: null, error: { message: "Insufficient demo balance" } };
        if ((isSystem && selections.length < 3) || (!isSystem && selections.length < 1)) return { data: null, error: { message: "Invalid bet selections" } };
        const odds = selections.map((item: DemoRow) => Number(item.odds_value || 0));
        const quote = isSystem ? systemBetPotentialReturn(odds, combinationSize, stake) : { lineCount: 1, potentialReturn: stake * odds.reduce((total: number, value: number) => total * value, 1) };
        const id = `bet-${Date.now()}`;
        const before = Number(profile.demo_balance || 0); profile.demo_balance = before - stake;
        store.bets ||= []; store.bet_selections ||= []; store.wallet_transactions ||= [];
        store.bets.push({ id, user_id: ADMIN_ID, type: isSystem ? "system" : args.p_bet_type, bet_type: isSystem ? "system" : args.p_bet_type, stake, total_odds: Number((quote.potentialReturn / stake).toFixed(2)), potential_return: Number(quote.potentialReturn.toFixed(2)), status: "pending", created_at: new Date().toISOString() });
        selections.forEach((item: DemoRow, index: number) => store.bet_selections.push({ id: `${id}-selection-${index + 1}`, bet_id: id, event_id: item.event_id, market_id: item.market_id, odds_id: item.odds_id, selection: item.selection, odds_value: Number(item.odds_value), result: "pending", created_at: new Date().toISOString() }));
        store.wallet_transactions.push({ id: `tx-${Date.now()}`, user_id: ADMIN_ID, type: "bet_placed", amount: -stake, balance_before: before, balance_after: profile.demo_balance, description: `${isSystem ? "System" : "Demo"} bet placed`, reference_id: id, status: "completed", created_at: new Date().toISOString() });
        const now = Date.now();
        (store.responsible_gaming_limits || []).filter((limit) => limit.user_id === ADMIN_ID && limit.is_active && String(limit.limit_type).endsWith("_stake") && Date.parse(limit.period_start) <= now && Date.parse(limit.period_end) >= now).forEach((limit) => { limit.current_usage = Number(limit.current_usage || 0) + stake; limit.updated_at = new Date().toISOString(); });
        writeStore(store);
        return { data: { success: true, result: "accepted", bet: { id, type: isSystem ? "system" : args.p_bet_type, stake, totalOdds: Number((quote.potentialReturn / stake).toFixed(2)), potentialReturn: Number(quote.potentialReturn.toFixed(2)), status: "pending", lineCount: quote.lineCount, combinationSize } }, error: null };
      }
      if (name === "cancel_bet_atomic") {
        const store = readStore(); const bet = (store.bets || []).find((item) => item.id === args.p_bet_id && item.user_id === ADMIN_ID);
        if (!bet) return { data: null, error: { message: "Bet not found" } };
        if (bet.status !== "pending") return { data: null, error: { message: `Bet is already ${bet.status}` } };
        if (Date.now() - Date.parse(bet.created_at) > 5 * 60_000) return { data: null, error: { message: "The five-minute cancellation window has ended" } };
        const selections = (store.bet_selections || []).filter((item) => item.bet_id === bet.id);
        const started = selections.some((selection) => { const event = (store.events || []).find((item) => item.id === selection.event_id); return event && (event.status === "live" || Date.parse(event.start_time) <= Date.now()); });
        if (started) return { data: null, error: { message: "A selected event has already started" } };
        const profile = (store.profiles || []).find((item) => item.id === ADMIN_ID); const before = Number(profile?.demo_balance || 0); const refund = Number(bet.stake || 0);
        if (profile) profile.demo_balance = before + refund;
        Object.assign(bet, { status: "cancelled", payout: refund, settled_at: new Date().toISOString() });
        selections.forEach((selection) => { selection.result = "void"; });
        store.wallet_transactions ||= []; store.wallet_transactions.push({ id: `cancel-refund-${Date.now()}`, user_id: ADMIN_ID, type: "adjustment", amount: refund, balance_before: before, balance_after: before + refund, description: "Cancelled bet refund", reference_id: bet.id, status: "completed", created_at: new Date().toISOString() });
        writeStore(store); return { data: { success: true, betId: bet.id }, error: null };
      }
      if (name === "accept_cashout") {
        const store = readStore(); const bet = (store.bets || []).find((item) => item.id === args.p_bet_id && item.user_id === ADMIN_ID);
        if (!bet || bet.status !== "pending") return { data: null, error: { message: "Only pending bets can be cashed out" } };
        const selections = (store.bet_selections || []).filter((item) => item.bet_id === bet.id);
        let currentOdds = 1;
        for (const selection of selections) {
          const odd = (store.odds || []).find((item) => item.id === selection.odds_id);
          const market = (store.markets || []).find((item) => item.id === selection.market_id);
          const event = (store.events || []).find((item) => item.id === selection.event_id);
          if (!odd || !odd.is_active || odd.is_locked || market?.status !== "active" || !event || event.is_suspended || !["upcoming","live"].includes(event.status)) return { data: null, error: { message: "Cash-out is unavailable because a selection changed state" } };
          currentOdds *= Number(odd.value || 0);
        }
        const fullOffer = Math.round(((Number(bet.stake) * currentOdds * 0.85) / Number(bet.total_odds || 1)) * 100) / 100;
        const type = args.p_cashout_type === "partial" ? "partial" : "full"; const requested = Number(args.p_partial_amount || 0);
        if (fullOffer < 0.01 || (type === "partial" && (requested < 0.01 || requested >= fullOffer))) return { data: null, error: { message: "Partial cash-out must be below the full offer" } };
        const credit = type === "full" ? fullOffer : Math.round(requested * 100) / 100; const fraction = credit / fullOffer;
        const profile = (store.profiles || []).find((item) => item.id === ADMIN_ID); const before = Number(profile?.demo_balance || 0); if (profile) profile.demo_balance = before + credit;
        if (type === "full") Object.assign(bet, { status: "cashout", payout: credit, settled_at: new Date().toISOString() });
        else Object.assign(bet, { stake: Math.round(Number(bet.stake) * (1 - fraction) * 100) / 100, potential_return: Math.round(Number(bet.potential_return || bet.potential_payout || 0) * (1 - fraction) * 100) / 100 });
        store.wallet_transactions ||= []; store.cashout_offers ||= [];
        const transactionId = `cashout-tx-${Date.now()}`; store.wallet_transactions.push({ id: transactionId, user_id: ADMIN_ID, type: "adjustment", amount: credit, balance_before: before, balance_after: before + credit, description: `${type === "full" ? "Full" : "Partial"} cash-out`, reference_id: bet.id, status: "completed", created_at: new Date().toISOString() });
        store.cashout_offers.push({ id: `cashout-${Date.now()}`, bet_id: bet.id, user_id: ADMIN_ID, offer_type: type, original_stake: Number(bet.stake), original_odds: Number(bet.total_odds), current_odds: currentOdds, cashout_amount: credit, cashout_percentage: fraction * 100, is_available: false, accepted_at: new Date().toISOString(), wallet_transaction_id: transactionId, created_at: new Date().toISOString() });
        writeStore(store); return { data: { success: true, cashoutAmount: credit, fullOffer, balanceAfter: before + credit }, error: null };
      }
      if (name === "set_my_responsible_limit") {
        const valid = ["daily_stake","weekly_stake","monthly_stake"]; const type = String(args.p_limit_type); const amount = Number(args.p_limit_value);
        if (!valid.includes(type) || !Number.isFinite(amount) || amount <= 0) return { data: null, error: { message: "Enter a valid responsible-play limit" } };
        const store = readStore(); store.responsible_gaming_limits ||= []; const now = new Date(); const days = type === "daily_stake" ? 1 : type === "weekly_stake" ? 7 : 30;
        const current = store.responsible_gaming_limits.find((item) => item.user_id === ADMIN_ID && item.limit_type === type && item.is_active && Date.parse(item.period_end) > Date.now());
        if (current && amount > Number(current.limit_value)) return { data: null, error: { message: "An active limit may only be reduced until its period ends" } };
        const values = { limit_value: amount, is_active: true, period_start: current?.period_start || now.toISOString(), period_end: current?.period_end || new Date(now.getTime() + days * 86_400_000).toISOString(), current_usage: Number(current?.current_usage || 0), updated_at: now.toISOString() };
        if (current) Object.assign(current, values); else store.responsible_gaming_limits.push({ id: `limit-${Date.now()}`, user_id: ADMIN_ID, limit_type: type, created_at: now.toISOString(), ...values });
        writeStore(store); return { data: null, error: null };
      }
      if (name === "start_my_self_exclusion") {
        const type = String(args.p_exclusion_type); const days = args.p_duration_days == null ? null : Number(args.p_duration_days);
        if (!["timeout","self_exclusion","permanent"].includes(type)) return { data: null, error: { message: "Invalid self-exclusion type" } };
        const store = readStore(); store.self_exclusions ||= [];
        if (store.self_exclusions.some((item) => item.user_id === ADMIN_ID && item.is_active && (!item.end_date || Date.parse(item.end_date) > Date.now()))) return { data: null, error: { message: "A self-exclusion is already active" } };
        const start = new Date(); const end = type === "permanent" ? null : new Date(start.getTime() + Math.max(1, days || 1) * 86_400_000).toISOString();
        store.self_exclusions.push({ id: `exclusion-${Date.now()}`, user_id: ADMIN_ID, exclusion_type: type, start_date: start.toISOString(), end_date: end, reason: args.p_reason || null, is_active: true, created_at: start.toISOString() });
        const profile = (store.profiles || []).find((item) => item.id === ADMIN_ID); if (profile) Object.assign(profile, { is_self_excluded: true, self_exclusion_until: end, updated_at: start.toISOString() });
        writeStore(store); return { data: null, error: null };
      }
      if (name === "settle_bet") {
        const store = readStore(); const bet = (store.bets || []).find((item) => item.id === args.p_bet_id);
        if (!bet || bet.status !== "pending") return { data: null, error: { message: "Pending bet not found" } };
        const result = String(args.p_result); if (!["won","lost","void"].includes(result)) return { data: null, error: { message: "Invalid settlement result" } };
        const payout = Math.max(0, Number(args.p_payout || 0)); const profile = (store.profiles || []).find((item) => item.id === bet.user_id); const before = Number(profile?.demo_balance || 0);
        if (payout > 0 && profile) profile.demo_balance = before + payout;
        Object.assign(bet, { status: result, payout, settled_at: new Date().toISOString() });
        (store.bet_selections || []).filter((item) => item.bet_id === bet.id).forEach((selection) => { selection.result = result === "won" ? "won" : result === "lost" ? "lost" : "void"; });
        if (payout > 0) { store.wallet_transactions ||= []; store.wallet_transactions.push({ id: `settlement-${Date.now()}`, user_id: bet.user_id, type: result === "won" ? "bet_won" : "adjustment", amount: payout, balance_before: before, balance_after: before + payout, description: `Bet settled ${result}`, reference_id: bet.id, status: "completed", created_at: new Date().toISOString() }); }
        store.notifications ||= []; store.notifications.push({ id: `bet-notice-${Date.now()}`, user_id: bet.user_id, type: "bet_result", title: `Bet ${result}`, message: payout > 0 ? `$${payout.toFixed(2)} credited to your wallet.` : "Your bet has been settled.", action_url: `/account/bets?bet=${bet.id}`, is_read: false, created_at: new Date().toISOString() });
        writeStore(store); return { data: { success: true, payout }, error: null };
      }
      if (name === "claim_promotion") {
        const store = readStore(); const promotion = (store.promotions || []).find((item) => item.id === args.p_promotion_id && item.is_active);
        if (!promotion || Date.parse(promotion.valid_from) > Date.now() || Date.parse(promotion.valid_until) < Date.now()) return { data: null, error: { message: "Promotion is unavailable" } };
        if (promotion.promo_code && String(args.p_promo_code || "").trim().toUpperCase() !== String(promotion.promo_code).toUpperCase()) return { data: null, error: { message: "Promo code is incorrect" } };
        store.user_bonuses ||= []; const claimed = store.user_bonuses.filter((item) => item.user_id === ADMIN_ID && item.promotion_id === promotion.id).length;
        if (claimed >= Number(promotion.per_user_claim_limit || 1)) return { data: null, error: { message: "Promotion claim limit reached" } };
        const amount = Number(promotion.bonus_amount || 0); const required = amount * Number(promotion.wagering_requirement || 0); const now = new Date(); const profile = (store.profiles || []).find((item) => item.id === ADMIN_ID); const before = Number(profile?.demo_balance || 0);
        store.user_bonuses.push({ id: `bonus-${Date.now()}`, user_id: ADMIN_ID, promotion_id: promotion.id, initial_amount: amount, remaining_amount: amount, wagering_requirement: required, wagering_completed: 0, status: "active", awarded_at: now.toISOString(), expires_at: new Date(now.getTime() + Number(promotion.expires_after_days || 30) * 86_400_000).toISOString() });
        if (profile) profile.demo_balance = before + amount;
        store.wallet_transactions ||= []; store.wallet_transactions.push({ id: `bonus-tx-${Date.now()}`, user_id: ADMIN_ID, type: "bonus_awarded", amount, balance_before: before, balance_after: before + amount, description: promotion.title, reference_id: promotion.id, status: "completed", created_at: now.toISOString() });
        writeStore(store); return { data: { success: true, amount }, error: null };
      }
      if (name === "update_my_display_preferences") {
        const store = readStore(); const profile = (store.profiles || []).find((item) => item.id === ADMIN_ID);
        if (profile) Object.assign(profile, { locale: args.p_locale, display_currency: args.p_currency, timezone: args.p_timezone, odds_format: args.p_odds_format, updated_at: new Date().toISOString() });
        writeStore(store); return { data: null, error: null };
      }
      if (name === "save_feature_flag") {
        const store = readStore(); store.feature_flags ||= [];
        let flag = store.feature_flags.find((item) => item.key === args.p_key);
        const values = { is_enabled: Boolean(args.p_enabled), config: args.p_config || {}, updated_at: new Date().toISOString() };
        if (flag) Object.assign(flag, values);
        else { flag = { id: `flag-${Date.now()}`, key: args.p_key, name: args.p_key, description: null, ...values }; store.feature_flags.push(flag); }
        writeStore(store); return { data: flag.id, error: null };
      }
      if (name === "add_my_withdrawal_address") {
        const store = readStore(); store.withdrawal_addresses ||= [];
        const method = (store.payment_methods || []).find((item) => item.id === args.p_payment_method_id && item.is_enabled && !item.archived_at);
        const destination = String(args.p_destination || args.p_destination_reference || "").trim();
        if (!method) return { data: null, error: { message: "Payment method is unavailable" } };
        if (destination.length < 6) return { data: null, error: { message: "Enter a valid withdrawal destination" } };
        if (store.withdrawal_addresses.some((item) => item.user_id === ADMIN_ID && item.payment_method_id === method.id && item.destination_reference.toLowerCase() === destination.toLowerCase() && item.status !== "removed")) return { data: null, error: { message: "This destination is already saved" } };
        const flag = (store.feature_flags || []).find((item) => item.key === "withdrawal_address_whitelist");
        const cooldownHours = Number(flag?.config?.cooldown_hours || 0);
        const activatesAt = new Date(Date.now() + cooldownHours * 3_600_000).toISOString();
        const address = { id: `withdrawal-address-${Date.now()}`, user_id: ADMIN_ID, payment_method_id: method.id, label: String(args.p_label || "Saved destination").trim(), destination_reference: destination, status: cooldownHours > 0 ? "cooling" : "active", activates_at: activatesAt, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        store.withdrawal_addresses.push(address); writeStore(store); return { data: address.id, error: null };
      }
      if (name === "remove_my_withdrawal_address") {
        const store = readStore(); const address = (store.withdrawal_addresses || []).find((item) => item.id === (args.p_id || args.p_address_id) && item.user_id === ADMIN_ID);
        if (!address) return { data: null, error: { message: "Saved destination not found" } };
        Object.assign(address, { status: "removed", updated_at: new Date().toISOString() }); writeStore(store); return { data: null, error: null };
      }
      if (name === "get_my_missions") {
        const store = readStore(); const now = Date.now();
        const missionRows = (store.missions || []).filter((mission) => mission.is_active && Date.parse(mission.starts_at) <= now && Date.parse(mission.ends_at) >= now).sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0));
        const userBets = (store.bets || []).filter((bet) => bet.user_id === ADMIN_ID);
        const progressFor = (mission: DemoRow) => mission.metric === "stake_amount" ? userBets.reduce((sum, bet) => sum + Number(bet.stake || 0), 0) : mission.metric === "bets_won" ? userBets.filter((bet) => bet.status === "won").length : userBets.length;
        return { data: missionRows.map((mission) => { const progress = Math.min(progressFor(mission), Number(mission.target_value)); const claim = (store.mission_claims || []).find((item) => item.user_id === ADMIN_ID && item.mission_id === mission.id); return { ...clone(mission), progress, completed: progress >= Number(mission.target_value), claimed: Boolean(claim), claimed_at: claim?.claimed_at || null }; }), error: null };
      }
      if (name === "claim_mission_reward") {
        const store = readStore(); const mission = (store.missions || []).find((item) => item.id === args.p_mission_id && item.is_active);
        if (!mission) return { data: null, error: { message: "Mission is unavailable" } };
        store.mission_claims ||= [];
        if (store.mission_claims.some((item) => item.user_id === ADMIN_ID && item.mission_id === mission.id)) return { data: null, error: { message: "Reward already claimed" } };
        const userBets = (store.bets || []).filter((bet) => bet.user_id === ADMIN_ID);
        const progress = mission.metric === "stake_amount" ? userBets.reduce((sum, bet) => sum + Number(bet.stake || 0), 0) : mission.metric === "bets_won" ? userBets.filter((bet) => bet.status === "won").length : userBets.length;
        if (progress < Number(mission.target_value)) return { data: null, error: { message: "Mission is not complete yet" } };
        const claim = { id: `mission-claim-${Date.now()}`, user_id: ADMIN_ID, mission_id: mission.id, reward_points: Number(mission.reward_points), claimed_at: new Date().toISOString() }; store.mission_claims.push(claim);
        store.loyalty_accounts ||= []; let account = store.loyalty_accounts.find((item) => item.user_id === ADMIN_ID);
        if (!account) { account = { id: `loyalty-${Date.now()}`, user_id: ADMIN_ID, points: 0, lifetime_points: 0, tier: "bronze" }; store.loyalty_accounts.push(account); }
        account.points = Number(account.points || 0) + Number(mission.reward_points); account.lifetime_points = Number(account.lifetime_points || 0) + Number(mission.reward_points); account.updated_at = new Date().toISOString();
        writeStore(store); return { data: { points_awarded: Number(mission.reward_points), total_points: account.points }, error: null };
      }
      if (name === "get_public_leaderboard") {
        const store = readStore();
        const rows = (store.loyalty_accounts || []).map((account) => { const profile = (store.profiles || []).find((item) => item.id === account.user_id); const display = String(profile?.full_name || "Player").split(" ")[0]; return { display_name: `${display.slice(0, 2)}***`, points: Number(account.points || 0), tier: account.tier || "bronze", is_current: account.user_id === ADMIN_ID }; }).sort((a, b) => b.points - a.points).slice(0, Math.max(1, Math.min(Number(args.p_limit || 20), 100))).map((row, index) => ({ rank: index + 1, ...row }));
        return { data: rows, error: null };
      }
      if (name === "get_my_wallet_balances") {
        const store = readStore(); const profile = (store.profiles || []).find((item) => item.id === ADMIN_ID);
        const locked = (store.manual_withdrawal_requests || []).filter((item) => item.user_id === ADMIN_ID && ["pending","on_hold","awaiting_approval"].includes(item.status)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
        return { data: { currency: "USD", cash: Number(profile?.demo_balance || 0), bonus: 0, locked, available: Number(profile?.demo_balance || 0) }, error: null };
      }
      if (name === "review_kyc_document_manual") {
        const store = readStore(); const document = (store.kyc_documents || []).find((item) => item.id === args.p_document_id);
        if (!document) return { data: null, error: { message: "KYC document not found" } };
        Object.assign(document, { status: args.p_action === "approve" ? "approved" : args.p_action === "reject" ? "rejected" : "pending", rejection_reason: args.p_action === "approve" ? null : args.p_note, admin_note: args.p_note, risk_level: args.p_risk_level, source_of_funds_status: args.p_source_of_funds_status, reviewed_by: ADMIN_ID, reviewed_at: new Date().toISOString() });
        store.notifications ||= []; store.notifications.push({ id: `notice-${Date.now()}`, user_id: document.user_id, type: `kyc_${args.p_action}`, title: "Verification update", message: args.p_note || "Your verification was reviewed.", is_read: false, created_at: new Date().toISOString() });
        writeStore(store); return { data: null, error: null };
      }
      if (name === "get_wallet_reconciliation_report") return { data: [], error: null };
      if (name === "get_my_broker_dashboard") {
        const store = readStore();
        const broker = (store.brokers || []).find((item) => item.user_id === ADMIN_ID);
        if (!broker) return { data: null, error: null };
        const commissions = (store.broker_commissions || []).filter((item) => item.broker_id === broker.id);
        const payouts = (store.broker_payout_requests || []).filter((item) => item.broker_id === broker.id);
        const earned = commissions.filter((item) => ["accrued", "approved", "paid"].includes(item.status)).reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);
        const reserved = payouts.filter((item) => ["pending", "approved"].includes(item.status)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const paid = payouts.filter((item) => item.status === "paid").reduce((sum, item) => sum + Number(item.amount || 0), 0);
        return { data: {
          id: broker.id, companyName: broker.company_name, brokerCode: broker.broker_code,
          status: broker.status, commissionBps: broker.commission_bps,
          players: (store.broker_players || []).filter((item) => item.broker_id === broker.id && item.is_active).length,
          grossRevenue: commissions.reduce((sum, item) => sum + Number(item.gross_revenue || 0), 0),
          commissionAvailable: Math.max(earned - reserved - paid, 0),
          commissionReserved: reserved,
          commissionPaid: paid,
        }, error: null };
      }
      if (name === "apply_for_broker") {
        const store = readStore();
        let broker = (store.brokers || []).find((item) => item.user_id === ADMIN_ID);
        if (!broker) {
          broker = { id: `broker-${Date.now()}`, user_id: ADMIN_ID, company_name: args.p_company_name, broker_code: Math.random().toString(36).slice(2, 10).toUpperCase(), status: "pending", commission_bps: 1500, created_at: new Date().toISOString() };
          store.brokers ||= []; store.brokers.push(broker); writeStore(store);
        }
        return { data: { success: true, brokerId: broker.id, status: broker.status, brokerCode: broker.broker_code }, error: null };
      }
      if (name === "review_broker_application") {
        const store = readStore();
        const broker = (store.brokers || []).find((item) => item.id === args.p_broker_id);
        if (!broker) return { data: null, error: { message: "Broker not found" } };
        Object.assign(broker, { status: args.p_status, commission_bps: args.p_commission_bps, reviewed_at: new Date().toISOString() });
        writeStore(store); return { data: null, error: null };
      }
      if (name === "link_my_broker") {
        const store = readStore();
        const broker = (store.brokers || []).find((item) => item.broker_code === String(args.p_broker_code).toUpperCase() && item.status === "active");
        if (!broker) return { data: null, error: { message: "Active broker code not found" } };
        store.broker_players ||= []; store.broker_players.push({ id: `broker-player-${Date.now()}`, broker_id: broker.id, player_id: ADMIN_ID, is_active: true, attributed_at: new Date().toISOString() });
        writeStore(store); return { data: { success: true, broker: broker.company_name }, error: null };
      }
      if (name === "request_broker_payout") {
        const store = readStore(); const broker = (store.brokers || []).find((item) => item.user_id === ADMIN_ID && item.status === "active");
        if (!broker) return { data: null, error: { message: "Active broker account required" } };
        store.broker_payout_requests ||= []; const id = `broker-payout-${Date.now()}`;
        store.broker_payout_requests.push({ id, broker_id: broker.id, amount: args.p_amount, destination_reference: args.p_destination_reference, status: "pending", requested_at: new Date().toISOString() });
        writeStore(store); return { data: id, error: null };
      }
      if (name === "review_broker_payout") {
        const store = readStore();
        const payout = (store.broker_payout_requests || []).find((item) => item.id === args.p_request_id);
        if (!payout) return { data: null, error: { message: "Payout request not found" } };
        Object.assign(payout, {
          status: args.p_status,
          payment_reference: args.p_payment_reference || payout.payment_reference,
          notes: args.p_notes || payout.notes,
          reviewed_at: new Date().toISOString(),
          paid_at: args.p_status === "paid" ? new Date().toISOString() : payout.paid_at,
        });
        writeStore(store); return { data: null, error: null };
      }
      if (name === "save_payment_method") {
        const store = readStore(); store.payment_methods ||= [];
        let method = args.p_id ? store.payment_methods.find((item) => item.id === args.p_id) : null;
        if (args.p_id && !method) return { data: null, error: { message: "Payment method not found" } };
        const values = {
          name: args.p_name, code: args.p_code, method_type: args.p_method_type, provider_code: args.p_provider_code,
          currency: args.p_currency, network: args.p_network, destination_reference: args.p_destination_reference,
          instructions: args.p_instructions, min_amount: Number(args.p_min_amount), max_amount: Number(args.p_max_amount),
          is_enabled: Boolean(args.p_is_enabled), display_order: Number(args.p_display_order), archived_at: null,
          updated_at: new Date().toISOString(),
        };
        if (method) Object.assign(method, values);
        else {
          method = { id: `payment-method-${Date.now()}`, created_at: new Date().toISOString(), ...values };
          store.payment_methods.push(method);
        }
        writeStore(store); return { data: method.id, error: null };
      }
      if (name === "archive_payment_method") {
        const store = readStore(); const method = (store.payment_methods || []).find((item) => item.id === args.p_id);
        if (!method) return { data: null, error: { message: "Payment method not found" } };
        Object.assign(method, { is_enabled: false, archived_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        writeStore(store); return { data: null, error: null };
      }
      if (name === "submit_manual_deposit_request") {
        const store = readStore(); const method = (store.payment_methods || []).find((item) => item.id === args.p_payment_method_id && item.is_enabled && !item.archived_at);
        if (!method) return { data: null, error: { message: "Payment method is unavailable" } };
        if ((store.manual_deposit_requests || []).some((item) => item.payment_method_id === method.id && String(item.transaction_reference).toLowerCase() === String(args.p_transaction_reference).toLowerCase())) return { data: null, error: { message: "This transaction reference has already been submitted" } };
        const id = `manual-deposit-${Date.now()}`; store.manual_deposit_requests ||= [];
        store.manual_deposit_requests.push({ id, user_id: ADMIN_ID, payment_method_id: method.id, amount: Number(args.p_amount), transaction_reference: args.p_transaction_reference, user_note: args.p_user_note, proof_file_path: args.p_proof_file_path, risk_score: Number(args.p_amount)>=5000?70:Number(args.p_amount)>=1000?40:10, status: "pending", created_at: new Date().toISOString() });
        writeStore(store); return { data: id, error: null };
      }
      if (name === "submit_manual_withdrawal_request") {
        const store = readStore(); const method = (store.payment_methods || []).find((item) => item.id === args.p_payment_method_id && item.is_enabled && !item.archived_at && item.method_type !== "provider");
        const profile = (store.profiles || []).find((item) => item.id === ADMIN_ID); const amount = Number(args.p_amount || 0);
        if (!method) return { data: null, error: { message: "Withdrawal method is unavailable" } };
        if (!profile || amount <= 0 || amount > Number(profile.demo_balance || 0)) return { data: null, error: { message: "Withdrawable cash balance is insufficient" } };
        const whitelistFlag = (store.feature_flags || []).find((item) => item.key === "withdrawal_address_whitelist");
        if (whitelistFlag?.is_enabled) {
          const address = (store.withdrawal_addresses || []).find((item) => item.user_id === ADMIN_ID && item.payment_method_id === method.id && item.destination_reference === args.p_destination_reference && item.status !== "removed");
          if (!address) return { data: null, error: { message: "Save this withdrawal destination before using it" } };
          if (Date.parse(address.activates_at) > Date.now()) return { data: null, error: { message: `This destination becomes active ${new Date(address.activates_at).toLocaleString()}` } };
          address.status = "active";
        }
        const id = `manual-withdrawal-${Date.now()}`; const before = Number(profile.demo_balance || 0); profile.demo_balance = before - amount;
        store.manual_withdrawal_requests ||= []; store.wallet_transactions ||= [];
        store.manual_withdrawal_requests.push({ id, user_id: ADMIN_ID, payment_method_id: method.id, amount, destination_reference: args.p_destination_reference, user_note: args.p_user_note, risk_score: amount>=5000?85:amount>=1000?60:25, status: "pending", review_note: null, payment_reference: null, created_at: new Date().toISOString() });
        store.wallet_transactions.push({ id: `withdrawal-tx-${Date.now()}`, user_id: ADMIN_ID, type: "withdrawal", amount: -amount, balance_before: before, balance_after: profile.demo_balance, description: "Manual withdrawal funds reserved", reference_id: id, status: "pending", created_at: new Date().toISOString() });
        writeStore(store); return { data: id, error: null };
      }
      if (name === "review_manual_deposit_request") {
        const store = readStore(); const request = (store.manual_deposit_requests || []).find((item) => item.id === args.p_request_id);
        if (!request || !["pending","on_hold"].includes(request.status)) return { data: null, error: { message: "Pending deposit request not found" } };
        if (args.p_status === "approved") {
          store.admin_approval_requests ||= []; store.admin_approval_requests.push({ id: `approval-${Date.now()}`, action_type: "manual_deposit", entity_id: request.id, requested_by: "demo-finance-maker", request_note: args.p_review_note, payload: { amount: request.amount, user_id: request.user_id }, status: "pending", created_at: new Date().toISOString() });
          Object.assign(request, { status: "awaiting_approval", review_note: args.p_review_note, reviewed_by: "demo-finance-maker" });
        } else {
          Object.assign(request, { status: args.p_status, review_note: args.p_review_note, reviewed_at: args.p_status === "rejected" ? new Date().toISOString() : null, reviewed_by: ADMIN_ID });
        }
        writeStore(store); return { data: null, error: null };
      }
      if (name === "review_manual_withdrawal_request") {
        const store = readStore(); const request = (store.manual_withdrawal_requests || []).find((item) => item.id === args.p_request_id);
        if (!request || !["pending","on_hold"].includes(request.status)) return { data: null, error: { message: "Pending withdrawal request not found" } };
        if (args.p_status === "approved") {
          store.admin_approval_requests ||= []; store.admin_approval_requests.push({ id: `approval-${Date.now()}`, action_type: "large_withdrawal", entity_id: request.id, requested_by: "demo-finance-maker", request_note: args.p_review_note, payload: { amount: request.amount, user_id: request.user_id, destination: String(request.destination_reference).slice(-6) }, status: "pending", created_at: new Date().toISOString() });
          Object.assign(request, { status: "awaiting_approval", review_note: args.p_review_note, reviewed_by: "demo-finance-maker" });
        } else if (args.p_status === "rejected") {
          const profile = (store.profiles || []).find((item) => item.id === request.user_id); const before = Number(profile?.demo_balance || 0);
          if (profile) profile.demo_balance = before + Number(request.amount);
          store.wallet_transactions ||= []; store.wallet_transactions.push({ id: `withdrawal-refund-${Date.now()}`, user_id: request.user_id, type: "adjustment", amount: Number(request.amount), balance_before: before, balance_after: before + Number(request.amount), description: "Rejected withdrawal refund", reference_id: request.id, status: "completed", created_at: new Date().toISOString() });
          Object.assign(request, { status: "rejected", review_note: args.p_review_note, reviewed_by: ADMIN_ID, reviewed_at: new Date().toISOString() });
        } else Object.assign(request, { status: "on_hold", review_note: args.p_review_note, reviewed_by: ADMIN_ID });
        writeStore(store); return { data: null, error: null };
      }
      if (name === "decide_admin_approval") {
        const store = readStore(); const approval = (store.admin_approval_requests || []).find((item) => item.id === args.p_approval_id && item.status === "pending");
        if (!approval) return { data: null, error: { message: "Pending approval not found" } };
        if (approval.action_type === "large_withdrawal") {
          const request = (store.manual_withdrawal_requests || []).find((item) => item.id === approval.entity_id);
          if (!request) return { data: null, error: { message: "Withdrawal request not found" } };
          if (args.p_decision === "approved") Object.assign(request, { status: "approved", review_note: args.p_note, reviewed_by: ADMIN_ID, reviewed_at: new Date().toISOString() });
          else {
            const profile = (store.profiles || []).find((item) => item.id === request.user_id); const before = Number(profile?.demo_balance || 0);
            if (profile) profile.demo_balance = before + Number(request.amount);
            store.wallet_transactions ||= []; store.wallet_transactions.push({ id: `withdrawal-refund-${Date.now()}`, user_id: request.user_id, type: "adjustment", amount: Number(request.amount), balance_before: before, balance_after: before + Number(request.amount), description: "Checker rejected withdrawal refund", reference_id: request.id, status: "completed", created_at: new Date().toISOString() });
            Object.assign(request, { status: "rejected", review_note: args.p_note, reviewed_by: ADMIN_ID, reviewed_at: new Date().toISOString() });
          }
        } else {
          const request = (store.manual_deposit_requests || []).find((item) => item.id === approval.entity_id);
          if (!request) return { data: null, error: { message: "Deposit request not found" } };
          if (args.p_decision === "approved") {
            const profile = (store.profiles || []).find((item) => item.id === request.user_id); const before = Number(profile?.demo_balance || 0);
            if (profile) profile.demo_balance = before + Number(request.amount);
            const transactionId = `wallet-transaction-${Date.now()}`; store.wallet_transactions ||= [];
            store.wallet_transactions.push({ id: transactionId, user_id: request.user_id, type: "deposit", amount: Number(request.amount), balance_before: before, balance_after: before + Number(request.amount), description: "Maker-checker approved demo deposit", reference_id: request.id, status: "completed", created_at: new Date().toISOString() });
            Object.assign(request, { status: "approved", wallet_transaction_id: transactionId, reviewed_by: ADMIN_ID, reviewed_at: new Date().toISOString() });
          } else Object.assign(request, { status: "rejected", review_note: args.p_note, reviewed_by: ADMIN_ID, reviewed_at: new Date().toISOString() });
        }
        Object.assign(approval, { status: args.p_decision, decided_by: ADMIN_ID, decision_note: args.p_note, decided_at: new Date().toISOString() });
        writeStore(store); return { data: null, error: null };
      }
      if (name === "save_early_payout_rule") {
        const store = readStore(); store.early_payout_rules ||= [];
        let rule = args.p_id ? store.early_payout_rules.find((item) => item.id === args.p_id) : null;
        const values = { name: args.p_name, sport_slug: args.p_sport_slug, market_type: args.p_market_type, minimum_lead: Number(args.p_minimum_lead), minimum_minute: Number(args.p_minimum_minute), is_enabled: Boolean(args.p_is_enabled), updated_at: new Date().toISOString() };
        if (rule) Object.assign(rule, values); else { rule = { id: `early-rule-${Date.now()}`, created_at: new Date().toISOString(), ...values }; store.early_payout_rules.push(rule); }
        writeStore(store); return { data: rule.id, error: null };
      }
      if (name === "delete_early_payout_rule") {
        const store = readStore(); store.early_payout_rules = (store.early_payout_rules || []).filter((item) => item.id !== args.p_id); writeStore(store); return { data: null, error: null };
      }
      return { data: null, error: null };
    },
    storage: {
      from() {
        return {
          async upload(path: string) { return { data: { path }, error: null }; },
          async createSignedUrl(path: string) {
            return { data: { signedUrl: `data:text/plain;charset=utf-8,PrimeBet%20demo%20KYC%20document%3A%20${encodeURIComponent(path)}` }, error: null };
          },
        };
      },
    },
  };
}
