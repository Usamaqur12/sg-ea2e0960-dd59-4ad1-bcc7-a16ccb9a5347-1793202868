export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || "PrimeBet",
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== "false",
  currency: process.env.NEXT_PUBLIC_DISPLAY_CURRENCY || "USD",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@example.com",
} as const;
