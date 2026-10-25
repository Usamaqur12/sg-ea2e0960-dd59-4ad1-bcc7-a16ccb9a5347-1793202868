import type { NextApiRequest, NextApiResponse } from "next";
import { protectApi } from "@/lib/server/apiProtection";
import { adminApiError, requireAdminApi } from "@/lib/server/requireAdminApi";
import { getRuntimeReadiness } from "@/lib/server/runtimeReadiness";

type ReadinessItem = { id: string; label: string; ready: boolean; detail: string; owner: "development" | "external" };

function configured(name: string) {
  const value = process.env[name]?.trim();
  return Boolean(value && !/^(your-|replace-with|https:\/\/your-project|support@example\.com)/i.test(value));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!await protectApi(req, res, { scope: "admin-readiness", limit: 60, windowMs: 60_000 })) return;
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ error: "Method not allowed" }); }
  try {
    const { admin } = await requireAdminApi(req, "monitoring");
    const [providers, paymentMethod, pushSubscriptions, casinoProviders, casinoGames] = await Promise.all([
      (admin as any).from("sports_feed_providers").select("id,is_demo,is_enabled,status").eq("is_enabled", true),
      (admin as any).from("payment_methods").select("id").eq("provider_code", "nowpayments").eq("is_enabled", true).is("archived_at", null).maybeSingle(),
      (admin as any).from("push_subscriptions").select("id", { count: "exact", head: true }).eq("is_active", true),
      (admin as any).from("casino_providers").select("id,status").eq("is_enabled", true).eq("is_demo", false),
      (admin as any).from("casino_games").select("id", { count: "exact", head: true }).eq("is_active", true),
    ]);
    const productionProviders = (providers.data || []).filter((provider: any) => !provider.is_demo);
    const healthyProductionProviders = productionProviders.filter((provider: any) => provider.status === "healthy");
    const runtime = getRuntimeReadiness();
    const items: ReadinessItem[] = [
      ...runtime.checks.map((check) => ({ id: check.id, label: check.detail, ready: check.ready, detail: check.ready ? "Configured" : "Production configuration required", owner: check.id === "licence" || check.id.includes("provider") || check.id === "kyc-provider" ? "external" as const : "development" as const })),
      { id: "sports-provider", label: "Primary sports provider", ready: productionProviders.length >= 1 && healthyProductionProviders.length >= 1, detail: productionProviders.length ? `${healthyProductionProviders.length}/${productionProviders.length} production providers healthy` : "No paid production provider enabled", owner: "external" },
      { id: "feed-failover", label: "Sports provider failover", ready: healthyProductionProviders.length >= 2, detail: `${healthyProductionProviders.length} healthy production providers; two are required for failover`, owner: "external" },
      { id: "crypto", label: "Crypto deposit provider", ready: process.env.CRYPTO_DEPOSITS_ENABLED === "true" && configured("NOWPAYMENTS_API_KEY") && configured("NOWPAYMENTS_IPN_SECRET") && Boolean(paymentMethod.data), detail: "Provider keys, signed webhook and enabled admin method", owner: "external" },
      { id: "push", label: "Web push delivery", ready: process.env.WEB_PUSH_ENABLED === "true" && configured("NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY") && configured("WEB_PUSH_PRIVATE_KEY"), detail: `${pushSubscriptions.count || 0} active device subscriptions`, owner: "development" },
      { id: "casino", label: "Casino aggregator", ready: process.env.CASINO_ENABLED === "true" && configured("CASINO_AGGREGATOR_BASE_URL") && configured("CASINO_AGGREGATOR_API_KEY") && configured("CASINO_CALLBACK_SECRET") && (casinoProviders.data || []).some((provider: any) => provider.status === "healthy") && Number(casinoGames.count || 0) > 0, detail: `${casinoProviders.data?.length || 0} enabled production providers, ${casinoGames.count || 0} active games`, owner: "external" },
    ];
    const ready = items.filter((item) => item.ready).length;
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ generatedAt: new Date().toISOString(), score: Math.round((ready / items.length) * 100), ready, total: items.length, items });
  } catch (error) {
    const result = adminApiError(error);
    return res.status(result.statusCode).json({ error: result.message });
  }
}

