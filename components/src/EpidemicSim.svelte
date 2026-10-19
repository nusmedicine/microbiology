<script>
  // EpidemicSim — a deterministic SIR model (susceptible, infectious, removed) for one well-mixed
  // population of 10,000 people. Sliders set the basic reproduction number R0 and the share of
  // people immune at the start (vaccination). The chart shows S, I and R over time with a legend,
  // direct labels, a crosshair readout and a table view; a stat row shows the peak, the final size
  // and the herd-immunity threshold 1 − 1/R0. An optional prediction comes first. YAML-driven.
  import { onMount } from 'svelte';
  import { loadManifest } from './lib/manifest.js';
  import { md, mdInline } from './lib/md.js';

  let { src } = $props();

  const POP = 10000, I0 = 10;
  let data = $state(null);
  let error = $state(null);
  let r0 = $state(2.5);
  let cover = $state(0);
  let guess = $state(null);
  let hover = $state(-1);
  let showTable = $state(false);

  let days = $derived(data ? data.days || 180 : 180);
  let D = $derived(data ? data.infectiousDays || 7 : 7);

  let sim = $derived.by(() => {
    const beta = r0 / D, gamma = 1 / D, dt = 0.1;
    let S = (POP - I0) * (1 - cover / 100), I = I0, R = POP - S - I;
    const R00 = R;
    const out = [{ d: 0, S, I, R }];
    for (let d = 1; d <= days; d++) {
      for (let k = 0; k < 1 / dt; k++) {
        const inf = beta * S * I / POP * dt, rec = gamma * I * dt;
        S -= inf; I += inf - rec; R += rec;
      }
      out.push({ d, S, I, R });
    }
    let peak = out[0];
    for (const p of out) if (p.I > peak.I) peak = p;
    return { out, peak, final: out.at(-1).R - R00, immuneStart: R00 };
  });
  let hit = $derived(r0 > 1 ? (1 - 1 / r0) * 100 : 0);
  let rEff = $derived(r0 * (1 - cover / 100));

  onMount(async () => {
    try {
      data = await loadManifest(src);
      if (data.r0) r0 = data.r0;
      if (data.cover) cover = data.cover;
    } catch (e) {
      error = String((e && e.message) || e);
    }
  });

  const W = 640, H = 240, L = 44, R = 84, T = 12, B = 30;
  let sx = $derived((d) => L + (d / days) * (W - L - R));
  const sy = (v) => T + (1 - v / POP) * (H - T - B);
  const SERIES = [
    { key: 'S', label: 'Susceptible', color: '#2a78d6' },
    { key: 'I', label: 'Infectious', color: '#eb6834' },
    { key: 'R', label: 'Removed (recovered or immune)', color: '#1baf7a' },
  ];
  function line(key) {
    return sim.out.map((p, i) => `${i ? 'L' : 'M'}${sx(p.d).toFixed(1)} ${sy(p[key]).toFixed(1)}`).join(' ');
  }
  function onMove(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const xv = ((e.clientX - r.left) / r.width) * W;
    const d = Math.round(((xv - L) / (W - L - R)) * days);
    hover = d >= 0 && d <= days ? d : -1;
  }
  const pct = (v) => (100 * v / POP).toFixed(v / POP < 0.1 ? 1 : 0) + '%';
</script>

{#if error}
  <div class="es card"><p class="err">⚠ {error}</p></div>
{:else if !data}
  <div class="es card"><p>Loading…</p></div>
{:else}
  <figure class="es card">
    <figcaption class="head">
      <strong>{data.title}</strong>
      <span class="hint">One town of 10,000 people · infectious for {D} days</span>
    </figcaption>
    {#if data.intro}<p class="intro">{@html mdInline(data.intro)}</p>{/if}

    {#if data.predict}
      <div class="predict">
        <p class="pstem">{data.predict.stem}</p>
        <div class="opts">
          {#each data.predict.options as o, oi}
            <button type="button" class="opt" disabled={guess != null}
              class:correct={guess != null && o.correct} class:wrong={guess === oi && !o.correct}
              onclick={() => (guess = oi)}>{@html mdInline(o.text)}</button>
          {/each}
        </div>
        {#if guess != null}<div class="fb">{@html md(data.predict.options[guess].feedback)}</div>{/if}
      </div>
    {/if}

    <div class="sliders">
      <label>Basic reproduction number, R<sub>0</sub>: <b>{r0.toFixed(1)}</b>
        <input type="range" min="0.8" max="6" step="0.1" bind:value={r0} /></label>
      <label>Immune at the start (vaccinated): <b>{cover}%</b>
        <input type="range" min="0" max="95" step="5" bind:value={cover} /></label>
    </div>

    <div class="stats">
      <div><span class="sl">Herd-immunity threshold</span><span class="sv">{r0 > 1 ? hit.toFixed(0) + '%' : 'none needed'}</span></div>
      <div><span class="sl">Effective R at the start</span><span class="sv">{rEff.toFixed(2)}</span></div>
      <div><span class="sl">Peak infectious</span><span class="sv">{pct(sim.peak.I)} on day {sim.peak.d}</span></div>
      <div><span class="sl">Infected over the outbreak</span><span class="sv">{pct(sim.final + sim.out.at(-1).I)}</span></div>
    </div>

    <ul class="legend" aria-label="Legend">
      {#each SERIES as s}<li><span class="lk" style="background:{s.color}"></span>{s.label}</li>{/each}
    </ul>
    <svg viewBox="0 0 {W} {H}" class="chart" role="img" aria-label="Susceptible, infectious and removed people over {days} days"
      onpointermove={onMove} onpointerleave={() => (hover = -1)}>
      {#each [0, 0.25, 0.5, 0.75, 1] as t}
        <line x1={L} x2={W - R} y1={sy(t * POP)} y2={sy(t * POP)} class="grid" />
        <text x={L - 6} y={sy(t * POP) + 4} text-anchor="end" class="tick">{t * 100}%</text>
      {/each}
      {#each [0, 30, 60, 90, 120, 150, 180].filter((d) => d <= days) as d}
        <text x={sx(d)} y={H - 10} text-anchor="middle" class="tick">{d}</text>
      {/each}
      <text x={W - R} y={H - 10} text-anchor="start" class="tick" dx="6">days</text>
      <line x1={L} x2={W - R} y1={sy(0)} y2={sy(0)} class="base" />
      {#each SERIES as s}<path d={line(s.key)} fill="none" stroke={s.color} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />{/each}
      <text x={W - R + 6} y={sy(sim.out.at(-1).S) + 4} class="dl">S {pct(sim.out.at(-1).S)}</text>
      <text x={W - R + 6} y={sy(sim.out.at(-1).R) + 4} class="dl">R {pct(sim.out.at(-1).R)}</text>
      {#if sim.peak.I > POP * 0.02}
        <circle cx={sx(sim.peak.d)} cy={sy(sim.peak.I)} r="4.5" fill="#eb6834" stroke="#fff" stroke-width="2" />
        <text x={sx(sim.peak.d) + 8} y={sy(sim.peak.I) - 6} class="dl">I peaks at {pct(sim.peak.I)}</text>
      {/if}
      {#if hover >= 0}
        <line x1={sx(hover)} x2={sx(hover)} y1={T} y2={sy(0)} class="cross" />
      {/if}
    </svg>
    <p class="tip" aria-live="polite">
      {#if hover >= 0}
        {@const p = sim.out[hover]}
        Day {hover}:
        {#each SERIES as s}<span class="trow"><span class="tk" style="background:{s.color}"></span><b>{pct(p[s.key])}</b> {s.label.split(' ')[0].toLowerCase()}</span>{/each}
      {:else}Hover over the chart to read the values on any day.{/if}
    </p>
    <button type="button" class="txt" onclick={() => (showTable = !showTable)} aria-expanded={showTable}>{showTable ? 'Hide' : 'Show'} the numbers</button>
    {#if showTable}
      <table class="tbl">
        <thead><tr><th>Day</th>{#each SERIES as s}<th>{s.label.split(' ')[0]}</th>{/each}</tr></thead>
        <tbody>{#each sim.out.filter((p) => p.d % 15 === 0) as p}<tr><td>{p.d}</td>{#each SERIES as s}<td>{pct(p[s.key])}</td>{/each}</tr>{/each}</tbody>
      </table>
    {/if}
    {#if data.note}<p class="note">{@html mdInline(data.note)}</p>{/if}
  </figure>
{/if}

<style>
  .es {
    --surface:#fff; --ink:#1a2027; --muted:#5b6670; --line:#d8dee5;
    --brand:#0b5d6b; --brand-bg:#eaf4f5; --good-bg:#e7f5ee; --good-line:#1f9d6b;
    --warn-bg:#fdf1e3; --warn-line:#d08a2c; --focus:#1664c0;
    color:var(--ink); font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; margin:1.2rem 0;
  }
  .es.card { background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:16px 20px; }
  .es .head { display:flex; flex-wrap:wrap; gap:6px 12px; align-items:baseline; justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:10px; margin-bottom:10px; }
  .es .hint { font-size:.78rem; color:var(--muted); }
  .es .intro { font-size:.92rem; margin:0 0 10px; }
  .es button { font:inherit; cursor:pointer; }
  .es .predict { background:#f7f9fb; border:1px solid var(--line); border-radius:9px; padding:10px 14px; margin-bottom:10px; }
  .es .pstem { font-weight:600; margin:0 0 8px; }
  .es .opts { display:flex; flex-wrap:wrap; gap:6px; }
  .es .opt { background:#fff; color:var(--ink); border:1px solid var(--line); border-radius:99px; padding:6px 14px; min-height:40px; }
  .es .opt:hover:not(:disabled) { border-color:var(--brand); }
  .es .opt.correct { border-color:var(--good-line); background:var(--good-bg); font-weight:600; }
  .es .opt.wrong { border-color:var(--warn-line); background:var(--warn-bg); }
  .es .opt:disabled { cursor:default; }
  .es .fb { margin-top:8px; font-size:.93rem; }
  .es .fb :global(p) { margin:.2em 0; }
  .es .sliders { display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:8px 18px; font-size:.88rem; }
  .es .sliders label { display:flex; flex-direction:column; gap:2px; }
  .es .sliders input { accent-color:var(--brand); min-height:30px; }
  .es .stats { display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:8px; margin:10px 0; }
  .es .stats div { border:1px solid var(--line); border-radius:8px; padding:6px 10px; }
  .es .sl { display:block; font-size:.74rem; color:var(--muted); }
  .es .sv { font-weight:600; font-size:1rem; }
  .es .legend { list-style:none; display:flex; flex-wrap:wrap; gap:4px 16px; margin:0 0 4px; padding:0; font-size:.82rem; color:#52514e; }
  .es .legend li { display:flex; align-items:center; gap:6px; }
  .es .lk, .es .tk { display:inline-block; width:16px; height:2px; border-radius:1px; }
  .es .chart { width:100%; height:auto; display:block; touch-action:none; }
  .es .grid { stroke:#e1e0d9; stroke-width:1; }
  .es .base { stroke:#c3c2b7; stroke-width:1; }
  .es .tick { font:11px system-ui,sans-serif; fill:#898781; }
  .es .dl { font:600 11.5px system-ui,sans-serif; fill:#1a2027; }
  .es .cross { stroke:#898781; stroke-width:1; }
  .es .tip { margin:2px 0 4px; font-size:.84rem; color:#52514e; min-height:1.4em; }
  .es .trow { margin-left:10px; display:inline-flex; align-items:center; gap:5px; }
  .es .tip b { color:var(--ink); }
  .es .txt { border:none; background:none; color:var(--brand); font-size:.82rem; text-decoration:underline; padding:2px; }
  .es .tbl { width:100%; border-collapse:collapse; font-size:.82rem; margin-top:6px; font-variant-numeric:tabular-nums; }
  .es .tbl th, .es .tbl td { border-bottom:1px solid #e7ebef; padding:4px 6px; text-align:left; }
  .es .note { font-size:.8rem; color:var(--muted); margin:8px 0 0; }
  .es :focus-visible { outline:3px solid var(--focus); outline-offset:2px; border-radius:6px; }
  .es .err { color:#9b1c1c; }
</style>
