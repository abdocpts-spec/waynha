#!/usr/bin/env node
/**
 * قاعدة بيانات PostgreSQL محلية للتطوير، بدون تثبيت على النظام.
 * تستخدم ملفات PostgreSQL التي نزلت مع الحزمة @embedded-postgres/windows-x64.
 *
 *   npm run db:start    تشغيل الخادم (يبقى شغالاً في الخلفية)
 *   npm run db:stop     إيقافه
 *   npm run db:status   حالته
 *
 * بيانات القاعدة في .postgres/ داخل المشروع (متجاهَلة في git).
 * في الإنتاج استخدم PostgreSQL حقيقي وحدّث DATABASE_URL فقط.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// PostgreSQL على ويندوز لا يقبل المسارات غير الإنجليزية (مسار المشروع فيه "وينها")،
// فنشغّل القاعدة من مجلد إنجليزي داخل مجلد المستخدم.
const pathIsAscii = (p) => /^[\x20-\x7E]*$/.test(p);
const baseDir = pathIsAscii(root) ? path.join(root, ".postgres") : path.join(os.homedir(), ".waynha-postgres");

const dataDir = path.join(baseDir, "data");
const logFile = path.join(baseDir, "server.log");
const pwFile = path.join(baseDir, "pw.txt");

const PORT = process.env.WAYNHA_DB_PORT ?? "5433";
const USER = "waynha";
const PASSWORD = "waynha_dev";
const DATABASE = "waynha";

function binDir() {
  const os = process.platform === "win32" ? "windows" : process.platform;
  const platformPackage = `@embedded-postgres/${os}-${process.arch}`;

  const candidates = [path.join(root, "node_modules", ...platformPackage.split("/"), "native", "bin")];
  try {
    // الحزمة ESM: نصل لمجلدها عبر نقطة الدخول
    candidates.push(path.join(path.dirname(require.resolve(platformPackage)), "..", "native", "bin"));
  } catch {
    // نتجاهل: نعتمد على المسار الأول
  }

  const exe = process.platform === "win32" ? ".exe" : "";
  const found = candidates.find((candidate) => fs.existsSync(path.join(candidate, `initdb${exe}`)));
  if (!found) {
    console.error(`لم نلقَ ملفات PostgreSQL (${platformPackage}). شغّل: npm install`);
    process.exit(1);
  }
  if (pathIsAscii(found)) return found;

  // ننسخ ملفات PostgreSQL مرة واحدة إلى مسار إنجليزي حتى تعمل على ويندوز
  const localBin = path.join(baseDir, "pg", "bin");
  if (!fs.existsSync(path.join(localBin, `initdb${exe}`))) {
    console.log("ننسخ ملفات PostgreSQL إلى مسار إنجليزي (مرة واحدة، ~100MB) ...");
    fs.cpSync(path.join(found, ".."), path.join(baseDir, "pg"), { recursive: true, dereference: true });
  }
  return localBin;
}

function run(command, args, options = {}) {
  const result = spawnSync(path.join(binDir(), command), args, {
    stdio: options.quiet ? "pipe" : "inherit",
    encoding: "utf8",
    ...options,
  });
  return result;
}

function isRunning() {
  const result = run("pg_ctl", ["status", "-D", dataDir], { quiet: true });
  return result.status === 0;
}

function initialise() {
  if (fs.existsSync(path.join(dataDir, "PG_VERSION"))) return;
  fs.mkdirSync(path.dirname(dataDir), { recursive: true });
  fs.writeFileSync(pwFile, PASSWORD, "utf8");
  console.log("تهيئة قاعدة بيانات جديدة في .postgres ...");
  const result = run("initdb", [
    "-D", dataDir,
    "-U", USER,
    `--pwfile=${pwFile}`,
    "--encoding=UTF8",
    "--locale=C",
    "--auth=scram-sha-256",
  ]);
  fs.rmSync(pwFile, { force: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function start() {
  initialise();
  if (isRunning()) {
    console.log(`PostgreSQL شغال أصلاً على المنفذ ${PORT}.`);
    return;
  }
  const result = run("pg_ctl", [
    "start",
    "-D", dataDir,
    "-l", logFile,
    "-o", `-p ${PORT} -c listen_addresses=127.0.0.1`,
    "-w",
  ]);
  if (result.status !== 0) {
    console.error(`فشل التشغيل. راجع ${logFile}`);
    process.exit(result.status ?? 1);
  }
  ensureDatabase();
  console.log(`\nPostgreSQL جاهز على 127.0.0.1:${PORT}`);
  console.log(`DATABASE_URL="postgresql://${USER}:${PASSWORD}@127.0.0.1:${PORT}/${DATABASE}"`);
}

function ensureDatabase() {
  const env = { ...process.env, PGPASSWORD: PASSWORD };
  const exists = run("psql", [
    "-h", "127.0.0.1", "-p", PORT, "-U", USER, "-d", "postgres",
    "-tAc", `SELECT 1 FROM pg_database WHERE datname = '${DATABASE}'`,
  ], { quiet: true, env });

  if ((exists.stdout ?? "").trim() !== "1") {
    run("createdb", ["-h", "127.0.0.1", "-p", PORT, "-U", USER, DATABASE], { env });
    console.log(`أنشأنا قاعدة البيانات "${DATABASE}".`);
  }
}

function stop() {
  if (!isRunning()) {
    console.log("PostgreSQL متوقف أصلاً.");
    return;
  }
  run("pg_ctl", ["stop", "-D", dataDir, "-m", "fast", "-w"]);
}

function status() {
  console.log(isRunning() ? `شغال على المنفذ ${PORT}` : "متوقف");
}

const command = process.argv[2];
if (command === "start") start();
else if (command === "stop") stop();
else if (command === "status") status();
else {
  console.log("الاستخدام: node scripts/db.mjs start|stop|status");
  process.exit(1);
}
