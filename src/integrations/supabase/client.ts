import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { demoClient } from "./demoClient";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const enableDemoBackend = process.env.NEXT_PUBLIC_ENABLE_DEMO_BACKEND === "true";

// Smart fallback: if Supabase is not configured, automatically use demo mode
const isSupabaseConfigured = supabaseUrl.includes("supabase.co") && supabaseAnonKey.startsWith("eyJ");
const shouldUseDemoMode = isDemoMode || enableDemoBackend || !isSupabaseConfigured;

// Export flag for other modules to check
export const isUsingDemoMode = shouldUseDemoMode;

// Create real Supabase client only if configured
let realClient: any = null;
if (isSupabaseConfigured) {
  realClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

// Export the appropriate client
export const supabase = shouldUseDemoMode ? demoClient : (realClient || demoClient);

// Log current mode for debugging
if (typeof window !== "undefined") {
  console.log(`🔧 Supabase Mode: ${shouldUseDemoMode ? "DEMO (using mock data)" : "PRODUCTION (real database)"}`);
  if (!isSupabaseConfigured && !isDemoMode) {
    console.log("ℹ️  Supabase credentials not found - automatically using demo mode");
    console.log("📖 To enable real database: see QUICK_START_URDU.md");
  }
}
