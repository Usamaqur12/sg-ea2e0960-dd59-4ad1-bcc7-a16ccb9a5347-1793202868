import type { NextApiRequest, NextApiResponse } from "next";
import { createSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { getRuntimeReadiness } from "@/lib/server/runtimeReadiness";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ status: "error" });
  }

  const runtime = getRuntimeReadiness();
  let databaseReady = false;
  if (runtime.productionMode && runtime.failed.every((item) => item.id !== "database-secrets")) {
    try {
      const admin = createSupabaseAdmin();
      const { error } = await admin.from("profiles").select("id", { count: "exact", head: true });
      databaseReady = !error;
    } catch {
      databaseReady = false;
    }
  }

  const ready = runtime.productionMode ? runtime.productionReady && databaseReady : true;
  res.setHeader("Cache-Control", "no-store");
  return res.status(ready ? 200 : 503).json({
    status: ready ? (runtime.productionMode ? "ready" : "development") : "not_ready",
    productionMode: runtime.productionMode,
    productionReady: runtime.productionMode && runtime.productionReady && databaseReady,
    databaseReady: runtime.productionMode ? databaseReady : null,
    failedChecks: runtime.failed.map((item) => item.id),
    timestamp: new Date().toISOString(),
  });
}
