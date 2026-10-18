// Load a YAML manifest and AUTO-RESOLVE every asset path inside it against the deployed
// site root — so islands work whether the book is served at "/" (local preview, custom
// domain) or at a GitHub project subpath ("/<repo>/") WITHOUT any per-field resolveAsset
// calls. New islands should load their manifest via loadManifest() and then use the paths
// as-is; paths are already correct for the current deployment.
//
// How it works: authors write root-absolute paths ("/figures/x.png", "/structures/y.sdf").
// deepResolve() rewrites any string that starts with "/" and ends in a known asset
// extension through resolveAsset() (which detects the site root from the bundle URL).
import yaml from 'js-yaml';
import { resolveAsset } from './base.js';

const ASSET_RE = /\.(svg|sdf|mol|pdb|png|jpe?g|webp|gif|avif|ya?ml|json|woff2?|ttf)$/i;

function deepResolve(v) {
  if (typeof v === 'string') {
    return v.startsWith('/') && ASSET_RE.test(v) ? resolveAsset(v) : v;
  }
  if (Array.isArray(v)) return v.map(deepResolve);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v)) out[k] = deepResolve(v[k]);
    return out;
  }
  return v;
}

// `src` is the manifest URL (already resolved by main.js for data-src). Returns the parsed
// manifest with all asset paths resolved for the current deployment.
export async function loadManifest(src) {
  const res = await fetch(src);
  if (!res.ok) throw new Error('manifest load failed (' + res.status + ')');
  return deepResolve(yaml.load(await res.text()));
}
