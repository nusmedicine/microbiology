// Book-wide simulated-patient config, read once. Resolution order:
//   1. dev override — ?patient-llm=<url> or localStorage 'patient-llm-dev'
//      (LOCALHOST endpoints only, so a deployed book can't be repointed elsewhere)
//   2. window.__PATIENT_LLM__ = { endpoint, enabled, accessToken? }
//   3. <meta name="patient-llm" content='{"endpoint":"…","enabled":true}'>
// Absent / disabled / no endpoint => null, so the CasePlayer degrades to the
// placeholder + fallbackGoto (works offline, no backend required).

let cached // undefined = not yet read

export function patientConfig() {
  if (cached !== undefined) return cached
  cached = read()
  return cached
}

function read() {
  try {
    const dev = devOverride()
    if (dev) return normalize(dev)
    if (typeof window !== 'undefined' && window.__PATIENT_LLM__) {
      return normalize(window.__PATIENT_LLM__)
    }
    if (typeof document !== 'undefined') {
      const meta = document.querySelector('meta[name="patient-llm"]')
      if (meta) return normalize(JSON.parse(meta.getAttribute('content') || '{}'))
    }
  } catch {
    /* malformed config => treat as disabled */
  }
  return null
}

// Local-dev convenience: enable the chat against a locally-run proxy without
// editing config or rendering a Quarto profile. Restricted to localhost so it
// cannot be used to point a deployed book at an arbitrary endpoint.
function devOverride() {
  try {
    if (typeof window === 'undefined') return null
    const q = new URLSearchParams(window.location.search).get('patient-llm')
    const raw = q || (typeof localStorage !== 'undefined' && localStorage.getItem('patient-llm-dev'))
    if (!raw) return null
    const cfg = raw.trim().startsWith('{') ? JSON.parse(raw) : { endpoint: raw, enabled: true }
    const host = new URL(cfg.endpoint).hostname
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') return cfg
    return null
  } catch {
    return null
  }
}

function normalize(c) {
  if (!c || !c.enabled || !c.endpoint) return null
  return {
    endpoint: String(c.endpoint).replace(/\/+$/, ''),
    accessToken: c.accessToken || '',
  }
}
