import { readdir, stat, readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const apiDir = path.join(repoRoot, "api");

function toPosix(p) {
  return p.split(path.sep).join("/");
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walk(full)));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

async function main() {
  const all = await walk(apiDir);
  const tsFiles = all
    .filter((f) => f.endsWith(".ts"));

  const functions = [];

  for (const file of tsFiles) {
    const rel = toPosix(path.relative(repoRoot, file));
    const st = await stat(file);
    const src = await readFile(file, "utf8").catch(() => "");
    const isCatchAll = rel.includes("[...") || rel.includes("[[...");
    const isDynamic = rel.includes("[") && rel.includes("]");
    const importsLegacyDispatcher = /server\/legacy\/.+\.js/.test(src);
    const importsApiDispatcher = /server\/api\/.+\.js/.test(src);

    functions.push({
      file: rel,
      bytes: st.size,
      flags: [
        isCatchAll ? "catch-all" : null,
        isDynamic && !isCatchAll ? "dynamic" : null,
        importsLegacyDispatcher ? "dispatches-legacy" : null,
        importsApiDispatcher ? "dispatches-api" : null,
      ].filter(Boolean),
    });
  }

  functions.sort((a, b) => a.file.localeCompare(b.file));

  const total = functions.length;
  const lines = [];
  lines.push(`# Vercel Functions Inventory`);
  lines.push(`- Generated at: ${new Date().toISOString()}`);
  lines.push(`- Total functions: ${total}`);
  lines.push(``);
  lines.push(`| Function file | Size (bytes) | Flags |`);
  lines.push(`|---|---:|---|`);
  for (const fn of functions) {
    lines.push(`| \`${fn.file}\` | ${fn.bytes} | ${fn.flags.join(", ")} |`);
  }

  // Print to stdout (for CI logs)
  process.stdout.write(lines.join("\n") + "\n");

  // Also write to docs (handoff convenience)
  const outPath = path.join(repoRoot, "docs", "vercel-functions-inventory.md");
  await import("node:fs/promises").then(({ writeFile }) =>
    writeFile(outPath, lines.join("\n") + "\n", "utf8")
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
