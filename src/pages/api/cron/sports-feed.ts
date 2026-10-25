import type { NextApiRequest, NextApiResponse } from "next";
import { createSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { verifyBearerSecret } from "@/lib/server/verifyBearerSecret";
import { syncProvider } from "@/pages/api/admin/sports-providers/[id]/action";
import type { SportsProviderConfig } from "@/lib/server/sportsProviders";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!verifyBearerSecret(req.headers.authorization, process.env.CRON_SECRET)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const admin = createSupabaseAdmin() as any;
    const { data, error } = await admin.from("sports_feed_providers").select("*").eq("is_enabled", true).order("priority", { ascending: true });
    if (error) throw error;
    const now = Date.now();
    const due = (data || []).filter((provider: any) => {
      if (!provider.last_sync_at) return true;
      return now - new Date(provider.last_sync_at).getTime() >= Number(provider.sync_interval_seconds || 10) * 1000;
    });
    const results = [];
    for (const provider of due) {
      try {
        const result = await syncProvider(admin, provider as SportsProviderConfig, "sync");
        results.push({ id: provider.id, ok: true, eventCount: result.eventCount });
      } catch (providerError) {
        results.push({ id: provider.id, ok: false, error: providerError instanceof Error ? providerError.message : "Sync failed" });
      }
    }
    return res.status(200).json({ processed: results.length, skipped: (data || []).length - due.length, results });
  } catch (error) {
    console.error("Sports feed cron failed", error);
    return res.status(500).json({ error: "Sports feed cron failed" });
  }
}

