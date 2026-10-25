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
  const productionMode = process.env.PRODUCTION_MODE === "true";
  const demoBackendDisabled = process.env.NEXT_PUBLIC_ENABLE_DEMO_BACKEND !== "true";
  const demoPresentationDisabled = process.env.NEXT_PUBLIC_DEMO_MODE === "false";
  const checks: RuntimeCheck[] = [
    { id: "production-mode", ready: productionMode, detail: "PRODUCTION_MODE=true" },
    { id: "strict-startup", ready: process.env.ENFORCE_PRODUCTION_READINESS === "true", detail: "Fail-closed production startup lock" },
    { id: "demo-disabled", ready: demoBackendDisabled && demoPresentationDisabled, detail: "Demo backend and demo presentation are disabled" },
    {
      id: "database-secrets",
      ready:
        environmentValueConfigured("NEXT_PUBLIC_SUPABASE_URL") &&
        anyConfigured("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY") &&
        anyConfigured("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
      detail: "Supabase URL, publishable key and server secret",
    },
    { id: "worker-secrets", ready: allConfigured("SPORTS_FEED_WEBHOOK_SECRET", "SPORTS_PROVIDER_ENCRYPTION_KEY", "CRON_SECRET"), detail: "Sports callbacks, provider encryption and cron authentication" },
    { id: "api-protection", ready: allConfigured("API_RATE_LIMIT_SALT", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"), detail: "Stable privacy salt and distributed rate limiting" },
    { id: "production-branding", ready: allConfigured("NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SUPPORT_EMAIL") && Boolean(process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://")), detail: "Public HTTPS origin and support mailbox" },
    { id: "monitoring", ready: environmentValueConfigured("SENTRY_DSN") || environmentValueConfigured("ERROR_MONITORING_DSN") || environmentValueConfigured("ERROR_MONITORING_WEBHOOK_URL"), detail: "Off-site production error alerting" },
    { id: "kyc-provider", ready: allConfigured("KYC_PROVIDER_BASE_URL", "KYC_PROVIDER_API_KEY", "KYC_WEBHOOK_SECRET"), detail: "Identity, age and AML provider connection" },
    { id: "transactional-email", ready: allConfigured("EMAIL_PROVIDER_API_KEY", "EMAIL_FROM"), detail: "Transactional email provider" },
    { id: "sms-provider", ready: allConfigured("SMS_PROVIDER_API_KEY", "SMS_FROM"), detail: "Transactional SMS provider" },
    { id: "licence", ready: allConfigured("GAMBLING_LICENSE_NUMBER", "GAMBLING_LICENSE_JURISDICTION"), detail: "Operating licence identity" },
  ];

  if (process.env.CRYPTO_DEPOSITS_ENABLED === "true") {
    checks.push({ id: "crypto-provider", ready: allConfigured("NOWPAYMENTS_API_KEY", "NOWPAYMENTS_IPN_SECRET"), detail: "Crypto merchant and signed webhook credentials" });
  }
  if (process.env.CASINO_ENABLED === "true") {
    checks.push({ id: "casino-provider", ready: allConfigured("CASINO_AGGREGATOR_BASE_URL", "CASINO_AGGREGATOR_API_KEY", "CASINO_CALLBACK_SECRET"), detail: "Casino aggregator and callback credentials" });
  }
  if (process.env.WEB_PUSH_ENABLED === "true") {
    checks.push({ id: "web-push", ready: allConfigured("NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY", "WEB_PUSH_PRIVATE_KEY", "WEB_PUSH_SUBJECT"), detail: "Web push VAPID credentials" });
  }

  const failed = checks.filter((check) => !check.ready);
  return { productionMode, productionReady: productionMode && failed.length === 0, checks, failed };
}
