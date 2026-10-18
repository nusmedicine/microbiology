// Resolve root-absolute resource paths ("/cases/x.yml", "/figures/...", "/structures/...")
// against the deployed site root, so islands work whether the book is served at "/"
// (local preview, custom domain) OR a GitHub project subpath ("/<repo>/").
//
// Authors write root-absolute paths (intuitive, correct at a domain root). At a subpath
// those break, so we rewrite them at runtime. The bundle is served at <root>/assets/, so
// its own URL tells us the root — no per-repo config needed.

function detectRoot() {
  try {
    const u = import.meta.url // runtime URL of this bundle
    const i = u.lastIndexOf('/assets/')
    if (i >= 0) return u.slice(0, i + 1)
  } catch { /* import.meta.url unavailable */ }
  try {
    const s = document.querySelector('script[src*="components.js"]')
    if (s && s.src) { const i = s.src.lastIndexOf('/assets/'); if (i >= 0) return s.src.slice(0, i + 1) }
  } catch { /* no DOM */ }
  return '/' // fallback: keep paths root-absolute (correct at a domain root)
}

export const SITE_ROOT = detectRoot()

export function resolveAsset(p) {
  if (!p) return p
  const s = String(p)
  if (/^(https?:)?\/\//.test(s) || s.startsWith('data:') || s.startsWith('blob:')) return s
  if (SITE_ROOT === '/') return s // couldn't detect a base; root-absolute already works at "/"
  try {
    return new URL(s.replace(/^\/+/, ''), SITE_ROOT).href
  } catch {
    return s
  }
}
