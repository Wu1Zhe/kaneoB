import { spawn, spawnSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pidFile = path.join(root, ".dev-local.pid");
const apiDir = path.join(root, "apps", "api");
const webDir = path.join(root, "apps", "web");

const tsxCli = path.join(apiDir, "node_modules", "tsx", "dist", "cli.mjs");
const vpCli = path.join(webDir, "node_modules", "vite-plus", "bin", "vp");

writeFileSync(pidFile, String(process.pid));

const children = [];
let shuttingDown = false;

function killTree(pid) {
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try {
      process.kill(pid, "SIGTERM");
    } catch {}
  }
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.pid && !child.killed) killTree(child.pid);
  }
  rmSync(pidFile, { force: true });
  process.exit(code);
}

function run(name, cwd, entry, args) {
  const child = spawn(process.execPath, [entry, ...args], { cwd, stdio: "inherit" });
  children.push(child);
  child.on("error", (error) => {
    console.error(`[${name}] failed to start:`, error);
    shutdown(1);
  });
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`[${name}] exited (code=${code}, signal=${signal}); stopping the other process.`);
    shutdown(code ?? 1);
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log("Starting Kaneo API and Web (hot reload)...");
run("api", apiDir, tsxCli, ["watch", "src/index.ts"]);
run("web", webDir, vpCli, ["dev"]);
