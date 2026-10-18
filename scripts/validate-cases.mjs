// Case-graph linter. Run against the source case YAMLs:
//
//   node scripts/validate-cases.mjs
//
// Checks, for every book/cases/*.case.yml:
//   1. `start` exists, and every target (next / goto / fallbackGoto / option goto /
//      rule goto / else) resolves to a real node id — catches dangling references.
//   2. The two-versions rule (HANDOVER §5, memory in-chapter-cases-mcq-only): an
//      in-chapter case (id NOT starting with "sim-") must be MCQ/choice-only and
//      must NOT contain a `patient-chat` node. Only the Integrated-cases "sim-*"
//      cases may use the live AI chat.
// Exits non-zero (and lists problems) if anything fails. Uses the js-yaml already
// installed under components/node_modules.
import { createRequire } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(join(repo, 'components', 'package.json'));
const yaml = require('js-yaml');
const dir = join(repo, 'book', 'cases');

let failed = false;
for (const f of readdirSync(dir).filter((n) => n.endsWith('.case.yml'))) {
  const def = yaml.load(readFileSync(join(dir, f), 'utf8'));
  const nodes = def.nodes || [];
  const ids = new Set(nodes.map((n) => n.id));
  const refs = [];
  const chat = [];
  for (const n of nodes) {
    if (n.type === 'patient-chat') chat.push(n.id);
    for (const [k, v] of [['next', n.next], ['goto', n.goto], ['fallbackGoto', n.fallbackGoto], ['else', n.else]]) if (v) refs.push([n.id, k, v]);
    for (const o of n.options || []) if (o.goto) refs.push([n.id, 'opt:' + o.id, o.goto]);
    for (const r of n.rules || []) if (r.goto) refs.push([n.id, 'rule', r.goto]);
  }
  const dangling = refs.filter(([, , t]) => !ids.has(t));
  const startOk = ids.has(def.start);
  const isSim = (def.id || f).startsWith('sim-');
  const chatViolation = !isSim && chat.length ? chat : [];
  const ok = startOk && !dangling.length && !chatViolation.length;
  if (!ok) {
    failed = true;
    console.log(`FAIL ${f}` +
      (startOk ? '' : `\n   bad start: ${def.start}`) +
      (dangling.length ? `\n   dangling: ${dangling.map((d) => d.join('/')).join(', ')}` : '') +
      (chatViolation.length ? `\n   in-chapter case has patient-chat node(s): ${chatViolation.join(', ')} (AI chat belongs only in sim-* Integrated cases)` : ''));
  } else {
    console.log(`OK   ${f}${isSim ? '  (sim: chat allowed)' : ''}`);
  }
}
process.exit(failed ? 1 : 0);
