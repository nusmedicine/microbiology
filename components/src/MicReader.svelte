<script>
  // MicReader — reading a broth-dilution series. A row of tubes holds doubling concentrations of a
  // drug; cloudy tubes mean growth. The learner clicks the tube that marks the minimum inhibitory
  // concentration (MIC), then, if the scenario gives breakpoints, classifies the isolate as
  // susceptible or resistant. Scenarios step from simple to "skipped well" pitfalls. YAML-driven.
  import { onMount } from 'svelte';
  import { loadManifest } from './lib/manifest.js';
  import { md, mdInline } from './lib/md.js';

  let { src } = $props();

  let data = $state(null);
  let error = $state(null);
  let si = $state(0);
  let pick = $state(null);
  let cls = $state(null);

  let sc = $derived(data ? data.scenarios[si] : null);
  let concs = $derived(data ? data.concentrations : []);
  // MIC = lowest concentration with no growth, above which every tube is also clear.
  let micIdx = $derived.by(() => {
    if (!sc) return -1;
    for (let i = 0; i < sc.growth.length; i++) if (sc.growth.slice(i).every((g) => !g)) return i;
    return -1;
  });
  let micOk = $derived(pick != null && pick === micIdx);
  let category = $derived.by(() => {
    if (!sc || !sc.breakpoints || micIdx < 0) return null;
    const m = concs[micIdx];
    return m <= sc.breakpoints.susceptible ? 'S' : m > sc.breakpoints.resistant ? 'R' : 'I';
  });

  onMount(async () => {
    try {
      data = await loadManifest(src);
      if (!data || !Array.isArray(data.scenarios) || !data.scenarios.length) throw new Error('empty manifest');
    } catch (e) {
      error = String((e && e.message) || e);
    }
  });

  function go(i) { si = i; pick = null; cls = null; }
  const LABEL = { S: 'Susceptible', I: 'Susceptible, increased exposure', R: 'Resistant' };
</script>

{#if error}
  <div class="mr card"><p class="err">⚠ {error}</p></div>
{:else if !data}
  <div class="mr card"><p>Loading…</p></div>
{:else}
  <figure class="mr card">
    <figcaption class="head">
      <strong>{data.title}</strong>
      <span class="hint">Isolate {si + 1} of {data.scenarios.length}</span>
    </figcaption>
    {#if data.intro}<p class="intro">{@html mdInline(data.intro)}</p>{/if}

    <div class="nav" role="group" aria-label="Choose an isolate">
      {#each data.scenarios as s, i}<button type="button" class:on={i === si} aria-pressed={i === si} onclick={() => go(i)}>{i + 1}</button>{/each}
    </div>
    <p class="case">{@html mdInline(sc.text)}</p>

    <div class="tubes" role="group" aria-label="Dilution series: click the MIC tube">
      {#each concs as c, i}
        {@const g = sc.growth[i]}
        <button type="button" class="tube" class:cloudy={g} class:chosen={pick === i} class:mic={pick != null && i === micIdx}
          disabled={pick != null} onclick={() => (pick = i)} aria-label="{c} mg/L, {g ? 'growth' : 'no growth'}">
          <svg viewBox="0 0 30 80" aria-hidden="true">
            <rect x="4" y="4" width="22" height="72" rx="10" class="glass" />
            <rect x="5.5" y="26" width="19" height="48" rx="8.5" class={g ? 'turbid' : 'clear'} />
          </svg>
          <span class="conc">{c}</span>
        </button>
      {/each}
    </div>
    <p class="unit">Drug concentration (mg/L) · cloudy = growth</p>

    {#if pick != null}
      <div class="fb" class:good={micOk}>
        <p>{micOk ? 'That is the MIC.' : 'Not this tube.'} The MIC is <b>{concs[micIdx]} mg/L</b>, the lowest concentration with no visible growth.</p>
        {#if sc.explain}<p>{@html mdInline(sc.explain)}</p>{/if}
      </div>
      {#if sc.breakpoints}
        <p class="pstem">The breakpoints for this drug are: susceptible if MIC ≤ {sc.breakpoints.susceptible} mg/L, resistant if MIC &gt; {sc.breakpoints.resistant} mg/L. How should the lab report it?</p>
        <div class="opts">
          {#each Object.keys(LABEL).filter((k) => k !== 'I' || sc.breakpoints.susceptible !== sc.breakpoints.resistant) as k}
            <button type="button" class="opt" disabled={cls != null}
              class:correct={cls != null && k === category} class:wrong={cls === k && k !== category}
              onclick={() => (cls = k)}>{LABEL[k]}</button>
          {/each}
        </div>
        {#if cls != null}<p class="fbline">{cls === category ? '✓' : '✗'} {LABEL[category]}. {@html mdInline(sc.reportNote || '')}</p>{/if}
      {/if}
      {#if si < data.scenarios.length - 1}<button type="button" class="btn" onclick={() => go(si + 1)}>Next isolate</button>{/if}
    {/if}
    {#if data.note}<div class="note">{@html md(data.note)}</div>{/if}
  </figure>
{/if}

<style>
  .mr {
    --surface:#fff; --ink:#1a2027; --muted:#5b6670; --line:#d8dee5;
    --brand:#0b5d6b; --brand-bg:#eaf4f5; --good-bg:#e7f5ee; --good-line:#1f9d6b;
    --warn-bg:#fdf1e3; --warn-line:#d08a2c; --focus:#1664c0;
    color:var(--ink); font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; margin:1.2rem 0;
  }
  .mr.card { background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:16px 20px; }
  .mr .head { display:flex; flex-wrap:wrap; gap:6px 12px; align-items:baseline; justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:10px; margin-bottom:10px; }
  .mr .hint { font-size:.78rem; color:var(--muted); }
  .mr .intro { font-size:.92rem; margin:0 0 10px; }
  .mr button { font:inherit; cursor:pointer; }
  .mr .nav { display:flex; gap:6px; margin-bottom:8px; }
  .mr .nav button { width:34px; height:34px; border-radius:50%; border:1px solid var(--line); background:#fff; font-weight:600; color:var(--ink); }
  .mr .nav button.on { box-shadow:0 0 0 2px var(--focus); }
  .mr .case { font-size:.93rem; margin:0 0 8px; }
  .mr .tubes { display:grid; grid-template-columns:repeat(auto-fit, minmax(44px, 1fr)); gap:6px; }
  .mr .tube { background:#fff; border:1px solid var(--line); border-radius:8px; padding:4px 2px; display:flex; flex-direction:column; align-items:center; color:var(--ink); }
  .mr .tube:hover:not(:disabled) { border-color:var(--brand); }
  .mr .tube:disabled { cursor:default; }
  .mr .tube.chosen { box-shadow:0 0 0 2px var(--warn-line); }
  .mr .tube.mic { box-shadow:0 0 0 2px var(--good-line); }
  .mr svg { width:30px; height:80px; }
  .mr .glass { fill:#fff; stroke:#8d96a0; stroke-width:1.2; }
  .mr .clear { fill:#f3e6b8; opacity:.55; }
  .mr .turbid { fill:#c9b37a; }
  .mr .conc { font-size:.74rem; font-variant-numeric:tabular-nums; }
  .mr .unit { font-size:.76rem; color:var(--muted); margin:4px 0 8px; }
  .mr .fb { padding:10px 14px; border-radius:9px; border:1px solid var(--warn-line); background:var(--warn-bg); font-size:.93rem; }
  .mr .fb.good { border-color:var(--good-line); background:var(--good-bg); }
  .mr .fb p { margin:.25em 0; }
  .mr .pstem { font-weight:600; margin:12px 0 8px; font-size:.93rem; }
  .mr .opts { display:flex; flex-wrap:wrap; gap:6px; }
  .mr .opt { background:#fff; color:var(--ink); border:1px solid var(--line); border-radius:99px; padding:6px 14px; min-height:40px; }
  .mr .opt:hover:not(:disabled) { border-color:var(--brand); }
  .mr .opt.correct { border-color:var(--good-line); background:var(--good-bg); font-weight:600; }
  .mr .opt.wrong { border-color:var(--warn-line); background:var(--warn-bg); }
  .mr .opt:disabled { cursor:default; }
  .mr .fbline { font-size:.9rem; margin:8px 0; }
  .mr .btn { margin-top:10px; background:var(--brand); color:#fff; border:1px solid var(--brand); border-radius:8px; padding:8px 16px; min-height:40px; font-weight:600; }
  .mr .note { font-size:.82rem; color:var(--muted); margin-top:10px; }
  .mr .note :global(p) { margin:.2em 0; }
  .mr :focus-visible { outline:3px solid var(--focus); outline-offset:2px; border-radius:6px; }
  .mr .err { color:#9b1c1c; }
</style>
