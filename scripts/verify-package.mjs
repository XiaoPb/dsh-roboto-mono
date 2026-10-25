#!/usr/bin/env node
/**
 * Zero-dependency contract check for the published DSH bundle.
 *
 * `npm run check` runs this after regenerating client.js (in --check mode) and
 * before `npm pack` / `npm publish` (via prepack), so a broken manifest, patch
 * or client bundle fails in CI instead of after install.
 *
 * Checks only what this repository owns: package.json fields the plugin
 * manager reads, the bundle patch contract, the host entry exports, and the
 * generated client bundle (including that every font is really embedded).
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (rel) => readFileSync(join(root, rel), "utf8");
const sizeOf = (rel) => statSync(join(root, rel)).size;

const failures = [];
let passed = 0;

/**
 * @param {string} label human-readable assertion name
 * @param {boolean} ok assertion result
 * @param {string} [detail] shown only when the assertion fails
 */
function check(label, ok, detail) {
  if (ok) passed++;
  else failures.push(detail ? `${label}: ${detail}` : label);
}

const pkg = JSON.parse(read("package.json"));

/* ---------- manifest ---------- */
check("package name is a valid npm name", /^(@[a-z0-9-._~]+\/)?[a-z0-9-._~]+$/.test(pkg.name), pkg.name);
check("version is SemVer", /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(pkg.version), pkg.version);
check("license is MIT", pkg.license === "MIT", String(pkg.license));
check("package is publishable", pkg.private !== true, "package.json must not set \"private\": true");
check("description is present and short", typeof pkg.description === "string" && pkg.description.length > 20 && pkg.description.length <= 220, String(pkg.description));
check("repository points at this GitHub repo", /github\.com\/XiaoPb\/dsh-roboto-mono(?:\.git)?$/.test(pkg.repository?.url ?? ""), String(pkg.repository?.url));
check("homepage and bugs are set", Boolean(pkg.homepage && pkg.bugs?.url), "homepage/bugs missing");
check("ESM entry is index.js", pkg.type === "module" && pkg.main === "index.js", `${pkg.type}/${pkg.main}`);
check("publishConfig is public on the npm registry", pkg.publishConfig?.access === "public" && pkg.publishConfig?.registry === "https://registry.npmjs.org/", JSON.stringify(pkg.publishConfig));
check("engines declare node and dsh", typeof pkg.engines?.node === "string" && typeof pkg.engines?.dsh === "string", JSON.stringify(pkg.engines));

/* ---------- DSH bundle fields ---------- */
check("dsh.bundle.patch is declared", pkg.dsh?.bundle?.patch === "./cordis.patch.yml", String(pkg.dsh?.bundle?.patch));
check("dsh.client is a web client", pkg.dsh?.client?.platform === "web", String(pkg.dsh?.client?.platform));
check("client bundle loads immediately", pkg.dsh?.client?.immediately === true, "immediately: true keeps the font on first paint");
check("compatibility declares a DSH release", Object.keys(pkg.dsh?.compatibility?.dshReleases ?? {}).length > 0, "dsh.compatibility.dshReleases is empty");
check("exports expose host, client and patch", pkg.exports?.["."]?.default === "./index.js" && pkg.exports?.["./client"]?.default === "./client.js" && pkg.exports?.["./cordis.patch.yml"] === "./cordis.patch.yml", JSON.stringify(pkg.exports));

/* ---------- packaged files ---------- */
const files = Array.isArray(pkg.files) ? pkg.files : [];
check("files list is explicit", files.length > 0, "package.json \"files\" is empty");
for (const pattern of files) {
  const target = join(root, pattern);
  if (pattern.endsWith("/*")) {
    const base = pattern.slice(0, -2);
    const entries = existsSync(base) ? readdirSync(base).filter((n) => !n.startsWith(".")) : [];
    check(`files pattern ${pattern} matches something`, entries.length > 0, "no matching files");
  } else {
    check(`packaged file exists: ${pattern}`, existsSync(target) && statSync(target).isFile(), "missing from the repository");
  }
}
const fontsDir = join(root, "fonts");
const fontFiles = existsSync(fontsDir) ? readdirSync(fontsDir) : [];
for (const name of ["RobotoMono-VF.ttf", "DejaVuSansMono.ttf", "RobotoMonoNF-Symbols.woff2"]) {
  check(`font source present: ${name}`, fontFiles.includes(name), "missing from fonts/");
}
for (const name of ["OFL.txt", "DejaVu-LICENSE.txt", "RobotoMonoNF-LICENSE.txt"]) {
  check(`font license present: ${name}`, fontFiles.includes(name), "license text must ship with the embedded fonts");
}

/* ---------- host entry ---------- */
const mod = await import(pathToFileURL(join(root, "index.js")).href);
check("host entry exports name", typeof mod.name === "string" && mod.name.length > 0, String(mod.name));
check("host entry exports inject array", Array.isArray(mod.inject), typeof mod.inject);
check("host entry exports apply", typeof mod.apply === "function", typeof mod.apply);

/* ---------- bundle patch ---------- */
const patch = read("cordis.patch.yml");
const patchMatch = patch.match(/-\s*insert:\s*\n\s*-\s*id:\s*(\S+)\s*\n\s*name:\s*([^\n]+)/);
check("bundle patch inserts exactly one row", patchMatch !== null && (patch.match(/-\s*insert:/g) ?? []).length === 1, "expected one `- insert:` block");
const entryId = patchMatch ? patchMatch[1] : "";
const patchName = patchMatch ? patchMatch[2].trim().replace(/^['"]|['"]$/g, "") : "";
check("patch row id matches the host entry name", entryId === mod.name, `patch id ${entryId || "(none)"} vs index.js name ${mod.name}`);
check("patch row name is the npm package name", patchName === pkg.name, `patch name ${patchName || "(none)"} vs package name ${pkg.name}`);
const idLine = patch.split(/\r?\n/).find((line) => /^\s*(?:-\s*)?id:/.test(line)) ?? "";
check("patch id line has no trailing comment", /^\s*(?:-\s*)?id:\s*[^#\s]+\s*$/.test(idLine), JSON.stringify(idLine));

/* ---------- generated client bundle ---------- */
const client = read("client.js");
check("client bundle is substantial (fonts embedded)", sizeOf("client.js") > 1_000_000, `${sizeOf("client.js")} bytes`);
check("client bundle uses the DSH module loader", client.includes("window.__ModuleLoader__.load("), "missing loader call");
check("client loader id matches the entry id", client.includes(`id: "${entryId}"`), `expected id: "${entryId}"`);
for (const family of ["Roboto Mono", "DejaVu Sans Mono", "RobotoMono NF"]) {
  // The CSS is embedded through JSON.stringify, so quotes are backslash-escaped.
  check(`client declares @font-face ${family}`, client.includes(`font-family:\\"${family}\\"`), "missing font face");
}
check("client defines the code font variable", client.includes("--dsh-font-family-code"), "missing --dsh-font-family-code");
check("client defines the terminal font variable", client.includes("--dsh-font-family-terminal"), "missing --dsh-font-family-terminal");
check("client overrides the xterm rows font", client.includes(".xterm .xterm-rows"), "dsh-hardssh hard-codes its font; the override is required");
check("client uses the real CSS variable names", !client.includes("--ds-font-family"), "found misspelled --ds-font-family");
for (const name of ["RobotoMono-VF.ttf", "DejaVuSansMono.ttf", "RobotoMonoNF-Symbols.woff2"]) {
  const head = readFileSync(join(root, "fonts", name)).toString("base64").slice(0, 96);
  check(`client embeds ${name}`, client.includes(head), "client.js is stale: run npm run build");
}
check("client ships no remote font URL", !/src:url\((?!data:)/.test(client), "fonts must stay inline: /plugins serves JS only");

/* ---------- font licenses ---------- */
check("OFL text is present", readFileSync(join(root, "fonts", "OFL.txt"), "utf8").includes("SIL OPEN FONT LICENSE"), "fonts/OFL.txt");
check("DejaVu license is present", readFileSync(join(root, "fonts", "DejaVu-LICENSE.txt"), "utf8").includes("Bitstream Vera"), "fonts/DejaVu-LICENSE.txt");
check("Nerd Font license is present", /Apache License|Nerd Fonts|SIL Open Font License/i.test(readFileSync(join(root, "fonts", "RobotoMonoNF-LICENSE.txt"), "utf8")), "fonts/RobotoMonoNF-LICENSE.txt");

if (failures.length > 0) {
  console.error(`verify-package: ${failures.length} check(s) failed, ${passed} passed`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`verify-package: ${passed} checks passed (${pkg.name}@${pkg.version})`);
