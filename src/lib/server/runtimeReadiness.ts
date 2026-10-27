export type RuntimeCheck = {
  id: string;
  ready: boolean;
  detail: string;
};

const placeholderPattern = /^(your-|replace-with|https:\/\/your-project|support@example\.com|<[^>]+>|undefined$|null$|changeme$)/i;

export function environmentValueConfigured(name: string) {
  const value = process.env[name]?.trim();
  return Boolean(value && !placeholderPattern.test(value));
}

function allConfigured(...names: string[]) {
  return names.every(environmentValueConfigured);
}

function anyConfigured(...names: string[]) {
  return names.some(environmentValueConfigured);
}

export function getRuntimeReadiness() {
  const checks = {
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  const allPassing = Object.values(checks).every(Boolean);

  return {
    ready: allPassing,
    checks,
    timestamp: new Date().toISOString(),
  };
}

// Alias for backwards compatibility
export const getReadinessStatus = getRuntimeReadiness;
