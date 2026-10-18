// Framework-agnostic case state machine (ported verbatim in spirit from the
// verified prototype). Pure functions that mutate a plain state object, so the
// Svelte component can hold that object as $state and stay reactive.

import { evalExpr } from './expr.js';

export function buildIndex(def) {
  return Object.fromEntries(def.nodes.map((n) => [n.id, n]));
}

export function countEndings(def) {
  return def.nodes.filter((n) => n.type === 'end').length;
}

export function createInitialState(def, completedEndings) {
  return {
    currentId: null,
    vars: { ...(def.variables || {}) },
    path: [],
    pending: null,
    completedEndings: completedEndings ? completedEndings.slice() : [],
    status: 'playing'
  };
}

function applyEffects(state, eff) {
  if (!eff) return;
  for (const k in eff) {
    const v = eff[k];
    if (typeof v === 'number') state.vars[k] = (state.vars[k] || 0) + v;
    else state.vars[k] = v;
  }
}

function evalBranch(state, n) {
  for (const r of (n.rules || [])) {
    if (evalExpr(r.if, state.vars)) return r.goto;
  }
  return n.else;
}

// Move to a node, transparently resolving silent `branch` hops.
export function enter(state, def, byId, id) {
  let n = byId[id];
  while (n && n.type === 'branch') {
    state.path.push(n.id);
    n = byId[evalBranch(state, n)];
  }
  state.currentId = n.id;
  state.path.push(n.id);
  state.pending = null;
  if (n.type === 'end') {
    state.status = 'ended';
    if (!state.completedEndings.some((e) => e.id === n.id)) {
      state.completedEndings.push({ id: n.id, outcome: n.outcome, title: n.title });
    }
  }
}

export function choose(state, byId, optId) {
  const n = byId[state.currentId];
  applyEffects(state, (n.options.find((o) => o.id === optId) || {}).effects);
  state.pending = optId;
}

export function continueMcq(state, def, byId) {
  const n = byId[state.currentId];
  const opt = n.options.find((o) => o.id === state.pending);
  enter(state, def, byId, opt.goto);
}

export function continueInfo(state, def, byId) {
  enter(state, def, byId, byId[state.currentId].next);
}

// No-LLM (or disabled) build: patient-chat degrades straight to fallbackGoto.
export function continuePatientChat(state, def, byId) {
  enter(state, def, byId, byId[state.currentId].fallbackGoto);
}

// After a live LLM encounter: route by whether the objective was met.
// Falls back to fallbackGoto when not met (or when goto is absent).
export function finishPatientChat(state, def, byId, objectiveMet) {
  const n = byId[state.currentId];
  enter(state, def, byId, objectiveMet ? (n.goto || n.fallbackGoto) : n.fallbackGoto);
}

export function restart(state, def, byId) {
  Object.assign(state, createInitialState(def, state.completedEndings));
  enter(state, def, byId, def.start);
}

export function reset(state, def, byId) {
  Object.assign(state, createInitialState(def, []));
  enter(state, def, byId, def.start);
}
