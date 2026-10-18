// Verify that every local asset referenced by the rendered book actually exists.
// Catches path/filename mistakes (typos, missing files, forgotten additions) BEFORE deploy,
// so a broken image / island manifest / bundle never ships. Run against the rendered site:
//
//   node scripts/check-assets.mjs [book/_book]
//
// Checks two things:
//   1. HTML references: <img src>, <script src>, <link href>, data-src (and any *.ext ref)
//      — resolved relative to the page (or the site root for "/..."), must exist on disk.
//   2. Island manifests (YAML): every root-absolute asset path inside them must exist.
// Exits non-zero (and lists what's missing) if anything is unresolved.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve as resolvePath, relative } from 'node:path';

const root = resolvePath(process.argv[2] || 'book/_book');
if (!existsSync(root)) { console.error(`✗ site dir not found: ${root}`); process.exit(2); }

const ASSET_EXT = 'svg|sdf|mol|pdb|png|jpe?g|webp|gif|avif|css|js|mjs|json|ya?ml|woff2?|ttf|eot|map';
const HTML_REF = /(?:src|href|data-src)\s*=\s*"([^"]+)"/gi;
const MANIFEST_PATH = new RegExp(`(?<![:/\\w])(/[A-Za-z0-9._~%/\\-]+\\.(?:${ASSET_EXT}))`, 'gi');
const ASSET_END = new RegExp(`\\.(?:${ASSET_EXT})$`, 'i');

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(root);
const missing = [];
const seen = new Set();

function check(referrer, rawRef, targetAbs) {
  const key = referrer + '|' + targetAbs;
  if (seen.has(key)) return;
  seen.add(key);
  let ok = false;
  try { ok = existsSync(targetAbs) && statSync(targetAbs).isFile(); } catch { ok = false; }
  if (!ok) missing.push({ referrer: relative(root, referrer), ref: rawRef });
}

let htmlCount = 0, ymlCount = 0;
for (const f of files) {
  const lower = f.toLowerCase();
  if (lower.endsWith('.html')) {
    htmlCount++;
    const txt = readFileSync(f, 'utf8');
    for (const m of txt.matchAll(HTML_REF)) {
      let v = m[1].split('#')[0].split('?')[0].trim();
      if (!v) continue;
      if (/^(https?:)?\/\//i.test(v) || /^(data:|mailto:|tel:|javascript:)/i.test(v)) continue;
      if (!ASSET_END.test(v)) continue; // only asset files (skip page/nav/anchor links)
      const target = v.startsWith('/') ? join(root, v) : resolvePath(dirname(f), v);
      check(f, v, target);
    }
  } else if (/\.(ya?ml)$/i.test(lower)) {
    ymlCount++;
    const txt = readFileSync(f, 'utf8');
    for (const m of txt.matchAll(MANIFEST_PATH)) {
      check(f, m[1], join(root, m[1]));
    }
  }
}

if (htmlCount === 0) {
  console.error(`✗ no HTML pages found under ${root} — wrong directory, or the book was not rendered?`);
  process.exit(2);
}
if (missing.length) {
  console.error(`✗ ${missing.length} missing asset reference(s):`);
  for (const m of missing) console.error(`   ${m.referrer}  →  ${m.ref}`);
  console.error('\nFix the path (or add the missing file). Island asset paths should be root-absolute');
  console.error('("/figures/x.png") and loaded via loadManifest(); markdown figures use ![](/figures/x).');
  process.exit(1);
}
console.log(`✓ assets OK — checked ${htmlCount} HTML page(s) + ${ymlCount} manifest(s), no missing references.`);
