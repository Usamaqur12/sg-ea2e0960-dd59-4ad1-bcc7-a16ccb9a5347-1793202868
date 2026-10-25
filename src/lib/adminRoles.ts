export const ADMIN_ROLES = [
  "super_admin",
  "admin",
  "finance",
  "kyc",
  "support",
  "risk_manager",
  "sports_trader",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export type AdminArea =
  | "dashboard"
  | "users"
  | "kyc"
  | "bets"
  | "sports"
  | "transactions"
  | "payments"
  | "crypto"
  | "promotions"
  | "support"
  | "risk"
  | "reports"
  | "audit"
  | "monitoring"
  | "trading"
  | "announcements"
  | "brokers"
  | "casino";

const AREA_ROLES: Record<AdminArea, AdminRole[]> = {
  dashboard: ["finance", "kyc", "support", "risk_manager", "sports_trader"],
  users: ["support"],
  kyc: ["kyc"],
  bets: ["risk_manager", "sports_trader"],
  sports: ["sports_trader"],
  transactions: ["finance"],
  payments: ["finance"],
  crypto: ["finance"],
  promotions: ["finance"],
  support: ["support"],
  risk: ["risk_manager"],
  reports: ["finance"],
  audit: [],
  monitoring: [],
  trading: ["sports_trader"],
  announcements: ["support"],
  brokers: ["finance"],
  casino: [],
};

export function isAdminRole(role: string | null | undefined): role is AdminRole {
  return Boolean(role && ADMIN_ROLES.includes(role as AdminRole));
}

export function canAccessAdminArea(
  role: string | null | undefined,
  area: AdminArea
): boolean {
  if (!isAdminRole(role)) return false;
  if (role === "super_admin" || role === "admin") return true;
  return AREA_ROLES[area].includes(role);
}
