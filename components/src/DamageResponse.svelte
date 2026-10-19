<script>
  // DamageResponse — the Casadevall–Pirofski damage-response idea as a manipulable curve. The x-axis
  // is the strength of the host response (weak to strong), the y-axis is host damage. Each profile
  // is a schematic curve with an example; a slider moves a marker along it and the readout explains
  // what is happening at that point (damage from the microbe, from the host, or little damage).
  // Curves are teaching schematics, not measured data, and the chart says so. YAML-driven.
  import { onMount } from 'svelte';
  import { loadManifest } from './lib/manifest.js';
  import { md, mdInline } from './lib/md.js';

  let { src } = $props();

  let data = $state(null);
  let error = $state(null);
  let pi = $state(0);
  let x = $state(0.5);

  let prof = $derived(data ? data.profiles[pi] : null);
  // Piecewise-linear interpolation of the profile's control points [x, y] in 0..1.
  function yAt(pts, t) {
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      if (t <= x1) return y0 + ((t - x0) / (x1 - x0 || 1)) * (y1 - y0);
    }
    return pts.at(-1)[1];
  }
  let y = $derived(prof ? yAt(prof.points, x) : 0);
  let zone = $derived(x < 0.34 ? 'weak' : x > 0.66 ? 'strong' : 'balanced');
  let readout = $derived(prof ? prof.zones[zone] : '');

  onMount(async () => {
    try {
      data = await loadManifest(src);
      if (!data || !Array.isArray(data.profiles) || !data.profiles.length) throw new Error('empty manifest');
    } catch (e) {
      error = String((e && e.message) || e);
    }
  });

  const W = 600, H = 250, L = 46, R = 14, T = 14, B = 40;
  const sx = (t) => L + t * (W - L - R);
  const sy = (t) => T + (1 - t) * (H - T - B);
  // Smooth path through many interpolated samples.
  let path = $derived(prof ? Array.from({ length: 61 }, (_, i) => i / 60).map((t, i) => `${i ? 'L' : 'M'}${sx(t).toFixed(1)} ${sy(yAt(prof.points, t)).toFixed(1)}`).join(' ') : '');
</script>

{#if error}
  <div class="dr card"><p class="err">⚠ {error}</p></div>
{:else if !data}
  <div class="dr card"><p>Loading…</p></div>
{:else}
  <figure class="dr card">
    <figcaption class="head">
      <strong>{data.title}</strong>
      <span class="hint">Schematic curves, not measured data</span>
    </figcaption>
    {#if data.intro}<p class="intro">{@html mdInline(data.intro)}</p>{/if}

    <div class="profiles" role="tablist" aria-label="Choose a pattern">
      {#each data.profiles as p, i}
        <button type="button" role="tab" aria-selected={pi === i} class:on={pi === i} onclick={() => (pi = i)}>{p.label}</button>
      {/each}
    </div>
    <p class="example">{@html mdInline(prof.example)}</p>

    <svg viewBox="0 0 {W} {H}" class="chart" role="img" aria-label="Host damage plotted against the strength of the host response: {prof.label}">
      <rect x={sx(0)} y={T} width={sx(0.34) - sx(0)} height={H - T - B} class="zone" />
      <rect x={sx(0.66)} y={T} width={sx(1) - sx(0.66)} height={H - T - B} class="zone" />
      <text x={sx(0.17)} y={T + 14} text-anchor="middle" class="zl">response too weak</text>
      <text x={sx(0.5)} y={T + 14} text-anchor="middle" class="zl">balanced</text>
      <text x={sx(0.83)} y={T + 14} text-anchor="middle" class="zl">response too strong</text>
      <line x1={L} x2={W - R} y1={sy(0)} y2={sy(0)} class="base" />
      <line x1={L} x2={L} y1={T} y2={sy(0)} class="base" />
      <path d={path} class="curve" />
      <line x1={sx(x)} x2={sx(x)} y1={sy(0)} y2={sy(y)} class="drop" />
      <circle cx={sx(x)} cy={sy(y)} r="6" class="pt" />
      <text x={W / 2 + L / 2} y={H - 10} text-anchor="middle" class="ax">Strength of the host's immune response →</text>
      <text x="14" y={(T + sy(0)) / 2} text-anchor="middle" class="ax" transform="rotate(-90 14 {(T + sy(0)) / 2})">Host damage →</text>
    </svg>

    <label class="slider">
      <span>Weak</span>
      <input type="range" min="0" max="1" step="0.01" bind:value={x} aria-label="Strength of the host response" />
      <span>Strong</span>
    </label>
    <div class="readout" aria-live="polite">{@html md(readout)}</div>
    {#if data.note}<p class="note">{@html mdInline(data.note)}</p>{/if}
  </figure>
{/if}

<style>
  .dr {
    --surface:#fff; --ink:#1a2027; --muted:#5b6670; --line:#d8dee5;
    --brand:#0b5d6b; --brand-bg:#eaf4f5; --focus:#1664c0;
    color:var(--ink); font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; margin:1.2rem 0;
  }
  .dr.card { background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:16px 20px; }
  .dr .head { display:flex; flex-wrap:wrap; gap:6px 12px; align-items:baseline; justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:10px; margin-bottom:10px; }
  .dr .hint { font-size:.78rem; color:var(--muted); }
  .dr .intro { font-size:.92rem; margin:0 0 10px; }
  .dr button { font:inherit; cursor:pointer; }
  .dr .profiles { display:flex; flex-wrap:wrap; gap:6px; }
  .dr .profiles button { border:1px solid var(--line); background:#fff; color:var(--ink); border-radius:99px; padding:5px 12px; min-height:36px; font-size:.86rem; }
  .dr .profiles button.on { background:var(--brand); border-color:var(--brand); color:#fff; font-weight:600; }
  .dr .example { font-size:.88rem; color:#52514e; margin:8px 0 4px; }
  .dr .chart { width:100%; height:auto; display:block; }
  .dr .zone { fill:#f3f5f7; }
  .dr .zl { font:11px system-ui,sans-serif; fill:#898781; }
  .dr .base { stroke:#c3c2b7; stroke-width:1; }
  .dr .curve { fill:none; stroke:#2a78d6; stroke-width:2; stroke-linejoin:round; stroke-linecap:round; }
  .dr .drop { stroke:#c3c2b7; stroke-width:1; }
  .dr .pt { fill:#2a78d6; stroke:#fff; stroke-width:2; }
  .dr .ax { font:12px system-ui,sans-serif; fill:#52514e; }
  .dr .slider { display:flex; align-items:center; gap:10px; font-size:.82rem; color:var(--muted); margin:4px 0 6px; }
  .dr .slider input { flex:1; accent-color:#2a78d6; min-height:32px; }
  .dr .readout { background:#f7f9fb; border:1px solid var(--line); border-radius:9px; padding:10px 14px; font-size:.93rem; min-height:3.2em; }
  .dr .readout :global(p) { margin:.2em 0; }
  .dr .note { font-size:.8rem; color:var(--muted); margin:8px 0 0; }
  .dr :focus-visible { outline:3px solid var(--focus); outline-offset:2px; border-radius:6px; }
  .dr .err { color:#9b1c1c; }
</style>
