// Copy audit: flags patterns that make prose generic or read as machine-written, plus house-style
// slips (American spelling, "bug"/"germ", feedback that opens with "Right."). See STYLE.md §3.
//
//   node scripts/copy-audit.mjs                 # every chapter, appendix and island data file
//   node scripts/copy-audit.mjs <file> [...]    # just these files
//   node scripts/copy-audit.mjs --summary       # per-file counts only
//
// A flag is a prompt to reread the sentence, not a verdict. Exits 0 always; it is a reading aid.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const book = join(repo, 'book');
const args = process.argv.slice(2);
const summaryOnly = args.includes('--summary');
const explicit = args.filter((a) => !a.startsWith('--'));

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (['_book', '.quarto', 'assets', 'figures', 'site_libs'].includes(e.name)) continue;
      walk(p, out);
    } else if (/\.(qmd|ya?ml)$/.test(e.name) && e.name !== '_quarto.yml') out.push(p);
  }
  return out;
}

const files = explicit.length ? explicit.map((f) => join(process.cwd(), f)) : walk(book);

const VOCAB = [
  'delve', 'delves', 'delving', 'crucial', 'crucially', 'pivotal', 'tapestry', 'testament',
  'underscore', 'underscores', 'underscoring', 'intricate', 'intricacies', 'meticulous', 'meticulously',
  'showcase', 'showcases', 'showcasing', 'realm', 'interplay', 'robust', 'enduring', 'foster',
  'fosters', 'fostering', 'garner', 'garners', 'bolster', 'bolstered', 'enhance', 'enhances',
  'enhancing', 'leverage', 'leverages', 'leveraging', 'seamless', 'seamlessly', 'holistic',
  'multifaceted', 'paramount', 'nuanced', 'invaluable', 'game-changer', 'cutting-edge',
  'ever-evolving', 'vibrant', 'groundbreaking', 'profound', 'fascinating', 'remarkable',
  'remarkably', 'unlock', 'unlocks', 'harness', 'harnesses', 'journey', 'landscape',
];

const RULES = [
  { id: 'vocab', why: 'AI-associated vocabulary', re: new RegExp(`\\b(${VOCAB.join('|')})\\b`, 'gi') },
  { id: 'vital', why: '"vital" as importance padding', re: /\bvital\b(?!\s+signs?)/gi },
  { id: 'key-role', why: 'importance padding ("key role", "is key")', re: /\b(key|important|significant|central|critical) (role|part|factor|player)s?\b|\bis key\b|\bplays? an? (key|vital|crucial|important|central|major) role\b/gi },
  { id: 'highlight', why: '"highlight" as a verb of importance', re: /\bhighlight(s|ed|ing)? (the|how|that|its|their|why)\b/gi },
  { id: 'opener', why: 'stock sentence opener', re: /(^|[.!?:]\s+|^\s*[-*>]\s+)(Additionally|Furthermore|Moreover|Notably|Importantly|Crucially|Interestingly|Ultimately|Overall|In summary|In conclusion|In short|To summarise|To summarize)\b/g },
  { id: 'worth-noting', why: 'didactic filler', re: /\b(it is|it's) (important|worth|crucial|essential) (to note|noting|to remember|to understand)\b|\bworth noting\b|\bkeep in mind that\b/gi },
  { id: 'neg-parallel', why: 'negative parallelism ("not X but Y", "not just X")', re: /\bnot (just|only|merely|simply)\b|\b(it|this|that)('s| is| was) not [^.;]{1,60}[,;:—]\s*(it|this|that)('s| is| was)\b|\b(is|are|was|were) not [^.;]{1,50}, but\b/gi },
  { id: 'neg-parallel-2', why: 'negative parallelism across sentences ("…is not X. It is Y.")', re: /\b(is|are) not [^.]{1,70}\.\s+(It|They|This|That) (is|are)\b/g },
  { id: 'trailing-ing', why: 'trailing -ing "analysis" clause', re: /,\s+(highlighting|underscoring|emphasi[sz]ing|showcasing|reflecting|ensuring|fostering|enhancing|demonstrating|illustrating|signalling|signaling|cementing|solidifying|marking)\b/gi },
  { id: 'copula', why: 'avoided copula ("serves as", "stands as")', re: /\b(serves?|served|stands?|stood|functions?) as (a|an|the)\b/gi },
  { id: 'vague-attrib', why: 'vague attribution', re: /\b(experts|studies|research|researchers|scientists|many people|some people) (say|says|show|shows|suggest|suggests|agree|agrees|believe|believes|argue|argues)\b|\bit is (widely|generally|commonly) (believed|accepted|known|thought)\b/gi },
  { id: 'scaffold', why: 'rhetorical scaffolding', re: /\b(Here's|Here is the (thing|catch)|Let's|Let us|This is where|So what does|Think about it|Picture this|Imagine (a|that|you))\b/g },
  { id: 'em-dash', why: 'em dash (limit: one or two per chapter)', re: /—|(?<=\w) -- (?=\w)/g },
  { id: 'inline-header', why: 'inline-header list item (bold label + colon)', re: /^\s*([-*+]|\d+\.)\s+\*\*[^*]{1,60}(:\*\*|\*\*:)/g },
  { id: 'arrow', why: 'decorative arrow or box character in prose', re: /[→⇒➜➔─│┌└]/g },
  { id: 'bug-germ', why: '"bug"/"germ" outside a quoted misconception', re: /\b(bug|bugs|germs?)\b(?!\s+theory)/gi },
  { id: 'us-spelling', why: 'American spelling', re: /\b(colou?r(?<!colour)(?!\s*:)|hemoly\w*|hemato\w*|hemo(globin|rrhag)\w*|fecal|feces|esophag\w*|pediatric\w*|anemia|edema|behavior\w*|tumor\w*|fiber|center|labeled|labeling|modeled|modeling|program(?!me))\b/gi },
  { id: 'ize', why: '-ize spelling (house style is -ise)', re: /\b(?!(?:size|sizes|sized|sizing|prize|prizes|seize|seized|capsize|resize)\b)[a-z]{3,}(?:iz|yz)(?:e|es|ed|ing|ation|ations|er|ers)\b/gi },
  { id: 'you', qmdOnly: true, why: 'second person in chapter prose (house voice is third person with "we")', re: /\b(you|your|yours|yourself)\b/gi },
  { id: 'personify', why: 'book, chapter or section as the subject of an action verb', re: /\b(this|the|next|each) (book|chapter|part|section) (asks|returns|takes|turns|uses|gives|describes|explains|shows|covers|opens|works|follows|introduces|looks)\b|\*\]\([^)]*\)\s+(asks|returns|takes|turns|uses|gives|describes|described|explains|shows|covers|opens|works|introduces|looks)\b/gi },
  { id: 'feedback-right', why: 'feedback opening with "Right."/"Correct" (the component already says so)', re: /\b(feedback|why):\s*["']?(Right|Correct|Yes|Exactly|Great)\b[.!,]/g },
];

const totals = {};
let grand = 0;

for (const f of files) {
  let text;
  try { if (!statSync(f).isFile()) continue; text = readFileSync(f, 'utf8'); } catch { continue; }
  const rel = relative(repo, f).replace(/\\/g, '/');
  const lines = text.split(/\r?\n/);
  const hits = [];
  let inCode = false, inYamlBlock = false;
  lines.forEach((line, i) => {
    if (/^```/.test(line)) { inCode = !inCode; return; }
    if (inCode) return;
    if (/^\s*(id|start|next|goto|answer|kind|slot|tag|key|letter|pattern|morph|envelope|shape|oxygen|lifestyle|culture|extends|mode|if|else|type|outcome|emotion|reaction|difficulty|estimatedMinutes|tags|variables|effects|options|separates|correct|objectivesMet):/.test(line)) return;
    for (const r of RULES) {
      if (r.qmdOnly && !f.endsWith('.qmd')) continue;
      if (r.id === 'you' && /Check your understanding\b/.test(line)) continue; // fixed quiz heading (STYLE.md §4)
      r.re.lastIndex = 0;
      let m;
      while ((m = r.re.exec(line))) {
        if (r.id === 'bug-germ' && /["“'‘][^"”'’]*\b(bug|germ)s?\b[^"”'’]*["”'’]/i.test(line) && /misconception|parade|corrected/i.test(line)) break;
        hits.push({ line: i + 1, rule: r.id, why: r.why, text: m[0], ctx: line.trim().slice(0, 140) });
        if (!r.re.global) break;
      }
    }
  });
  // Density metrics for prose files.
  const prose = text.replace(/```[\s\S]*?```/g, '').replace(/<div[^>]*><\/div>/g, '');
  const words = (prose.match(/[A-Za-z][A-Za-z'-]*/g) || []).length;
  const bold = (prose.match(/\*\*[^*]+\*\*/g) || []).length;
  const rather = (prose.match(/\brather than\b/gi) || []).length;
  const dashes = (prose.match(/—/g) || []).length;
  totals[rel] = { words, flags: hits.length, dashes, boldPer1k: words ? +(bold * 1000 / words).toFixed(1) : 0, ratherThan: rather };
  grand += hits.length;
  if (!summaryOnly && hits.length) {
    console.log(`\n${rel}`);
    for (const h of hits) console.log(`  ${String(h.line).padStart(4)}  ${h.rule.padEnd(15)} "${h.text}"  — ${h.ctx}`);
  }
}

console.log('\nSummary (flags · em dashes · bold per 1,000 words · "rather than")');
for (const [f, t] of Object.entries(totals)) {
  if (!t.flags && !t.dashes && (t.boldPer1k < 20 || f.endsWith('glossary.qmd')) && t.ratherThan < 3) continue;
  const warn = [t.boldPer1k >= 20 && !f.endsWith('glossary.qmd') ? 'bold-heavy' : '', t.dashes > 2 ? 'dash-heavy' : '', t.ratherThan >= 3 ? 'rather-than' : ''].filter(Boolean).join(', ');
  console.log(`  ${f.padEnd(58)} ${String(t.flags).padStart(3)} · ${String(t.dashes).padStart(2)} · ${String(t.boldPer1k).padStart(5)} · ${t.ratherThan}${warn ? '   ← ' + warn : ''}`);
}
console.log(`\n${grand} flag(s) across ${Object.keys(totals).length} file(s).`);
