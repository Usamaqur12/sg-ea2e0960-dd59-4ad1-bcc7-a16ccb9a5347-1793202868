import type { NextApiRequest, NextApiResponse } from "next";
import { verifyBearerSecret } from "@/lib/server/verifyBearerSecret";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!verifyBearerSecret(req.headers.authorization, process.env.CRON_SECRET || "")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { data: providers, error } = await supabaseAdmin
      .from("sports_providers")
      .select("*")
      .eq("enabled", true);

    if (error) throw error;

    if (!providers || providers.length === 0) {
      return res.status(200).json({
        message: "No enabled providers to sync",
        synced: 0,
      });
    }

    // Here you would implement the actual sync logic
    // For now, just update the last_sync_at timestamp
    const syncResults = await Promise.all(
      providers.map(async (provider) => {
        const { error: updateError } = await supabaseAdmin
          .from("sports_providers")
          .update({ last_sync_at: new Date().toISOString() })
          .eq("id", provider.id);

        return { id: provider.id, success: !updateError };
      })
    );

    return res.status(200).json({
      message: "Sports feed sync completed",
      synced: syncResults.filter((r) => r.success).length,
      results: syncResults,
    });
  } catch (error: any) {
    console.error("Sports feed sync error:", error);
    return res.status(500).json({
      error: "Failed to sync sports feed",
      details: error.message,
    });
  }
}