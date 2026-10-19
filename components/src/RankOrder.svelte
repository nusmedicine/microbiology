<script>
  // RankOrder — predict-then-reveal ordering. The learner picks items one by one in the order they
  // believe is right (smallest to largest, easiest to hardest to kill...), then checks. The reveal
  // shows the true order, marks each position, and gives the reason for each item. With
  // `axis.type: log`, the reveal also draws a logarithmic ruler (for sizes) with optional shaded
  // bands such as "visible to the naked eye" or "needs an electron microscope". YAML-driven.
  import { onMount } from 'svelte';
  import { load, save } from './lib/store.js';
  import { loadManifest } from './lib/manifest.js';
  import { md, mdInline } from './lib/md.js';

  let { src } = $props();

  let data = $state(null);
  let error = $state(null);
  let picked = $state([]); // item ids in the learner's order
  let checked = $state(false);

  let items = $derived(data ? data.items : []);
  let byId = $derived(Object.fromEntries(items.map((it) => [it.id, it])));
  let truth = $derived([...items].sort((a, b) => a.value - b.value).map((it) => it.id));
  let remaining = $derived(items.filter((it) => !picked.includes(it.id)));
  let score = $derived(picked.reduce((acc, id, i) => acc + (truth[i] === id ? 1 : 0), 0));

  onMount(async () => {
    try {
      const d = await loadManifest(src);
      if (!d || !Array.isArray(d.items) || d.items.length < 2) throw new Error('empty manifest');
      data = d;
      const saved = load('rank-order:' + d.id);
      if (saved && Array.isArray(saved.picked)) {
        const ids = new Set(d.items.map((it) => it.id));
        picked = saved.picked.filter((id, i, arr) => ids.has(id) && arr.indexOf(id) === i);
        checked = !!saved.checked && picked.length === d.items.length;
      }
    } catch (e) {
      error = String((e && e.message) || e);
    }
  });

  $effect(() => {
    if (data) save('rank-order:' + data.id, { picked, checked });
  });

  function pick(id) { if (!checked) picked = [...picked, id]; }
  function undo() { if (!checked) picked = picked.slice(0, -1); }
  function reset() { picked = []; checked = false; }

  // Log ruler geometry (viewBox units).
  const W = 720, PADL = 20, PADR = 20;
  let lo = $derived(data && data.axis ? Math.log10(data.axis.min) : 0);
  let hi = $derived(data && data.axis ? Math.log10(data.axis.max) : 1);
  const X = (v) => PADL + ((Math.log10(v) - lo) / (hi - lo)) * (W - PADL - PADR);
  let decades = $derived.by(() => {
    const out = [];
    for (let p = Math.ceil(lo); p <= Math.floor(hi); p++) out.push(p);
    return out;
  });
  function fmt(p) {
    const v = Math.pow(10, p);
    if (v >= 1) return v + ' m';
    if (v >= 1e-3) return v * 1e3 + ' mm';
    if (v >= 1e-6) return Math.round(v * 1e6) + ' µm';
    return Math.round(v * 1e9) + ' nm';
  }
</script>

{#if error}
  <div class="ro card"><p class="err">⚠ {error}</p></div>
{:else if !data}
  <div class="ro card"><p>Loading…</p></div>
{:else}
  <figure class="ro card">
    <figcaption class="head">
      <strong>{data.title}</strong>
      <span class="hint">{checked ? `${score} of ${items.length} in the right place` : `${picked.length} / ${items.length} placed`}</span>
    </figcaption>
    {#if data.intro}<p class="intro">{@html mdInline(data.intro)}</p>{/if}

    {#if !checked}
      <p class="ask">{data.prompt || 'Pick the items in order.'}</p>
      <div class="pool" role="group" aria-label="Items still to place">
        {#each remaining as it (it.id)}
          <button type="button" class="chip" onclick={() => pick(it.id)}>{@html mdInline(it.label)}</button>
        {/each}
        {#if !remaining.length}<span class="done">All placed. Check your order.</span>{/if}
      </div>
      <ol class="yours" aria-label="Your order">
        {#each picked as id, i}
          <li><span class="pos">{i + 1}</span> {@html mdInline(byId[id].label)}</li>
        {/each}
      </ol>
      <div class="controls">
        <button type="button" class="btn" disabled={remaining.length > 0} onclick={() => (checked = true)}>Check my order</button>
        <button type="button" class="btn secondary" disabled={!picked.length} onclick={undo}>Undo last</button>
      </div>
    {:else}
      {#if data.axis && data.axis.type === 'log'}
        <svg viewBox="0 0 {W} {84 + items.length * 18}" class="ruler" role="img" aria-label="Logarithmic size ruler">
          {#each data.axis.bands || [] as b, bi}
            <rect x={X(Math.max(b.from, data.axis.min))} y="8" width={X(Math.min(b.to, data.axis.max)) - X(Math.max(b.from, data.axis.min))} height="18" fill={bi % 2 ? '#eef3f6' : '#e3eef0'} />
            <text x={(X(Math.max(b.from, data.axis.min)) + X(Math.min(b.to, data.axis.max))) / 2} y="21" text-anchor="middle" class="band">{b.label}</text>
          {/each}
          <line x1={PADL} x2={W - PADR} y1="40" y2="40" class="axis" />
          {#each decades as p}
            <line x1={X(Math.pow(10, p))} x2={X(Math.pow(10, p))} y1="36" y2="44" class="axis" />
            <text x={X(Math.pow(10, p))} y="58" text-anchor="middle" class="tick">{fmt(p)}</text>
          {/each}
          {#each truth as id, i}
            {@const it = byId[id]}
            <line x1={X(it.value)} x2={X(it.value)} y1="40" y2={76 + i * 18} class="lead" />
            <circle cx={X(it.value)} cy="40" r="4" class="dot" />
            <text x={X(it.value) + (X(it.value) > W * 0.7 ? -6 : 6)} y={80 + i * 18} text-anchor={X(it.value) > W * 0.7 ? 'end' : 'start'} class="lab">{it.plain || it.label} · {it.display}</text>
          {/each}
        </svg>
        {#if data.axis.note}<p class="note">{@html mdInline(data.axis.note)}</p>{/if}
      {/if}
      <ol class="reveal">
        {#each truth as id, i}
          {@const it = byId[id]}
          {@const ok = picked[i] === id}
          <li class:ok class:miss={!ok}>
            <span class="pos">{i + 1}</span>
            <div>
              <p class="rname">{@html mdInline(it.label)}{#if it.display} <span class="val">{it.display}</span>{/if}
                <span class="mark">{ok ? '✓ you placed it here' : `you placed it ${picked.indexOf(id) + 1}`}</span></p>
              {#if it.why}<p class="why">{@html mdInline(it.why)}</p>{/if}
            </div>
          </li>
        {/each}
      </ol>
      {#if data.summary}<div class="summary">{@html md(data.summary)}</div>{/if}
      <button type="button" class="btn secondary" onclick={reset}>Try again</button>
    {/if}
  </figure>
{/if}

<style>
  .ro {
    --surface:#fff; --ink:#1a2027; --muted:#5b6670; --line:#d8dee5;
    --brand:#0b5d6b; --brand-bg:#eaf4f5; --good-bg:#e7f5ee; --good-line:#1f9d6b;
    --warn-bg:#fdf1e3; --warn-line:#d08a2c; --focus:#1664c0;
    color:var(--ink); font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; margin:1.2rem 0;
  }
  .ro.card { background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:16px 20px; }
  .ro .head { display:flex; flex-wrap:wrap; gap:6px 12px; align-items:baseline; justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:10px; margin-bottom:10px; }
  .ro .hint { font-size:.78rem; color:var(--muted); }
  .ro .intro { font-size:.92rem; margin:0 0 10px; }
  .ro .ask { font-weight:600; margin:0 0 8px; }
  .ro button { font:inherit; cursor:pointer; }
  .ro .pool { display:flex; flex-wrap:wrap; gap:6px; min-height:42px; padding:8px; border:1px dashed var(--line); border-radius:9px; }
  .ro .chip { background:#fff; color:var(--ink); border:1px solid var(--line); border-radius:99px; padding:6px 12px; min-height:38px; font-size:.9rem; }
  .ro .chip:hover { border-color:var(--brand); background:var(--brand-bg); }
  .ro .done { font-size:.86rem; color:var(--muted); align-self:center; }
  .ro .yours { list-style:none; margin:10px 0 0; padding:0; display:flex; flex-direction:column; gap:4px; }
  .ro .yours li, .ro .reveal li { display:flex; gap:10px; align-items:flex-start; font-size:.92rem; }
  .ro .pos { flex:none; width:24px; height:24px; border-radius:50%; background:var(--brand-bg); color:var(--brand); font-weight:700; font-size:.78rem; display:inline-flex; align-items:center; justify-content:center; }
  .ro .controls { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
  .ro .btn { background:var(--brand); color:#fff; border:1px solid var(--brand); border-radius:8px; padding:8px 16px; min-height:40px; font-weight:600; }
  .ro .btn:disabled { opacity:.5; cursor:default; }
  .ro .btn.secondary { background:transparent; color:var(--brand); border-color:var(--line); margin-top:10px; }
  .ro .controls .btn.secondary { margin-top:0; }
  .ro .ruler { width:100%; height:auto; display:block; margin:4px 0 6px; }
  .ro .axis { stroke:#c3c2b7; stroke-width:1; }
  .ro .tick { font:11px system-ui,sans-serif; fill:#52514e; }
  .ro .band { font:11px system-ui,sans-serif; fill:#3d4650; }
  .ro .lead { stroke:#c3c2b7; stroke-width:1; }
  .ro .dot { fill:#2a78d6; stroke:#fff; stroke-width:2; }
  .ro .lab { font:12px system-ui,sans-serif; fill:#1a2027; }
  .ro .note { font-size:.8rem; color:var(--muted); margin:0 0 8px; }
  .ro .reveal { list-style:none; margin:8px 0 0; padding:0; display:flex; flex-direction:column; gap:6px; }
  .ro .reveal li { border:1px solid var(--line); border-radius:8px; padding:8px 10px; }
  .ro .reveal li.ok { border-color:var(--good-line); background:var(--good-bg); }
  .ro .reveal li.miss { border-color:var(--warn-line); background:var(--warn-bg); }
  .ro .rname { margin:0; font-weight:600; }
  .ro .val { font-weight:400; color:var(--muted); margin-left:4px; }
  .ro .mark { display:block; font-size:.74rem; font-weight:600; color:var(--muted); }
  .ro .why { margin:2px 0 0; font-size:.88rem; }
  .ro .summary { margin-top:12px; padding:10px 14px; border-left:4px solid var(--brand); background:var(--brand-bg); border-radius:6px; font-size:.95rem; }
  .ro .summary :global(p) { margin:.2em 0; }
  .ro :focus-visible { outline:3px solid var(--focus); outline-offset:2px; border-radius:6px; }
  .ro .err { color:#9b1c1c; }
</style>
