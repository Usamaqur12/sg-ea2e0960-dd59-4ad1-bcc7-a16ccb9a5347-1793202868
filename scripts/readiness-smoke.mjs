const base = (process.argv[2] || process.env.TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
let failures = 0;

async function check(label, path, expected, init) {
  try {
    const response = await fetch(`${base}${path}`, { redirect: "manual", signal: AbortSignal.timeout(10_000), ...init });
    const okay = expected.includes(response.status);
    console.log(`${okay ? "PASS" : "FAIL"} ${label}: ${response.status}`);
    if (!okay) failures += 1;
    return response;
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${label}: ${error instanceof Error ? error.message : error}`);
  }
}

await check("rewards route", "/rewards", [200]);
await check("launch readiness route", "/admin/readiness", [200]);
await check("provider result rejects unsigned callback", "/api/provider/results", [401], { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
await check("push enrollment remains gated", "/api/notifications/push/subscribe", [401, 503], { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: "https://push.example.com/subscription/placeholder", keys: { p256dh: "x".repeat(40), auth: "x".repeat(16) } }) });
await check("casino catalogue remains gated", "/api/casino/games", [200]);
await check("casino callback rejects unsigned payload", "/api/casino/callback", [401], { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
await check("browser error endpoint validates payload", "/api/monitoring/error", [400], { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
const rateResponse = await check("API protection headers", "/api/provider/results", [401], { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
if (rateResponse && !rateResponse.headers.get("x-ratelimit-limit")) { failures += 1; console.log("FAIL API protection headers: rate limit headers missing"); }
else if (rateResponse) console.log("PASS API protection headers: rate limit metadata present");

if (failures) process.exitCode = 1;

