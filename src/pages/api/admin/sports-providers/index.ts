import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdminApi } from "@/lib/server/requireAdminApi";
import { hasAccess } from "@/lib/adminRoles";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const adminAuth = await requireAdminApi(req, res);
  if (!adminAuth) return;

  if (!hasAccess(adminAuth.adminRole, "sports_management")) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  if (req.method === "GET") {
    try {
      const { data, error } = await supabaseAdmin
        .from("sports_providers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.status(200).json({ providers: data || [] });
    } catch (error: any) {
      console.error("Failed to fetch providers:", error);
      return res.status(500).json({
        error: "Failed to fetch providers",
        details: error.message,
      });
    }
  }

  if (req.method === "POST") {
    try {
      const { name, type, base_url, api_key, config } = req.body;

      if (!name || !type) {
        return res.status(400).json({ error: "Name and type are required" });
      }

      const { data, error } = await supabaseAdmin.from("sports_providers").insert({
        name,
        type,
        base_url,
        api_key,
        config: config || {},
        enabled: false,
        created_by: adminAuth.userId
      }).select().single();

      if (error) throw error;

      return res.status(201).json({ provider: data });
    } catch (error: any) {
      console.error("Failed to create provider:", error);
      return res.status(500).json({
        error: "Failed to create provider",
        details: error.message,
      });
    }
  }

  if (req.method === "PUT") {
    try {
      const { id, name, type, base_url, api_key, config, enabled } = req.body;

      if (!id) {
        return res.status(400).json({ error: "Provider ID is required" });
      }

      const updateData: any = { last_modified_by: adminAuth.userId };
      if (name !== undefined) updateData.name = name;
      if (type !== undefined) updateData.type = type;
      if (base_url !== undefined) updateData.base_url = base_url;
      if (api_key !== undefined) updateData.api_key = api_key;
      if (config !== undefined) updateData.config = config;
      if (enabled !== undefined) updateData.enabled = enabled;

      const { data, error } = await supabaseAdmin
        .from("sports_providers")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({ provider: data });
    } catch (error: any) {
      console.error("Failed to update provider:", error);
      return res.status(500).json({
        error: "Failed to update provider",
        details: error.message,
      });
    }
  }

  if (req.method === "DELETE") {
    try {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ error: "Provider ID is required" });
      }

      const { error } = await supabaseAdmin
        .from("sports_providers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("Failed to delete provider:", error);
      return res.status(500).json({
        error: "Failed to delete provider",
        details: error.message,
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}