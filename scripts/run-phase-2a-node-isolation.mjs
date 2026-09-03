const baseUrl = new URL(required("COMPATIBILITY_BASE_URL"));
const secret = required("COMPATIBILITY_PROBE_SECRET");

const stages = [
  ["A", "node-baseline", "NODE_BASELINE_OK"],
  ["B", "pg-import", "PG_IMPORT_OK"],
  ["C", "pg-pool", "PG_POOL_OK"],
  ["D", "pg-query", "PG_QUERY_OK"],
  ["E1", "prisma-runtime-import", "PRISMA_RUNTIME_IMPORT_OK"],
  ["E2", "prisma-client-import", "PRISMA_CLIENT_IMPORT_OK"],
  ["F", "prisma-direct-construct", "PRISMA_DIRECT_CONSTRUCT_OK"],
  ["G", "prisma-direct-query", "PRISMA_DIRECT_QUERY_OK"],
  ["H1", "prisma-adapter-import", "PRISMA_ADAPTER_IMPORT_OK"],
  ["H2", "prisma-adapter-construct", "PRISMA_ADAPTER_CONSTRUCT_OK"],
  [
    "H3",
    "prisma-adapter-prisma-construct",
    "PRISMA_ADAPTER_PRISMA_CONSTRUCT_OK",
  ],
  ["H4", "prisma-adapter-query", "PRISMA_ADAPTER_QUERY_OK"],
];

const results = [];
for (const [stage, slug, expectedCode] of stages) {
  const path = `/api/internal/compatibility/node-isolation/${slug}`;
  const missing = await call(path);
  const incorrect = await call(path, "incorrect");
  const authorized = await call(path, secret);
  const passed =
    missing.status === 401 &&
    missing.code === "UNAUTHORIZED" &&
    incorrect.status === 401 &&
    incorrect.code === "UNAUTHORIZED" &&
    authorized.status === 200 &&
    authorized.code === expectedCode;

  results.push({ stage, path, missing, incorrect, authorized, passed });
}

console.log(JSON.stringify(results, null, 2));

if (results.some((result) => !result.passed)) {
  throw new Error("One or more Phase 2A node-isolation stages failed.");
}

async function call(path, bearer) {
  const response = await fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
  });
  const text = await response.text();
  let code = "EMPTY_RESPONSE";

  if (text) {
    try {
      code = JSON.parse(text).code ?? "UNKNOWN";
    } catch {
      code = "NON_JSON_RESPONSE";
    }
  }

  return { status: response.status, code };
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}
