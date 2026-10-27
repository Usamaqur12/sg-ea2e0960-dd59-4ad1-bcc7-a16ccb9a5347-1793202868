import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdminApi } from "@/lib/server/requireAdminApi";
import { hasAccess } from "@/lib/adminRoles";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const adminAuth = await requireAdminApi(req, res);
  if (!adminAuth) return;

  if (!hasAccess(adminAuth.adminRole, "sports_management")) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  const { id: providerId } = req.query;
  const { action } = req.body;

  if (!providerId || typeof providerId !== "string") {
    return res.status(400).json({ error: "Provider ID is required" });
  }

  if (!action || !["enable", "disable", "test", "sync"].includes(action)) {
    return res.status(400).json({ error: "Invalid action" });
  }

  try {
    if (action === "enable") {
      const { data, error } = await supabaseAdmin
        .from("sports_providers")
        .update({ enabled: true, last_modified_by: adminAuth.userId })
        .eq("id", providerId)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, provider: data });
    } else if (action === "disable") {
      const { data, error } = await supabaseAdmin
        .from("sports_providers")
        .update({ enabled: false, last_modified_by: adminAuth.userId })
        .eq("id", providerId)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, provider: data });
    } else if (action === "test") {
      // Test provider connection
      const { data: provider, error: fetchError } = await supabaseAdmin
        .from("sports_providers")
        .select("*")
        .eq("id", providerId)
        .single();

      if (fetchError) throw fetchError;

      // Here you would implement actual provider connection test
      // For now, return success if provider exists
      return res.status(200).json({
        success: true,
        message: "Provider connection test successful",
        provider,
      });
    } else if (action === "sync") {
      // Trigger provider data sync
      const { data: provider, error: fetchError } = await supabaseAdmin
        .from("sports_providers")
        .select("*")
        .eq("id", providerId)
        .single();

      if (fetchError) throw fetchError;

      if (!provider.enabled) {
        return res.status(400).json({ error: "Provider must be enabled before syncing" });
      }

      // Here you would implement actual provider sync logic
      // For now, update last_sync_at timestamp
      const { data, error: updateError } = await supabaseAdmin
        .from("sports_providers")
        .update({ 
          last_sync_at: new Date().toISOString(),
          last_modified_by: adminAuth.userId
        })
        .eq("id", providerId)
        .select()
        .single();

      if (updateError) throw updateError;

      return res.status(200).json({
        success: true,
        message: "Provider sync initiated",
        provider: data,
      });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (error: any) {
    console.error("Provider action error:", error);
    return res.status(500).json({
      error: "Failed to perform provider action",
      details: error.message,
    });
  }
}