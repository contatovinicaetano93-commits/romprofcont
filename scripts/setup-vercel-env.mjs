import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const envFile = readFileSync(".env.local", "utf8");
const vars = {};

for (const line of envFile.split("\n")) {
  const match = line.match(/^([A-Z_]+)="(.+)"$/);
  if (match && !match[1].startsWith("VERCEL")) {
    vars[match[1]] = match[2];
  }
}

vars.NEXT_PUBLIC_APP_URL = "https://romprofcont.vercel.app";

function addEnv(key, target, value, sensitive) {
  const args = ["env", "add", key, target, "--yes", "--value", value];
  if (sensitive) args.push("--sensitive");
  try {
    execFileSync("vercel", args, { stdio: "pipe", cwd: process.cwd() });
    console.log(`✓ ${key} → ${target}`);
  } catch (error) {
    const stderr = error.stderr?.toString() ?? "";
    if (stderr.includes("already exists") || stderr.includes("ENV_CONFLICT")) {
      console.log(`• ${key} → ${target} (já existe)`);
      return;
    }
    throw error;
  }
}

const config = [
  { key: "DATABASE_URL", sensitive: true },
  { key: "AUTH_SECRET", sensitive: true },
  { key: "INBOUND_EMAIL_SECRET", sensitive: true },
  { key: "NEXT_PUBLIC_APP_URL", sensitive: false },
];

for (const { key, sensitive } of config) {
  const value = vars[key];
  if (!value) throw new Error(`Missing ${key}`);
  addEnv(key, "production", value, sensitive);
  addEnv(key, "preview", value, sensitive);
}

console.log("Done.");
