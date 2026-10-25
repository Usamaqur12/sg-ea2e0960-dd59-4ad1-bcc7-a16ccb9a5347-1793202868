import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { adminApiError, requireAdminApi } from "@/lib/server/requireAdminApi";
import { encryptProviderSecret } from "@/lib/server/providerSecrets";
import { providerTypes } from "@/lib/server/sportsProviders";
import { protectApi } from "@/lib/server/apiProtection";

const settingsSchema = z.object({
  leagueId: z.string().trim().max(30).optional(),
  leagueShortcut: z.string().trim().regex(/^[a-z0-9_-]{2,30}$/i).optional(),
  sport: z.string().trim().max(40).optional(),
  latestOnly: z.boolean().optional(),
}).strict();

const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  providerType: z.enum(providerTypes),
  apiKey: z.string().trim().max(500).optional(),
  settings: settingsSchema.default({}),
  isEnabled: z.boolean().default(false),
  priority: z.number().int().min(1).max(1000).default(100),
  syncIntervalSeconds: z.number().int().min(5).max(3600).default(10),
});

const updateSchema = createSchema.partial().extend({
  id: z.string().uuid(),
  removeApiKey: z.boolean().optional(),
});

function publicProvider(row: any) {
  const { encrypted_api_key: encryptedApiKey, ...provider } = row;
  return { ...provider, has_api_key: Boolean(encryptedApiKey) };
}

const publicColumns = "id,name,provider_type,settings,is_enabled,is_demo,priority,sync_interval_seconds,status,last_sync_at,last_success_at,last_error,last_event_count,created_at,updated_at,encrypted_api_key";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!await protectApi(req, res, { scope: "admin-sports-providers", limit: 120, windowMs: 60_000, requireJson: req.method !== "GET" })) return;
  try {
    const { admin, user } = await requireAdminApi(req, "sports");

    if (req.method === "GET") {
      const { data, error } = await (admin as any)
        .from("sports_feed_providers")
        .select(publicColumns)
        .order("priority", { ascending: true });
      if (error) throw error;
      return res.status(200).json({ providers: (data || []).map(publicProvider) });
    }

    if (req.method === "POST") {
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid provider configuration", details: parsed.error.flatten() });
      const value = parsed.data;
      if (!["thesportsdb_demo", "openligadb"].includes(value.providerType) && !value.apiKey) {
        return res.status(400).json({ error: "This provider requires an API key" });
      }
      const record = {
        name: value.name,
        provider_type: value.providerType,
        encrypted_api_key: value.apiKey ? encryptProviderSecret(value.apiKey) : null,
        settings: value.settings,
        is_enabled: value.isEnabled,
        is_demo: value.providerType === "thesportsdb_demo",
        priority: value.priority,
        sync_interval_seconds: value.syncIntervalSeconds,
        status: value.isEnabled ? "not_tested" : "disabled",
        created_by: user.id,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await (admin as any).from("sports_feed_providers").insert(record).select(publicColumns).single();
      if (error) throw error;
      await (admin as any).from("audit_logs").insert({ admin_id: user.id, action: "sports_provider_create", entity_type: "sports_provider", entity_id: data.id, changes: { name: data.name, provider_type: data.provider_type } });
      return res.status(201).json({ provider: publicProvider(data) });
    }

    if (req.method === "PATCH") {
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid provider update", details: parsed.error.flatten() });
      const value = parsed.data;
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (value.name !== undefined) update.name = value.name;
      if (value.providerType !== undefined) {
        update.provider_type = value.providerType;
        update.is_demo = value.providerType === "thesportsdb_demo";
      }
      if (value.settings !== undefined) update.settings = value.settings;
      if (value.isEnabled !== undefined) {
        update.is_enabled = value.isEnabled;
        update.status = value.isEnabled ? "not_tested" : "disabled";
      }
      if (value.priority !== undefined) update.priority = value.priority;
      if (value.syncIntervalSeconds !== undefined) update.sync_interval_seconds = value.syncIntervalSeconds;
      if (value.removeApiKey) update.encrypted_api_key = null;
      else if (value.apiKey) update.encrypted_api_key = encryptProviderSecret(value.apiKey);

      const { data, error } = await (admin as any)
        .from("sports_feed_providers")
        .update(update)
        .eq("id", value.id)
        .select(publicColumns)
        .single();
      if (error) throw error;
      await (admin as any).from("audit_logs").insert({ admin_id: user.id, action: "sports_provider_update", entity_type: "sports_provider", entity_id: data.id, changes: { fields: Object.keys(update).filter((key) => key !== "encrypted_api_key"), credential_changed: "encrypted_api_key" in update } });
      return res.status(200).json({ provider: publicProvider(data) });
    }

    if (req.method === "DELETE") {
      const id = z.string().uuid().safeParse(req.query.id);
      if (!id.success) return res.status(400).json({ error: "Valid provider id is required" });
      const { data, error } = await (admin as any).from("sports_feed_providers").delete().eq("id", id.data).select("id,name").single();
      if (error) throw error;
      await (admin as any).from("audit_logs").insert({ admin_id: user.id, action: "sports_provider_delete", entity_type: "sports_provider", entity_id: data.id, changes: { name: data.name } });
      return res.status(200).json({ deleted: true });
    }

    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Sports provider admin operation failed", error);
    const result = adminApiError(error);
    return res.status(result.statusCode).json({ error: result.message });
  }
}

