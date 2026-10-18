// Resilient progress store. Uses localStorage; falls back to in-memory if it's
// unavailable (e.g. sandboxed iframe). The real build will swap this for IndexedDB
// behind the same load/save/clear interface (see ARCHITECTURE.md §6).

const key = (id) => 'caseproto:' + id;
const mem = {};
let ok = true;
try {
  localStorage.setItem('__t', '1');
  localStorage.removeItem('__t');
} catch (e) {
  ok = false;
}

export function load(id) {
  try {
    return ok ? JSON.parse(localStorage.getItem(key(id)) || 'null') : (mem[id] || null);
  } catch (e) {
    return null;
  }
}

export function save(id, v) {
  try {
    if (ok) localStorage.setItem(key(id), JSON.stringify(v));
    else mem[id] = v;
  } catch (e) {
    mem[id] = v;
  }
}

export function clear(id) {
  try {
    if (ok) localStorage.removeItem(key(id));
    else delete mem[id];
  } catch (e) { /* noop */ }
}
