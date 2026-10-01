import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { REHEARSAL, requireSafe, validateLedger, migrationInventory } from "./neon-rehearsal-manifest.mjs";
import { inspectDatabase } from "./production-database-readiness.mjs";

export function authorization(e) {
  requireSafe(e.P3_BRANCH_ID, "BLOCKED_DISPOSABLE_BRANCH_REQUIRED");
  requireSafe(/^br-[a-z0-9-]{1,57}$/.test(e.P3_BRANCH_ID) && !REHEARSAL.deniedBranches.includes(e.P3_BRANCH_ID), "PRODUCTION_BRANCH_DENIED");
  requireSafe(e.P3_PROJECT_ID === REHEARSAL.project, "PROJECT_DENIED");
  requireSafe(e.P3_REHEARSAL_AUTHORIZATION === REHEARSAL.authorization, "REHEARSAL_AUTHORIZATION_REQUIRED");
  requireSafe(/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(e.P3_RUN_ID ?? ""), "RUN_ID_REQUIRED");
  return { project: e.P3_PROJECT_ID, branchId: e.P3_BRANCH_ID, runId: e.P3_RUN_ID };
}

export function connectionTarget(value, suite, kind) {
  const target = REHEARSAL.suites[suite];
  requireSafe(target && ["operator", "runtime"].includes(kind), "SUITE_DENIED");
  let url;
  try { url = new URL(value); } catch { throw new Error("CONNECTION_CONFIGURATION_INVALID"); }
  requireSafe(["postgres:", "postgresql:"].includes(url.protocol), "CONNECTION_CONFIGURATION_INVALID");
  let database, login;
  try { database = decodeURIComponent(url.pathname.slice(1)); login = decodeURIComponent(url.username); decodeURIComponent(url.password); }
  catch { throw new Error("CONNECTION_CONFIGURATION_INVALID"); }
  requireSafe(database !== REHEARSAL.deniedDatabase, "PRODUCTION_DATABASE_DENIED");
  requireSafe(database === target.database && url.pathname === `/${target.database}`, "DATABASE_BINDING_MISMATCH");
  requireSafe(login === target[kind === "operator" ? "owner" : "runtime"] && url.password.length > 0, "LOGIN_BINDING_MISMATCH");
  const pooled = kind === "runtime";
  requireSafe(/^ep-[a-z0-9-]+\.ap-southeast-1\.aws\.neon\.tech$/.test(url.hostname) &&
    url.hostname.split(".")[0].endsWith("-pooler") === pooled && ["", "5432"].includes(url.port), "PROVIDER_HOST_DENIED");
  requireSafe(!url.hash && url.searchParams.get("sslmode") === "verify-full" &&
    [...url.searchParams.keys()].every(key => ["sslmode", "channel_binding"].includes(key)) &&
    [...url.searchParams.keys()].length === new Set(url.searchParams.keys()).size &&
    (!url.searchParams.has("channel_binding") || url.searchParams.get("channel_binding") === "require"), "TLS_CONFIGURATION_DENIED");
  const params = new pg.Client({ connectionString: url.href }).connectionParameters;
  requireSafe(params.ssl && params.ssl.rejectUnauthorized !== false && params.ssl.checkServerIdentity === undefined, "TLS_CONFIGURATION_DENIED");
  return { url, host: url.hostname, database, login, directHost: url.hostname.replace(/-pooler(?=\.)/, "") };
}

export function validateProvider(auth, provider, ledger) {
  const { branch, endpoints, databases } = provider;
  validateBranch(auth, branch, ledger);
  requireSafe(Array.isArray(endpoints) && endpoints.length === 1, "PROVIDER_COMPUTE_MISMATCH");
  const endpoint = endpoints[0];
  requireSafe(endpoint.branch_id === auth.branchId && endpoint.project_id === auth.project &&
    endpoint.region_id === REHEARSAL.region && endpoint.type === "read_write" && endpoint.disabled === false &&
    typeof endpoint.passwordless_access === "boolean" && ["active", "idle"].includes(endpoint.current_state) &&
    /^ep-[a-z0-9-]+\.ap-southeast-1\.aws\.neon\.tech$/.test(endpoint.host) &&
    !endpoint.host.split(".")[0].endsWith("-pooler") && endpoint.host.split(".")[0] === endpoint.id &&
    ledger.resources.some(r => r.kind === "compute" && r.id === endpoint.id && Date.parse(r.createdAt) === Date.parse(endpoint.created_at)), "PROVIDER_COMPUTE_MISMATCH");
  requireSafe(Array.isArray(databases), "PROVIDER_DATABASE_METADATA_MISMATCH");
  for (const target of Object.values(REHEARSAL.suites)) {
    const matches = databases.filter(db => db.name === target.database);
    requireSafe(matches.length === 1 && matches[0].branch_id === auth.branchId && matches[0].owner_name === target.owner &&
      ledger.resources.some(r => r.kind === "database" && r.id === target.database), "PROVIDER_DATABASE_METADATA_MISMATCH");
  }
  return endpoint;
}

export function validateBranch(auth, branch, ledger, ready = true) {
  requireSafe(branch?.id === auth.branchId && branch.project_id === REHEARSAL.project &&
    !REHEARSAL.deniedBranches.includes(branch.id) && !REHEARSAL.deniedNames.includes(branch.name), "PROVIDER_BRANCH_DENIED");
  requireSafe(branch.name === REHEARSAL.branchName && branch.default === false && branch.protected === false &&
    branch.init_source === "schema-only" && !branch.parent_id && (!ready || branch.current_state === "ready"), "PROVIDER_BRANCH_METADATA_MISMATCH");
  validateLedger(ledger, auth.runId, auth.branchId, false);
  const receipt = ledger.resources.find(r => r.kind === "branch");
  requireSafe(Date.parse(branch.created_at) === Date.parse(receipt.createdAt), "PROVIDER_CREATION_RECEIPT_MISMATCH");
  return branch;
}

export async function cleanupMetadata(e, auth, ledger) {
  requireSafe(e.P3_NEON_API_KEY?.trim(), "PROVIDER_METADATA_CREDENTIAL_REQUIRED");
  let branch;
  try {
    const response = await fetch(`https://console.neon.tech/api/v2/projects/${auth.project}/branches/${auth.branchId}`, {
      method: "GET", redirect: "error", headers: { Authorization: `Bearer ${e.P3_NEON_API_KEY}` }, signal: AbortSignal.timeout(10_000) });
    requireSafe(response.ok, "PROVIDER_METADATA_UNAVAILABLE"); branch = (await response.json()).branch;
  } catch { throw new Error("PROVIDER_METADATA_UNAVAILABLE"); }
  return validateBranch(auth, branch, ledger, false);
}

// Native authenticated GETs only. No caller-supplied snapshots can authorize CLI execution.
export async function providerPreflight(e, auth, ledger) {
  requireSafe(typeof e.P3_NEON_API_KEY === "string" && e.P3_NEON_API_KEY.trim().length > 0, "PROVIDER_METADATA_CREDENTIAL_REQUIRED");
  const base = `https://console.neon.tech/api/v2/projects/${auth.project}/branches/${auth.branchId}`;
  async function get(path) {
    try {
      const response = await fetch(base + path, { method: "GET", redirect: "error",
        headers: { Authorization: `Bearer ${e.P3_NEON_API_KEY}` }, signal: AbortSignal.timeout(10_000) });
      requireSafe(response.ok, "PROVIDER_METADATA_UNAVAILABLE");
      return await response.json();
    } catch { throw new Error("PROVIDER_METADATA_UNAVAILABLE"); }
  }
  const [branch, endpoints, databases] = await Promise.all([get(""), get("/endpoints"), get("/databases")]);
  const provider = { branch: branch.branch, endpoints: endpoints.endpoints, databases: databases.databases };
  return { provider, endpoint: validateProvider(auth, provider, ledger) };
}

export function assertSqlIdentity(facts, target) {
  requireSafe(facts?.database !== REHEARSAL.deniedDatabase, "AUTHENTICATED_PRODUCTION_DATABASE_DENIED");
  requireSafe(facts.database === target.database && facts.current_user === target.login && facts.session_user === target.login &&
    facts.owner === REHEARSAL.suites[target.suite].owner, "AUTHENTICATED_TARGET_MISMATCH");
  requireSafe(Number(facts.version) >= 170000 && Number(facts.version) < 180000 && facts.ssl === true &&
    facts.readonly === "on", "AUTHENTICATED_TRANSPORT_MISMATCH");
}

export async function readOnlyTarget(target, work) {
  const client = new pg.Client({ connectionString: target.url.href, connectionTimeoutMillis: 10_000,
    query_timeout: 7_000, statement_timeout: 5_000, options: "-c default_transaction_read_only=on", application_name: "pyramid-p3-preflight" });
  try {
    await client.connect();
    // Require actual authenticated certificate/hostname validation, not only a URL flag.
    requireSafe(client.connection.stream.encrypted === true && client.connection.stream.authorized === true, "AUTHENTICATED_TLS_REQUIRED");
    await client.query("BEGIN READ ONLY");
    await client.query("SET LOCAL search_path=pg_catalog,public");
    const facts = (await client.query(`SELECT current_database() AS database,current_user,session_user,
      (SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname=current_database()) AS owner,
      current_setting('server_version_num') AS version,current_setting('transaction_read_only') AS readonly,
      (SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS ssl`)).rows[0];
    assertSqlIdentity(facts, target);
    return await work(client, facts);
  } catch (error) {
    // Caller exports only a fixed code; no caught DB message, detail, SQL, topology or row.
    throw new Error(/^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : "READONLY_TARGET_PREFLIGHT_FAILED");
  } finally {
    await client.query("ROLLBACK").catch(() => {});
    await client.end().catch(() => {});
  }
}

// No application SELECTs: rejecting every application relation also rejects rows.
// template0 permits system schemas and plpgsql only. Any additional provider
// structure is an explicit review stop, never an inferred wildcard exemption.
export async function emptyDatabaseFacts(client) {
  const userNamespace = "n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%'";
  const catalog = [
    ["relations", "pg_class", "relnamespace"], ["functions", "pg_proc", "pronamespace"], ["types", "pg_type", "typnamespace"],
    ["operators", "pg_operator", "oprnamespace"], ["opclasses", "pg_opclass", "opcnamespace"], ["opfamilies", "pg_opfamily", "opfnamespace"],
    ["collations", "pg_collation", "collnamespace"], ["conversions", "pg_conversion", "connamespace"],
    ["text_search_configs", "pg_ts_config", "cfgnamespace"], ["text_search_dictionaries", "pg_ts_dict", "dictnamespace"],
    ["text_search_parsers", "pg_ts_parser", "prsnamespace"], ["text_search_templates", "pg_ts_template", "tmplnamespace"],
  ];
  const facts = {};
  for (const [label, table, namespace] of catalog) facts[label] = Number((await client.query(
    `SELECT count(*) AS n FROM ${table} o JOIN pg_namespace n ON n.oid=o.${namespace} WHERE ${userNamespace}`)).rows[0].n);
  const extras = (await client.query(`SELECT
    (SELECT count(*) FROM pg_namespace n WHERE ${userNamespace} AND n.nspname<>'public') AS schemas,
    (SELECT count(*) FROM pg_extension WHERE extname<>'plpgsql') AS extensions,
    (SELECT count(*) FROM pg_event_trigger) AS event_triggers,
    (SELECT count(*) FROM pg_foreign_server) AS foreign_servers,
    (SELECT count(*) FROM pg_foreign_data_wrapper) AS foreign_wrappers,
    (SELECT count(*) FROM pg_publication) AS publications,
    (SELECT count(*) FROM pg_subscription) AS subscriptions,
    (SELECT count(*) FROM pg_largeobject_metadata) AS large_objects,
    (SELECT count(*) FROM pg_default_acl) AS default_acls,
    (SELECT count(*) FROM pg_language WHERE lanname NOT IN ('internal','c','sql','plpgsql')) AS languages,
    (SELECT count(*) FROM pg_transform) AS transforms,
    (SELECT count(*) FROM pg_cast WHERE oid>=16384) AS user_casts,
    (SELECT count(*) FROM pg_class WHERE relname='_prisma_migrations') AS migration_ledgers`)).rows[0];
  return { ...facts, ...Object.fromEntries(Object.entries(extras).map(([key, value]) => [key, Number(value)])) };
}

export function assertEmptyDatabase(facts) {
  const keys = ["relations", "functions", "types", "operators", "opclasses", "opfamilies", "collations", "conversions",
    "text_search_configs", "text_search_dictionaries", "text_search_parsers", "text_search_templates", "schemas", "extensions",
    "event_triggers", "foreign_servers", "foreign_wrappers", "publications", "subscriptions", "large_objects", "default_acls", "languages", "transforms", "user_casts", "migration_ledgers"];
  requireSafe(keys.every(key => facts?.[key] === 0) && Object.keys(facts).length === keys.length, "DATABASE_NOT_MIGRATION_EMPTY");
}

export async function roleFacts(client) {
  const roles = (await client.query(`SELECT rolname,rolcanlogin,rolinherit,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,rolconfig
    FROM pg_roles ORDER BY rolname`)).rows;
  const memberships = (await client.query(`SELECT r.rolname AS role,m.rolname AS member,a.admin_option,a.inherit_option,a.set_option
    FROM pg_auth_members a JOIN pg_roles r ON r.oid=a.roleid JOIN pg_roles m ON m.oid=a.member ORDER BY m.rolname,r.rolname`)).rows;
  const ownership = (await client.query(`SELECT pg_get_userbyid(owner) AS role,count(*)::int AS n FROM (
    SELECT relowner AS owner FROM pg_class UNION ALL SELECT nspowner FROM pg_namespace
    UNION ALL SELECT proowner FROM pg_proc UNION ALL SELECT typowner FROM pg_type
    UNION ALL SELECT datdba FROM pg_database) x GROUP BY owner ORDER BY role`)).rows;
  const databases = (await client.query("SELECT datname AS database,pg_get_userbyid(datdba) AS owner FROM pg_database ORDER BY datname")).rows;
  return { roles, memberships, ownership, databases };
}

export function assertRolePrerequisites(facts, suite, publicRole, stage = "empty") {
  const target = REHEARSAL.suites[suite];
  requireSafe(target && /^b1_public_[a-f0-9]{12}$/.test(publicRole ?? ""), "PUBLIC_TEST_ROLE_REQUIRED");
  if (stage === "empty") requireSafe(!facts.roles.some(role => role.rolname === target.runtime), "PREMATURE_RUNTIME_ROLE_DENIED");
  const expected = {
    anon: { login: false, inherit: false, parents: [] }, authenticated: { login: false, inherit: false, parents: [] },
    pyramid_runtime: { login: false, inherit: true, parents: [] },
    pyramid_reference_locker: { login: false, inherit: true, parents: [] },
    [publicRole]: { login: false, inherit: true, parents: [] },
    [target.owner]: { login: true, inherit: true, parents: [
      { role: "pyramid_reference_locker", admin_option: false, inherit_option: true, set_option: true },
      ...["anon", "authenticated", publicRole].map(role => ({ role, admin_option: false, inherit_option: false, set_option: true })),
    ] },
  };
  if (stage !== "empty") expected[target.runtime] = { login: true, inherit: true,
    parents: [{ role: "pyramid_runtime", admin_option: false, inherit_option: true, set_option: true }] };
  if (stage === "final") expected[target.owner].parents = expected[target.owner].parents.filter(parent => parent.role === "pyramid_reference_locker");
  for (const [name, contract] of Object.entries(expected)) {
    const role = facts.roles.find(row => row.rolname === name);
    requireSafe(role && role.rolcanlogin === contract.login && role.rolinherit === contract.inherit && role.rolconfig === null &&
      ["rolsuper", "rolcreatedb", "rolcreaterole", "rolreplication", "rolbypassrls"].every(flag => role[flag] === false), "ROLE_ATTRIBUTES_MISMATCH");
    const parents = facts.memberships.filter(row => row.member === name).map(({ member: _member, ...parent }) => parent).sort((a,b) => a.role.localeCompare(b.role));
    requireSafe(JSON.stringify(parents) === JSON.stringify(contract.parents.sort((a,b) => a.role.localeCompare(b.role))), "ROLE_MEMBERSHIPS_MISMATCH");
    if (name !== target.owner && !(stage !== "empty" && name === "pyramid_reference_locker")) {
      requireSafe(!(facts.ownership.find(row => row.role === name)?.n), "ROLE_OWNERSHIP_MISMATCH");
    }
  }
  requireSafe(!facts.memberships.some(row => row.member === "pyramid_owner" && [target.owner,target.runtime].includes(row.role)), "BOOTSTRAP_MEMBERSHIP_REMAINS");
  requireSafe(facts.databases.filter(row => row.owner === target.owner).length === 1 &&
    facts.databases.some(row => row.owner === target.owner && row.database === target.database), "OPERATOR_DATABASE_OWNERSHIP_MISMATCH");
  if (stage !== "empty") requireSafe(facts.ownership.find(row => row.role === "pyramid_reference_locker")?.n === 1, "LOCKER_OWNERSHIP_MISMATCH");
  const admins = facts.roles.filter(role => role.rolsuper || role.rolcreatedb || role.rolcreaterole || role.rolreplication || role.rolbypassrls ||
    ["pyramid_owner", "neon_superuser", "neon_auth"].includes(role.rolname)).map(role => role.rolname);
  requireSafe(["pyramid_owner", "neon_superuser"].every(name => admins.includes(name)), "PROVIDER_ADMIN_ROLE_INVENTORY_REQUIRED");
  return admins;
}

export async function validateMigrations(client) {
  const expected = await migrationInventory();
  const rows = (await client.query("SELECT migration_name,checksum,finished_at,rolled_back_at FROM public._prisma_migrations ORDER BY started_at,migration_name")).rows;
  requireSafe(rows.length === 11 && rows.every((row,index) => row.migration_name === expected[index].name && row.finished_at &&
    row.rolled_back_at === null && expected[index].transportChecksums.includes(row.checksum)), "MIGRATION_LEDGER_MISMATCH");
}

export async function remoteContext(e, suite, stage) {
  requireSafe(!existsSync(".env") && !existsSync(".env.local"), "PRIVATE_ENV_FILES_DENIED");
  requireSafe(Number(process.versions.node.split(".")[0]) === 22, "NODE_22_REQUIRED");
  requireSafe(!Object.keys(e).some(key => /^(PG|NODE_OPTIONS$)/.test(key) && e[key]), "AMBIENT_CONNECTION_OVERRIDES_DENIED");
  const auth = authorization(e);
  let ledger;
  try { ledger = JSON.parse(await readFile(e.P3_LEDGER_PATH, "utf8")); } catch { throw new Error("CLEANUP_LEDGER_REQUIRED"); }
  for (const name of [REHEARSAL.suites[suite]?.owner, "pyramid_runtime", "pyramid_reference_locker"])
    requireSafe(ledger.resources?.some(r => r.kind === "role" && r.id === name), "ROLE_CREATION_RECEIPT_REQUIRED");
  const publicRole = e[`P3_${suite.toUpperCase()}_PUBLIC_ROLE`];
  requireSafe(/^b1_public_[a-f0-9]{12}$/.test(publicRole ?? "") && ledger.resources?.some(r => r.kind === "role" && r.id === publicRole), "PUBLIC_TEST_ROLE_REQUIRED");
  const operator = { ...connectionTarget(e[`P3_${suite.toUpperCase()}_OPERATOR_URL`], suite, "operator"), suite };
  const runtime = stage === "empty" ? undefined : { ...connectionTarget(e[`P3_${suite.toUpperCase()}_RUNTIME_URL`], suite, "runtime"), suite };
  assertConnectionPair(operator, runtime);
  const { provider, endpoint } = await providerPreflight(e, auth, ledger);
  requireSafe(operator.directHost === endpoint.host && (!runtime || runtime.directHost === endpoint.host), "PROVIDER_ENDPOINT_BINDING_MISMATCH");
  if (stage !== "empty") validateLedger(ledger, auth.runId, auth.branchId);
  const administrators = await readOnlyTarget(operator, async client => {
    const admins = assertRolePrerequisites(await roleFacts(client), suite, publicRole, stage);
    if (stage === "empty") assertEmptyDatabase(await emptyDatabaseFacts(client));
    else await validateMigrations(client);
    return admins;
  });
  if (runtime) {
    await readOnlyTarget(runtime, async client => {
      const reachable = (await client.query("SELECT rolname FROM pg_roles WHERE oid<>current_user::regrole AND pg_has_role(current_user,oid,'SET') ORDER BY rolname")).rows.map(row => row.rolname);
      requireSafe(JSON.stringify(reachable) === '["pyramid_runtime"]', "RUNTIME_ESCALATION_PATH_DENIED");
    });
    const contract = JSON.parse(await readFile("scripts/production-database-contract.json", "utf8"));
    // Reuse every current catalog/security facet and login-privilege assertion.
    await inspectDatabase(operator.url.href, "operator", contract);
    await inspectDatabase(runtime.url.href, "runtime", contract);
  }
  return { auth, ledger, provider, endpoint, operator, runtime, publicRole, administrators };
}

export function assertConnectionPair(operator, runtime) {
  requireSafe(!runtime || (operator.directHost === runtime.directHost && operator.database === runtime.database && operator.login !== runtime.login), "OPERATOR_RUNTIME_ENDPOINT_MISMATCH");
}

// Explicit gated mode only. The existing local guard blocks remain in the suites.
export async function authorizeRemoteVerifier(suite, e = process.env) {
  const context = await remoteContext(e, suite, "current");
  requireSafe(e.DATABASE_URL === context.runtime.url.href && e.B1_TEST_OWNER_URL === context.operator.url.href &&
    e.DIRECT_URL === "" && e.B1_TEST_PUBLIC_ROLE === context.publicRole, "VERIFIER_CONNECTION_BINDING_MISMATCH");
  return context.administrators;
}
