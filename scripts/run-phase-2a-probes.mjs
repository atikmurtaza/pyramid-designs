const baseUrl = requiredUrl("COMPATIBILITY_BASE_URL");
const probeSecret = required("COMPATIBILITY_PROBE_SECRET");
const cronSecret = process.env.CRON_SECRET;

async function call(
  path,
  { method = "POST", secret = probeSecret, body, expectedStatus = 200 } = {},
) {
  const response = await fetch(new URL(path, baseUrl), {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(body ? { "Content-Type": "application/octet-stream" } : {}),
    },
    body,
  });
  const result = await response.json();
  if (
    response.status !== expectedStatus ||
    (expectedStatus < 400 && result.ok !== true)
  ) {
    throw new Error(`${path} failed with ${response.status} ${result.code ?? "UNKNOWN"}`);
  }
  return result;
}

const results = {
  server: await call("/api/internal/compatibility/server"),
  database: await call("/api/internal/compatibility/database"),
  outbound: await call("/api/internal/compatibility/outbound"),
};

await call("/api/internal/compatibility/revalidation", {
  method: "GET",
});
const cachedFirst = await call("/api/internal/compatibility/revalidation", {
  method: "GET",
});
const cachedSecond = await call("/api/internal/compatibility/revalidation", {
  method: "GET",
});
await call("/api/internal/compatibility/revalidation");
const cachedAfterRevalidation = await call(
  "/api/internal/compatibility/revalidation",
  { method: "GET" },
);
results.revalidation = {
  stableBeforeRevalidation: cachedFirst.marker === cachedSecond.marker,
  changedAfterRevalidation: cachedFirst.marker !== cachedAfterRevalidation.marker,
};
if (
  !results.revalidation.stableBeforeRevalidation ||
  !results.revalidation.changedAfterRevalidation
) {
  throw new Error("Revalidation behavior did not match the expected cache lifecycle.");
}

results.upload = [];
for (const bytes of [1024, 5 * 1024 * 1024, 5 * 1024 * 1024 + 1]) {
  results.upload.push(
    await call("/api/internal/compatibility/upload", {
      body: Buffer.alloc(bytes),
    }),
  );
}
results.upload.push(
  await call("/api/internal/compatibility/upload", {
    body: Buffer.alloc(6 * 1024 * 1024 + 1),
    expectedStatus: 413,
  }),
);
if (
  results.upload[0].receivedBytes !== 1024 ||
  results.upload[1].receivedBytes !== 5 * 1024 * 1024 ||
  results.upload[2].receivedBytes !== 5 * 1024 * 1024 + 1 ||
  results.upload[3].code !== "PROBE_PAYLOAD_TOO_LARGE"
) {
  throw new Error("Upload transport results did not match the expected limits.");
}

if (cronSecret) {
  const firstCron = await call("/api/internal/cron-probe", { secret: cronSecret });
  const secondCron = await call("/api/internal/cron-probe", { secret: cronSecret });
  if (firstCron.firstRecordedAt !== secondCron.firstRecordedAt) {
    throw new Error("Cron probe was not idempotent.");
  }
  results.cron = secondCron;
}

console.log(JSON.stringify(results, null, 2));

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function requiredUrl(name) {
  return new URL(required(name));
}
