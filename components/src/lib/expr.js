// Restricted, sandboxed expression evaluator for case `branch` conditions.
// Grammar: || , && , comparisons (>= <= == != > <), parens, numbers,
// true/false, and declared variable identifiers. No arbitrary JS.

function tokenize(src) {
  const re = /\s*(>=|<=|==|!=|&&|\|\||[<>()]|[A-Za-z_]\w*|\d+(?:\.\d+)?)/y;
  const toks = [];
  re.lastIndex = 0;
  const s = src.trim();
  while (re.lastIndex < s.length) {
    const m = re.exec(s);
    if (!m) throw new Error('Bad token in expression: ' + src);
    toks.push(m[1]);
  }
  return toks;
}

function parse(toks, vars) {
  let i = 0;
  const peek = () => toks[i];

  function primary() {
    const t = peek();
    if (t === '(') { i++; const v = orExpr(); if (toks[i] !== ')') throw new Error('Expected )'); i++; return v; }
    if (t === 'true') { i++; return true; }
    if (t === 'false') { i++; return false; }
    if (/^\d/.test(t)) { i++; return parseFloat(t); }
    if (/^[A-Za-z_]/.test(t)) { i++; return (vars[t] ?? 0); }
    throw new Error('Unexpected token: ' + t);
  }
  function compare() {
    let l = primary();
    while (['<', '>', '<=', '>=', '==', '!='].includes(peek())) {
      const op = toks[i++]; const r = primary();
      l = op === '<' ? l < r : op === '>' ? l > r : op === '<=' ? l <= r : op === '>=' ? l >= r :
          op === '==' ? l === r : l !== r;
    }
    return l;
  }
  function andExpr() { let l = compare(); while (peek() === '&&') { i++; const r = compare(); l = (!!l) && (!!r); } return l; }
  function orExpr() { let l = andExpr(); while (peek() === '||') { i++; const r = andExpr(); l = (!!l) || (!!r); } return l; }

  const v = orExpr();
  if (i < toks.length) throw new Error('Trailing tokens in expression');
  return v;
}

export function evalExpr(expr, vars) {
  return !!parse(tokenize(expr), vars || {});
}
