#!/usr/bin/env node
// Image generation for the concept spine, via the gpt-image-bridge skill
// (codex CLI → gpt-image-2, authenticated by the ChatGPT subscription — no API key).
//
//   node scripts/gen.mjs --dry            assemble + print every prompt, generate nothing
//   node scripts/gen.mjs four-forces      generate one concept's images
//   node scripts/gen.mjs --all            generate everything still missing
//   node scripts/gen.mjs --all --force    regenerate even if the file exists
//
// Each call takes 4–6 minutes and spends ChatGPT message quota, not API credit.
// Generate one, look at it, adjust the prefix, and only then run --all.

import { readFile, writeFile, mkdir, appendFile, access, readdir, stat, copyFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";

const ROOT = path.resolve(import.meta.dirname, "..");
/* Not public/: everything under public/ is copied into the build verbatim, so a
   generated image that no page imports still ships. These are imported by name
   where they are used, and Vite emits only the ones that are. */
const OUT_DIR = path.join(ROOT, "assets", "generated");
const LEDGER = path.join(ROOT, "content", "assets.md");
const BRIDGE = path.join(os.homedir(), ".claude", "skills", "gpt-image-bridge", "bin", "gpt-image-2");
const MODEL = "gpt-image-2 (via gpt-image-bridge)";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const force = args.includes("--force");
const all = args.includes("--all");
const only = args.find((a) => !a.startsWith("--"));

const exists = (p) => access(p).then(() => true, () => false);

// The wrapper is a bash script and both paths are handed to bash, so Windows
// drive paths need to be POSIX before they cross that boundary.
const posix = (p) => p.replace(/\\/g, "/").replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`);

async function main() {
  const prefix = (await readFile(path.join(ROOT, "content", "style-prefix.txt"), "utf8")).trim();
  const { concepts } = JSON.parse(await readFile(path.join(ROOT, "content", "concepts.json"), "utf8"));

  const selected = all ? concepts : concepts.filter((c) => c.id === only);
  if (!selected.length) {
    console.error(only ? `No concept with id "${only}".` : "Pass a concept id, or --all.");
    console.error("Ids: " + concepts.map((c) => c.id).join(", "));
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });

  for (const concept of selected) {
    for (const spec of concept.images ?? []) {
      const out = path.join(OUT_DIR, `${spec.id}.png`);
      const prompt = `${prefix}\n\n---\n\nSUBJECT FOR THIS IMAGE\n\n${spec.prompt}`;

      if (dry) {
        console.log(`\n═══ ${concept.id} / ${spec.id} · ${spec.size ?? "model default"} ═══\n${prompt}`);
        continue;
      }
      if (!force && (await exists(out))) {
        console.log(`skip  ${spec.id} (exists)`);
        continue;
      }

      console.log(`gen   ${spec.id} … (4–6 min)`);
      const started = Date.now();
      try {
        await bridge(prompt, out, spec.size);
      } catch (e) {
        // codex's Windows sandbox helper is flaky: the image generates and lands
        // in ~/.codex/generated_images/, then the copy-out shell call fails and
        // the wrapper reports failure. The PNG is already paid for — claim it.
        const rescued = await recoverGenerated(started);
        if (!rescued) throw e;
        await copyFile(rescued, out);
        console.log(`      recovered from codex cache (bridge copy-out failed)`);
      }
      await logAsset(spec, concept, prompt);
      console.log(`ok    ${out}`);
    }
  }

  if (dry) console.log("\n(dry run — nothing generated, no quota spent)");
}

function bridge(prompt, out, size) {
  const argv = [posix(BRIDGE), prompt, posix(out), ...(size ? ["--size", size] : [])];
  return new Promise((resolve, reject) => {
    // Args go through as an array — no shell string, so nothing in the prompt
    // can be interpreted as shell syntax.
    const child = spawn("bash", argv, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    child.stdout.on("data", (d) => process.stdout.write(`      ${d}`));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`bridge exited ${code}\n${err.trim()}`)),
    );
  });
}

// Newest PNG written under ~/.codex/generated_images since `since` (epoch ms).
async function recoverGenerated(since) {
  const root = path.join(os.homedir(), ".codex", "generated_images");
  const dirs = await readdir(root, { withFileTypes: true }).catch(() => []);
  let best = null;
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    for (const f of await readdir(path.join(root, d.name)).catch(() => [])) {
      if (!f.endsWith(".png")) continue;
      const p = path.join(root, d.name, f);
      const { mtimeMs } = await stat(p);
      if (mtimeMs > since && (!best || mtimeMs > best.mtimeMs)) best = { p, mtimeMs };
    }
  }
  return best?.p ?? null;
}

async function logAsset(spec, concept, prompt) {
  const row =
    `| ${spec.id}.png | ${concept.id} | ${spec.kind} | ${MODEL} | ` +
    `${new Date().toISOString().slice(0, 10)} | \`${prompt.replace(/\s+/g, " ").slice(-140)}\` |\n`;
  if (!(await exists(LEDGER))) {
    await writeFile(
      LEDGER,
      "# Asset Ledger\n\nEvery asset that ships, with provenance. Generated rows are written by `scripts/gen.mjs`.\n\n" +
        "Append-only: a regenerated asset adds a row rather than replacing one, so superseded\n" +
        "attempts stay on the record. **For any given file, the last row is the shipping version.**\n\n" +
        "| file | concept | kind | source | date | prompt tail / origin |\n|---|---|---|---|---|---|\n",
    );
  }
  await appendFile(LEDGER, row);
}

main().catch((e) => {
  console.error("\n" + e.message);
  process.exit(1);
});
