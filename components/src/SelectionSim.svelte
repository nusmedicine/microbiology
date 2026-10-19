<script>
  // SelectionSim — selection for antimicrobial resistance on a 20 × 20 "plate". Each square is a
  // bacterium: susceptible or resistant. "Grow" fills empty squares by division; each division can
  // produce a resistant mutant at a (deliberately exaggerated) mutation rate, and, if gene transfer
  // is switched on, resistant cells can pass resistance to touching neighbours. "Add the drug"
  // kills susceptible cells. Before the first dose the learner must predict whether resistant cells
  // already exist (the Luria–Delbrück point). A line chart tracks % resistant after each step, with
  // a hover readout and a table view. Seeded RNG, so a run can be repeated exactly. YAML-driven.
  import { onMount } from 'svelte';
  import { loadManifest } from './lib/manifest.js';
  import { md, mdInline } from './lib/md.js';
  import { optionOrder } from './lib/order.js';

  let { src } = $props();

  const N = 20, CELLS = N * N;
  let data = $state(null);
  let error = $state(null);
  let grid = $state([]); // 0 empty, 1 susceptible, 2 resistant (mutation), 3 resistant (gene transfer)
  let history = $state([]); // [{ step, label, pct, count }]
  let transfer = $state(false);
  let guess = $state(null);
  let seed = $state(11);
  let hover = $state(-1);
  let nudge = $state(false); // the learner tried to dose before answering the prediction
  let predictEl = $state(null);
  let showTable = $state(false);
  let rng = () => 0;

  let mu = $derived(data ? data.mutationRate || 0.004 : 0.004);
  let alive = $derived(grid.filter((c) => c > 0).length);
  let resistant = $derived(grid.filter((c) => c >= 2).length);
  let pct = $derived(alive ? (100 * resistant) / alive : 0);
  let dosed = $derived(history.some((h) => h.kind === 'drug'));
  let needGuess = $derived(!!(data && data.predict) && guess == null);

  function makeRng(s) {
    let x = s >>> 0 || 1;
    return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
  }
  function neighbours(i) {
    const r = Math.floor(i / N), c = i % N, out = [];
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < N && cc >= 0 && cc < N) out.push(rr * N + cc);
    }
    return out;
  }
  function record(kind, label) {
    const a = grid.filter((c) => c > 0).length, r = grid.filter((c) => c >= 2).length;
    history = [...history, { step: history.length, kind, label, pct: a ? (100 * r) / a : 0, count: a, resistant: r }];
  }
  function start() {
    rng = makeRng(seed);
    const g = new Array(CELLS).fill(0);
    // A small founding population of susceptible cells in the centre.
    for (const i of [189, 190, 209, 210]) g[i] = 1;
    grid = g;
    history = [];
    record('start', 'Start: four susceptible cells');
  }
  function grow() {
    const g = [...grid];
    for (let round = 0; round < 12; round++) {
      const order = g.map((_, i) => i).filter((i) => g[i] > 0).sort(() => rng() - 0.5);
      for (const i of order) {
        const empty = neighbours(i).filter((j) => g[j] === 0);
        if (!empty.length) continue;
        const j = empty[Math.floor(rng() * empty.length)];
        g[j] = g[i] === 1 && rng() < mu ? 2 : g[i];
      }
      if (transfer) {
        for (let i = 0; i < CELLS; i++) {
          if (g[i] < 2) continue;
          for (const j of neighbours(i)) if (g[j] === 1 && rng() < (data.transferRate || 0.08)) g[j] = 3;
        }
      }
    }
    // A real infection holds billions of cells, so a few resistant mutants are always present before
    // any drug is given. On a 400-cell plate chance can produce none; seed one so the model stays true.
    if (!history.some((h) => h.kind === 'drug') && !g.some((c) => c >= 2)) {
      const live = g.map((c, i) => (c === 1 ? i : -1)).filter((i) => i >= 0);
      if (live.length) g[live[Math.floor(rng() * live.length)]] = 2;
    }
    grid = g;
    record('grow', transfer ? 'Grow overnight (gene transfer on)' : 'Grow overnight');
  }
  function dose() {
    if (needGuess) {
      nudge = true;
      predictEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      predictEl?.querySelector('.opt')?.focus({ preventScroll: true });
      return;
    }
    const g = grid.map((c) => (c === 1 ? 0 : c));
    grid = g;
    record('drug', 'Add the drug');
  }
  function newRun() { seed = (seed * 7 + 3) % 9973; start(); }

  onMount(async () => {
    try {
      data = await loadManifest(src);
      if (data.seed) seed = data.seed;
      start();
    } catch (e) {
      error = String((e && e.message) || e);
    }
  });

  // Chart geometry.
  const CW = 640, CH = 180, L = 44, R = 16, T = 12, B = 30;
  let xs = $derived(history.map((_, i) => L + (history.length > 1 ? (i * (CW - L - R)) / Math.max(history.length - 1, 1) : (CW - L - R) / 2)));
  const ys = (p) => T + (1 - p / 100) * (CH - T - B);
  let path = $derived(history.map((h, i) => `${i ? 'L' : 'M'}${xs[i].toFixed(1)} ${ys(h.pct).toFixed(1)}`).join(' '));
  function onMove(e) {
    const svg = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - svg.left) / svg.width) * CW;
    let best = -1, d = Infinity;
    xs.forEach((xx, i) => { if (Math.abs(xx - x) < d) { d = Math.abs(xx - x); best = i; } });
    hover = best;
  }
  const COLOR = ['#f4f1ec', '#9db4c8', '#eb6834', '#b54a1d'];
</script>

{#if error}
  <div class="ss card"><p class="err">⚠ {error}</p></div>
{:else if !data}
  <div class="ss card"><p>Loading…</p></div>
{:else}
  <figure class="ss card">
    <figcaption class="head">
      <strong>{data.title}</strong>
      <span class="hint">{alive} cells · {resistant} resistant ({pct.toFixed(pct > 0 && pct < 10 ? 1 : 0)}%)</span>
    </figcaption>
    {#if data.intro}<p class="intro">{@html mdInline(data.intro)}</p>{/if}

    <div class="stage">
      <svg viewBox="0 0 {N * 10} {N * 10}" class="plate" role="img" aria-label="{alive} bacteria, {resistant} of them resistant">
        <rect x="0" y="0" width={N * 10} height={N * 10} rx="8" fill="#fbf7ee" />
        {#each grid as c, i}
          {#if c > 0}<rect x={(i % N) * 10 + 1} y={Math.floor(i / N) * 10 + 1} width="8" height="8" rx="2" fill={COLOR[c]} />{/if}
        {/each}
      </svg>
      <div class="side">
        <ul class="key">
          <li><span class="sw" style="background:{COLOR[1]}"></span>Susceptible</li>
          <li><span class="sw" style="background:{COLOR[2]}"></span>Resistant, by mutation</li>
          <li><span class="sw" style="background:{COLOR[3]}"></span>Resistant, by gene transfer</li>
        </ul>
        <div class="controls">
          <button type="button" class="btn" onclick={grow}>Grow overnight</button>
          <button type="button" class="btn drug" onclick={dose} disabled={alive === 0} aria-describedby={needGuess ? 'ss-lock' : undefined}>Add the drug</button>
          <label class="tog"><input type="checkbox" bind:checked={transfer} /> Allow gene transfer between neighbours</label>
          <div class="small">
            <button type="button" class="txt" onclick={start}>Restart this run</button>
            <button type="button" class="txt" onclick={newRun}>New random run</button>
          </div>
        </div>
        {#if data.predict && !dosed}
          <div class="predict" class:nudge bind:this={predictEl}>
            <p class="pstem">{data.predict.stem}</p>
            <div class="opts">
              {#each optionOrder(data.predict.options.length, data.id + ':predict', data.predict.ordered) as oi}
                {@const o = data.predict.options[oi]}
                <button type="button" class="opt" disabled={guess != null}
                  class:correct={guess != null && o.correct} class:wrong={guess === oi && !o.correct}
                  onclick={() => (guess = oi)}>{@html mdInline(o.text)}</button>
              {/each}
            </div>
            {#if guess != null}<div class="fb">{@html md(data.predict.options[guess].feedback)}</div>{/if}
            {#if guess == null}<p class="lock" id="ss-lock">{nudge ? 'Answer this first, then add the drug.' : 'Answer this before adding the drug.'}</p>{/if}
          </div>
        {/if}
      </div>
    </div>


    <div class="chartwrap">
      <p class="ctitle">Resistant cells as a percentage of the population, after each step</p>
      <svg viewBox="0 0 {CW} {CH}" class="chart" role="img" aria-label="Percentage of resistant cells after each step"
        onpointermove={onMove} onpointerleave={() => (hover = -1)}>
        {#each [0, 25, 50, 75, 100] as t}
          <line x1={L} x2={CW - R} y1={ys(t)} y2={ys(t)} class="grid" />
          <text x={L - 6} y={ys(t) + 4} text-anchor="end" class="tick">{t}%</text>
        {/each}
        <line x1={L} x2={CW - R} y1={ys(0)} y2={ys(0)} class="base" />
        {#if history.length > 1}<path d={path} class="line" />{/if}
        {#each history as h, i}
          <circle cx={xs[i]} cy={ys(h.pct)} r="4.5" class="pt" class:drugpt={h.kind === 'drug'} />
        {/each}
        {#if history.length}
          {@const last = history.at(-1)}
          <text x={Math.min(xs.at(-1) + 8, CW - R)} y={ys(last.pct) - 8} text-anchor={xs.at(-1) > CW - 90 ? 'end' : 'start'} class="endlab">{last.pct.toFixed(last.pct > 0 && last.pct < 10 ? 1 : 0)}%</text>
        {/if}
        {#if hover >= 0 && history[hover]}
          <line x1={xs[hover]} x2={xs[hover]} y1={T} y2={CH - B} class="cross" />
        {/if}
        <text x={L} y={CH - 8} class="tick">steps →</text>
      </svg>
      {#if hover >= 0 && history[hover]}
        {@const h = history[hover]}
        <p class="tip"><b>{h.pct.toFixed(h.pct > 0 && h.pct < 10 ? 1 : 0)}% resistant</b> · {h.label} · {h.count} cells</p>
      {/if}
      <button type="button" class="txt" onclick={() => (showTable = !showTable)} aria-expanded={showTable}>{showTable ? 'Hide' : 'Show'} the numbers</button>
      {#if showTable}
        <table class="tbl">
          <thead><tr><th>Step</th><th>What happened</th><th>Cells</th><th>Resistant</th></tr></thead>
          <tbody>
            {#each history as h, i}<tr><td>{i}</td><td>{h.label}</td><td>{h.count}</td><td>{h.resistant} ({h.pct.toFixed(h.pct > 0 && h.pct < 10 ? 1 : 0)}%)</td></tr>{/each}
          </tbody>
        </table>
      {/if}
    </div>

    {#if data.note}<p class="note">{@html mdInline(data.note)}</p>{/if}
  </figure>
{/if}

<style>
  .ss {
    --surface:#fff; --ink:#1a2027; --muted:#5b6670; --line:#d8dee5;
    --brand:#0b5d6b; --brand-bg:#eaf4f5; --good-bg:#e7f5ee; --good-line:#1f9d6b;
    --warn-bg:#fdf1e3; --warn-line:#d08a2c; --focus:#1664c0;
    color:var(--ink); font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; margin:1.2rem 0;
  }
  .ss.card { background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:16px 20px; }
  .ss .head { display:flex; flex-wrap:wrap; gap:6px 12px; align-items:baseline; justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:10px; margin-bottom:10px; }
  .ss .hint { font-size:.78rem; color:var(--muted); font-variant-numeric:tabular-nums; }
  .ss .intro { font-size:.92rem; margin:0 0 10px; }
  .ss .stage { display:grid; grid-template-columns:minmax(180px, 260px) 1fr; gap:14px; align-items:start; }
  .ss .plate { width:100%; height:auto; display:block; }
  .ss .key { list-style:none; margin:0 0 10px; padding:0; font-size:.84rem; }
  .ss .key li { display:flex; align-items:center; gap:8px; margin:3px 0; }
  .ss .sw { width:12px; height:12px; border-radius:3px; display:inline-block; }
  .ss button { font:inherit; cursor:pointer; }
  .ss .controls { display:flex; flex-direction:column; align-items:flex-start; gap:8px; }
  .ss .btn { background:var(--brand); color:#fff; border:1px solid var(--brand); border-radius:8px; padding:8px 16px; min-height:40px; font-weight:600; }
  .ss .btn.drug { background:#8a3b12; border-color:#8a3b12; }
  .ss .btn:disabled { opacity:.5; cursor:default; }
  .ss .tog { font-size:.86rem; display:flex; gap:6px; align-items:center; }
  .ss .small { display:flex; gap:12px; }
  .ss .txt { border:none; background:none; color:var(--brand); font-size:.82rem; text-decoration:underline; padding:2px; }
  .ss .predict.nudge { border-color:#d08a2c; box-shadow:0 0 0 3px #fdf1e3; }
  .ss .predict { margin-top:12px; background:#f7f9fb; border:1px solid var(--line); border-radius:9px; padding:10px 14px; }
  .ss .pstem { font-weight:600; margin:0 0 8px; }
  .ss .opts { display:flex; flex-direction:column; gap:6px; }
  .ss .opt { text-align:left; background:#fff; color:var(--ink); border:1px solid var(--line); border-radius:8px; padding:8px 12px; min-height:42px; }
  .ss .opt:hover:not(:disabled) { border-color:var(--brand); }
  .ss .opt.correct { border-color:var(--good-line); background:var(--good-bg); }
  .ss .opt.wrong { border-color:var(--warn-line); background:var(--warn-bg); }
  .ss .opt:disabled { cursor:default; }
  .ss .fb { margin-top:8px; font-size:.93rem; }
  .ss .fb :global(p) { margin:.2em 0; }
  .ss .lock { margin:8px 0 0; font-size:.8rem; color:var(--muted); }
  .ss .chartwrap { margin-top:14px; }
  .ss .ctitle { margin:0 0 4px; font-size:.84rem; font-weight:600; color:#52514e; }
  .ss .chart { width:100%; height:auto; display:block; touch-action:none; }
  .ss .grid { stroke:#e1e0d9; stroke-width:1; }
  .ss .base { stroke:#c3c2b7; stroke-width:1; }
  .ss .tick { font:11px system-ui,sans-serif; fill:#898781; }
  .ss .line { fill:none; stroke:#eb6834; stroke-width:2; stroke-linejoin:round; stroke-linecap:round; }
  .ss .pt { fill:#eb6834; stroke:#fff; stroke-width:2; }
  .ss .pt.drugpt { fill:#8a3b12; }
  .ss .endlab { font:600 12px system-ui,sans-serif; fill:#1a2027; }
  .ss .cross { stroke:#898781; stroke-width:1; }
  .ss .tip { margin:2px 0 0; font-size:.84rem; color:#52514e; }
  .ss .tip b { color:var(--ink); }
  .ss .tbl { width:100%; border-collapse:collapse; font-size:.82rem; margin-top:6px; font-variant-numeric:tabular-nums; }
  .ss .tbl th, .ss .tbl td { border-bottom:1px solid #e7ebef; padding:4px 6px; text-align:left; }
  .ss .note { font-size:.8rem; color:var(--muted); margin:10px 0 0; }
  .ss :focus-visible { outline:3px solid var(--focus); outline-offset:2px; border-radius:6px; }
  .ss .err { color:#9b1c1c; }
  @media (max-width:560px) { .ss .stage { grid-template-columns:1fr; } }
</style>
