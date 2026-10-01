import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import pg from "pg";

const hash = value => createHash("sha256").update(JSON.stringify(value, (_key, item) =>
  typeof item === "string" ? item.replaceAll("\r\n", "\n") : item)).digest("hex");
const schemas = "('public','pyramid_private')";
const roles = ["pyramid_runtime", "pyramid_reference_locker", "anon", "authenticated"];

// Catalog-only SELECTs; no candidate rows, locks, DDL, function execution or writes.
export async function catalogContract(client, runtimeRole = "pyramid_runtime") {
  const queries = {
    relations: `SELECT n.nspname,c.relname,c.relkind,c.relpersistence,
      CASE WHEN c.relkind IN ('v','m') THEN pg_get_viewdef(c.oid,true) ELSE NULL END AS view_definition
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ${schemas} AND c.relkind IN ('r','S','v','m','f') AND c.relname<>'_prisma_migrations'
      ORDER BY n.nspname,c.relname`,
    columns: `SELECT n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity,a.attname,
      format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull,pg_get_expr(d.adbin,d.adrelid) AS default_value
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid
      LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
      WHERE n.nspname IN ${schemas} AND c.relkind='r' AND c.relname<>'_prisma_migrations' AND a.attnum>0 AND NOT a.attisdropped
      ORDER BY n.nspname,c.relname,a.attnum`,
    constraints: `SELECT n.nspname,c.relname,k.conname,pg_get_constraintdef(k.oid,true) AS definition,k.convalidated
      FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ${schemas} AND c.relname<>'_prisma_migrations' ORDER BY n.nspname,c.relname,k.conname`,
    indexes: `SELECT n.nspname,c.relname,pg_get_indexdef(i.indexrelid) AS definition,i.indisvalid,i.indisready
      FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ${schemas} AND c.relname<>'_prisma_migrations' ORDER BY n.nspname,c.relname,definition`,
    policies: `SELECT schemaname,tablename,policyname,permissive,roles::text[],cmd,qual,with_check
      FROM pg_policies WHERE schemaname IN ${schemas} ORDER BY schemaname,tablename,policyname`,
    functions: `SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,
      pg_get_functiondef(p.oid) AS definition,CASE WHEN p.proowner='pyramid_reference_locker'::regrole THEN 'locker' ELSE 'operator' END AS owner
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ${schemas}
      ORDER BY n.nspname,p.proname,arguments`,
    triggers: `SELECT n.nspname,c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid,true) AS definition
      FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ${schemas} AND NOT t.tgisinternal ORDER BY n.nspname,c.relname,t.tgname`,
    enums: `SELECT n.nspname,t.typname,e.enumlabel,e.enumsortorder FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid
      JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname IN ${schemas} ORDER BY n.nspname,t.typname,e.enumsortorder`,
  };
  const facets = {};
  for (const [name, sql] of Object.entries(queries)) {
    const rows = (await client.query(sql)).rows;
    facets[name] = { rows: rows.length, sha256: hash(rows) };
  }
  const privileges = [];
  const tables = (await client.query(`SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND c.relname<>'_prisma_migrations' ORDER BY c.relname`)).rows;
  for (const role of roles) {
    const effectiveRole = role === "pyramid_runtime" ? runtimeRole : role;
    const rows = (await client.query(`SELECT c.relname,a.attname,p.permission,has_column_privilege($1,c.oid,a.attnum,p.permission) AS allowed
      FROM pg_class c JOIN pg_attribute a ON a.attrelid=c.oid
      CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('REFERENCES')) p(permission)
      WHERE c.relnamespace='public'::regnamespace AND c.relkind='r' AND c.relname<>'_prisma_migrations' AND a.attnum>0 AND NOT a.attisdropped
      ORDER BY c.relname,a.attnum,p.permission`, [effectiveRole])).rows;
    for (const table of tables) for (const permission of ["SELECT","INSERT","UPDATE","DELETE","TRUNCATE","REFERENCES","TRIGGER"])
      rows.push({ table: table.relname, permission, allowed: (await client.query("SELECT has_table_privilege($1,$2::oid,$3) AS allowed", [effectiveRole,table.oid,permission])).rows[0].allowed });
    const functions = (await client.query(`SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,
      has_function_privilege($1,p.oid,'EXECUTE') AS allowed FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname IN ${schemas} ORDER BY n.nspname,p.proname,arguments`, [effectiveRole])).rows;
    privileges.push({role, rows, functions});
  }
  facets.privileges = { rows: privileges.length, sha256: hash(privileges) };
  return facets;
}

export async function inspectDatabase(connectionString, mode, expected) {
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000, query_timeout: 5000,
    statement_timeout: 3000, options: "-c default_transaction_read_only=on", application_name: "pyramid-readonly-readiness" });
  try {
    await client.connect();
    await client.query("BEGIN READ ONLY");
    assert.equal((await client.query("SHOW transaction_read_only")).rows[0].transaction_read_only, "on");
    await client.query("SET LOCAL search_path = pg_catalog, public");
    const version = Number((await client.query("SHOW server_version_num")).rows[0].server_version_num);
    assert(version >= 170000 && version < 180000, "PostgreSQL 17 acceptance required");
    const identity = (await client.query("SELECT current_user,session_user,current_database() AS database")).rows[0];
    const connection = new URL(connectionString);
    // Supavisor authenticates role.project-ref but PostgreSQL reports only role.
    const loginName = decodeURIComponent(connection.username);
    assert.equal(identity.current_user, connection.hostname.endsWith(".pooler.supabase.com")
      ? loginName.slice(0, loginName.lastIndexOf(".")) : loginName);
    assert.equal(identity.session_user, identity.current_user);
    const login = (await client.query("SELECT rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication FROM pg_roles WHERE rolname=current_user")).rows[0];
    if (mode === "runtime") {
      assert(Object.values(login).every(flag => flag === false));
      const reachable = (await client.query("SELECT rolname FROM pg_roles WHERE oid<>current_user::regrole AND pg_has_role(current_user,oid,'SET') ORDER BY rolname")).rows.map(row=>row.rolname);
      assert.deepEqual(reachable, ["pyramid_runtime"]);
      const ownership = (await client.query(`SELECT
        (SELECT count(*) FROM pg_class WHERE pg_has_role(current_user,relowner,'USAGE')) +
        (SELECT count(*) FROM pg_namespace WHERE pg_has_role(current_user,nspowner,'USAGE')) +
        (SELECT count(*) FROM pg_proc WHERE pg_has_role(current_user,proowner,'USAGE')) +
        (SELECT count(*) FROM pg_database WHERE pg_has_role(current_user,datdba,'USAGE')) AS n`)).rows[0].n;
      assert.equal(Number(ownership), 0);
      const authority = (await client.query(`SELECT has_database_privilege(current_user,current_database(),'CREATE') AS create_db,
        has_database_privilege(current_user,current_database(),'TEMP') AS temp_db,
        has_schema_privilege(current_user,'public','CREATE') AS public_create,
        has_schema_privilege(current_user,'pyramid_private','CREATE') AS private_create,
        EXISTS (SELECT 1 FROM pg_namespace WHERE has_schema_privilege(current_user,oid,'CREATE')) AS any_schema_create,
        has_table_privilege(current_user,'public._prisma_migrations','SELECT,INSERT,UPDATE,DELETE') AS ledger`)).rows[0];
      assert(Object.values(authority).every(flag => flag === false));
      const membership = (await client.query("SELECT admin_option,roleid='pyramid_runtime'::regrole AS allowed FROM pg_auth_members WHERE member=current_user::regrole")).rows;
      assert(membership.every(row=>row.admin_option === false && row.allowed));
    } else {
      assert.equal((await client.query(`SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname IN ${schemas} AND c.relkind IN ('r','S','v','m','f') AND c.relowner<>current_user::regrole`)).rows[0].n,0);
      assert.equal((await client.query(`SELECT count(*)::int AS n FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname IN ${schemas} AND p.proowner<>current_user::regrole
        AND NOT (n.nspname='pyramid_private' AND p.proname='lock_reference' AND p.proowner='pyramid_reference_locker'::regrole)`)).rows[0].n,0);
      const ledger = (await client.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM public._prisma_migrations ORDER BY started_at,migration_name')).rows;
      const applied = ledger.filter(row=>row.rolled_back_at === null);
      const names = (await readdir("prisma/migrations",{withFileTypes:true})).filter(e=>e.isDirectory()).map(e=>e.name).sort();
      assert.equal(applied.length,names.length);
      for (const name of names) {
        const row = applied.find(row=>row.migration_name===name);
        assert(row?.finished_at, "Migration incomplete");
        const sql = await readFile(`prisma/migrations/${name}/migration.sql`,"utf8");
        const sums = [sql,sql.replaceAll("\r\n","\n"),sql.replaceAll("\r\n","\n").replaceAll("\n","\r\n")]
          .map(text=>createHash("sha256").update(text).digest("hex"));
        assert(sums.includes(row.checksum),"Migration checksum mismatch");
      }
    }
    const roleFlags = (await client.query(`SELECT rolname,rolcanlogin,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication
      FROM pg_roles WHERE rolname IN ('pyramid_runtime','pyramid_reference_locker') ORDER BY rolname`)).rows;
    assert.equal(roleFlags.length,2);
    assert(roleFlags.every(row=>Object.entries(row).every(([key,value])=>key==="rolname" || value===false)));
    assert.equal((await client.query(`SELECT count(*)::int AS n FROM pg_class WHERE relowner IN ('pyramid_runtime'::regrole,'pyramid_reference_locker'::regrole)`)).rows[0].n,0);
    assert.equal((await client.query(`SELECT count(*)::int AS n FROM pg_namespace WHERE nspowner IN ('pyramid_runtime'::regrole,'pyramid_reference_locker'::regrole)`)).rows[0].n,0);
    assert.equal((await client.query(`SELECT count(*)::int AS n FROM pg_database WHERE datdba IN ('pyramid_runtime'::regrole,'pyramid_reference_locker'::regrole)`)).rows[0].n,0);
    assert.equal((await client.query(`SELECT count(*)::int AS n FROM pg_proc WHERE proowner IN ('pyramid_runtime'::regrole,'pyramid_reference_locker'::regrole)
      AND NOT (oid='pyramid_private.lock_reference(text,uuid)'::regprocedure AND proowner='pyramid_reference_locker'::regrole)`)).rows[0].n,0);
    for (const role of ["pyramid_runtime","pyramid_reference_locker"]) {
      const authority = (await client.query(`SELECT has_database_privilege($1,current_database(),'CREATE') AS create_db,
        has_database_privilege($1,current_database(),'TEMP') AS temp_db,
        EXISTS (SELECT 1 FROM pg_namespace WHERE has_schema_privilege($1,oid,'CREATE')) AS create_schema`,[role])).rows[0];
      assert(Object.values(authority).every(flag=>flag===false));
    }
    assert.equal((await client.query("SELECT count(*)::int AS n FROM pg_auth_members WHERE member IN ('pyramid_runtime'::regrole,'pyramid_reference_locker'::regrole)")).rows[0].n,0);
    const badDefaults = (await client.query(`SELECT count(*)::int AS n FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
      WHERE (d.defaclnamespace=0 OR d.defaclnamespace IN ('public'::regnamespace,'pyramid_private'::regnamespace))
      AND a.grantee IN (0,'anon'::regrole,'authenticated'::regrole,'pyramid_runtime'::regrole)`)).rows[0].n;
    assert.equal(badDefaults,0);
    const grantOptions = (await client.query(`SELECT count(*)::int AS n FROM (
      SELECT relacl AS acl FROM pg_class UNION ALL SELECT attacl FROM pg_attribute
      UNION ALL SELECT proacl FROM pg_proc UNION ALL SELECT nspacl FROM pg_namespace UNION ALL SELECT datacl FROM pg_database
      ) objects CROSS JOIN LATERAL aclexplode(objects.acl) a
      WHERE a.is_grantable AND a.grantee IN ($1::regrole,'pyramid_runtime'::regrole,'pyramid_reference_locker'::regrole)`,
      [mode==="runtime" ? identity.current_user : "pyramid_runtime"])).rows[0].n;
    assert.equal(grantOptions,0);
    assert.equal((await client.query(`SELECT count(*)::int AS n FROM pg_class WHERE relnamespace='public'::regnamespace
      AND relkind='r' AND NOT relrowsecurity`)).rows[0].n,0);
    const actual = await catalogContract(client,mode==="runtime" ? identity.current_user : "pyramid_runtime");
    assert.deepEqual(actual,expected,"Catalog/security contract drift");
    await client.query("ROLLBACK");
    return { ok:true, mode, postgresMajor:17, migrations:mode==="operator" ? 11 : "operator-only", facets:Object.keys(actual).length, readOnly:true };
  } finally { await client.end().catch(()=>{}); }
}

export function validateTarget(value,mode,local,project,host) {
  const url = new URL(value);
  assert(["runtime","operator"].includes(mode));
  assert(["postgres:","postgresql:"].includes(url.protocol));
  assert(!url.hash);
  if (local) {
    assert(["127.0.0.1","localhost"].includes(url.hostname));
    assert.equal(url.port,"55442");
    assert(/^\/phase2ib_b1r1_b[24]_[a-z0-9_]+$/.test(url.pathname));
  } else {
    assert(/^[a-z]{20}$/.test(project ?? ""));
    assert.equal(url.hostname,host,"Independently approved Supabase host required");
    if (host === `db.${project}.supabase.co`) {
      assert(/^[a-z][a-z0-9_]*$/.test(decodeURIComponent(url.username)));
    } else {
      assert(/^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(host ?? ""));
      assert(new RegExp(`^[a-z][a-z0-9_]*\\.${project}$`).test(decodeURIComponent(url.username)));
    }
    assert.equal(url.pathname,"/postgres");
    assert.equal(url.searchParams.get("sslmode"),"verify-full");
    assert.equal(url.searchParams.getAll("sslmode").length,1);
    assert([...url.searchParams.keys()].every(k=>k==="sslmode"));
    assert(["","5432"].includes(url.port));
    assert.notEqual(process.env.NODE_TLS_REJECT_UNAUTHORIZED,"0");
  }
  assert(url.username && url.pathname.length>1);
  return url.href;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args=process.argv.slice(2),mode=args.includes("--operator") ? "operator" : "runtime";
    assert(args.includes("--runtime") !== args.includes("--operator"));
    assert(args.includes("--local") !== args.includes("--supabase-read-only"));
    const project=args.find(a=>a.startsWith("--expected-project="))?.split("=")[1];
    const host=args.find(a=>a.startsWith("--expected-host="))?.split("=")[1];
    assert(args.every(a=>["--operator","--runtime","--local","--supabase-read-only"].includes(a) || a.startsWith("--expected-project=") || a.startsWith("--expected-host=")));
    const target=validateTarget(process.env[mode==="runtime" ? "DATABASE_URL" : "DIRECT_URL"],mode,args.includes("--local"),project,host);
    const expected=JSON.parse(await readFile("scripts/production-database-contract.json","utf8"));
    console.log(JSON.stringify(await inspectDatabase(target,mode,expected)));
  } catch {
    console.error("PRODUCTION_DATABASE_READINESS_FAILED: target, identity, permissions, history or catalog contract requires review.");
    process.exitCode=1;
  }
}
