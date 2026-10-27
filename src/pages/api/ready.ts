import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const checks = {
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  const allPassing = Object.values(checks).every(Boolean);

  try {
    // Test database connection
    const { error } = await supabaseAdmin.from("profiles").select("id").limit(1);
    
    return res.status(200).json({
      ready: allPassing && !error,
      checks,
      database: !error,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(200).json({
      ready: false,
      checks,
      database: false,
      timestamp: new Date().toISOString(),
    });
  }
}