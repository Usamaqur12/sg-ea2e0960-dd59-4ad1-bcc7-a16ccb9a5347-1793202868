import type { NextApiRequest } from "next";
import { canAccessAdminArea, type AdminArea } from "@/lib/adminRoles";
import { createSupabaseAdmin } from "@/lib/server/supabaseAdmin";

function bearerToken(value: string | undefined) {
  if (!value?.startsWith("Bearer ")) return null;
  return value.slice(7).trim() || null;
}

function jwtPayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split(".")[1];
    return payload ? JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) : {};
  } catch {
    return {};
  }
}

export async function requireAdminApi(req: NextApiRequest, area: AdminArea) {
  const token = bearerToken(req.headers.authorization);
  if (!token) throw Object.assign(new Error("Authentication required"), { statusCode: 401 });

  const admin = createSupabaseAdmin();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) {
    throw Object.assign(new Error("Invalid or expired admin session"), { statusCode: 401 });
  }

  const claims = jwtPayload(token);
  if (claims.aal !== "aal2") {
    throw Object.assign(new Error("Two-factor authentication is required"), { statusCode: 403 });
  }

  const { data: profile, error: profileError } = await (admin as any)
    .from("profiles")
    .select("admin_role,is_suspended")
    .eq("id", authData.user.id)
    .single();
  if (profileError || !profile || profile.is_suspended || !canAccessAdminArea(profile.admin_role, area)) {
    throw Object.assign(new Error("Admin permission required"), { statusCode: 403 });
  }

  return { admin, user: authData.user, role: profile.admin_role as string };
}

export function adminApiError(error: unknown) {
  const statusCode = typeof (error as any)?.statusCode === "number" ? (error as any).statusCode : 500;
  const message = error instanceof Error ? error.message : "Unexpected server error";
  return { statusCode, message: statusCode >= 500 ? "Provider operation failed" : message };
}

