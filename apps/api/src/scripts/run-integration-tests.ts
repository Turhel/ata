import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveTestDatabaseUrl, getRequiredDatabaseUrl, recreateDatabase } from "./_db-utils.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(currentDir, "../..");

function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv) {
  const result = spawnSync(command, args, {
    cwd: apiRoot,
    env,
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function main() {
  const sourceDatabaseUrl = getRequiredDatabaseUrl();
  const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim() || deriveTestDatabaseUrl(sourceDatabaseUrl);

  console.log(`Preparando banco de teste: ${new URL(testDatabaseUrl).pathname.replace(/^\//, "")}`);
  await recreateDatabase(testDatabaseUrl);

  const baseEnv = {
    ...process.env,
    DATABASE_URL: testDatabaseUrl
  };

  runCommand("node", ["--import", "tsx", "src/scripts/migrate.ts"], baseEnv);
  runCommand("node", ["--import", "tsx", "--test", "src/tests/access.integration.test.ts"], baseEnv);
}

await main();
