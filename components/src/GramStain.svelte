<script>
  // GramStain — step through the four reagents of the Gram stain on a Gram-positive and a
  // Gram-negative cell side by side, each drawn with a magnified strip of its envelope. The
  // decolouriser step is gated behind a prediction (predict → reveal → explain), and three
  // "what if" errors show why timing and the mordant matter. Data-driven from a YAML manifest.
  import { onMount } from 'svelte';
  import { load, save } from './lib/store.js';
  import { loadManifest } from './lib/manifest.js';
  import { md, mdInline } from './lib/md.js';

  let { src } = $props();

  // Stain states -> fill colours for the cytoplasm and the peptidoglycan layer.
  const FILL = {
    clear: '#f4f1ec',
    violet: '#7b3fb0',
    complex: '#5a2387',
    pink: '#e0608f',
  };
  const fillOf = (state, kind) => (state === 'mixed' ? 'url(#gs-mixed-' + kind + ')' : FILL[state]);
  const NAME = { clear: 'colourless', violet: 'purple', complex: 'dark purple', pink: 'pink', mixed: 'purple and pink' };

  let data = $state(null);
  let error = $state(null);
  let step = $state(0);
  let guess = $state(null); // index of the chosen prediction option
  let whatif = $state(-1);

  let steps = $derived(data ? data.steps : []);
  let cur = $derived(steps[step]);
  let gated = $derived(!!(cur && cur.predict && guess == null)); // prediction pending
  let last = $derived(step === steps.length - 1);

  let shown = $derived.by(() => {
    if (!cur) return { pos: 'clear', neg: 'clear', damaged: null };
    if (whatif >= 0 && last) {
      const w = data.whatifs[whatif];
      return { pos: w.pos, neg: w.neg, damaged: 'neg' };
    }
    if (gated) {
      const prev = steps[step - 1];
      return { pos: prev.pos, neg: prev.neg, damaged: null };
    }
    const dmg = steps.slice(0, step + 1).some((s) => s.damaged === 'neg') ? 'neg' : null;
    return { pos: cur.pos, neg: cur.neg, damaged: dmg };
  });

  onMount(async () => {
    try {
      data = await loadManifest(src);
      if (!data || !Array.isArray(data.steps) || !data.steps.length) throw new Error('empty manifest');
      const saved = load('gram-stain:' + data.id);
      if (saved) {
        if (Number.isInteger(saved.step) && saved.step >= 0 && saved.step < data.steps.length) step = saved.step;
        if (Number.isInteger(saved.guess)) guess = saved.guess;
      }
    } catch (e) {
      error = String((e && e.message) || e);
    }
  });

  $effect(() => {
    if (data) save('gram-stain:' + data.id, { step, guess });
  });

  function go(d) {
    whatif = -1;
    step = Math.max(0, Math.min(steps.length - 1, step + d));
  }
  function restart() { step = 0; guess = null; whatif = -1; }
</script>

{#snippet cell(title, state, kind, damaged)}
  <svg viewBox="0 0 400 196" role="img" aria-label="{title} cell: {NAME[state]}.">
  <defs>
    <pattern id="gs-mixed-{kind}" width="16" height="16" patternUnits="userSpaceOnUse">
      <rect width="16" height="16" fill={FILL.complex} />
      <rect width="8" height="8" fill={FILL.pink} /><rect x="8" y="8" width="8" height="8" fill={FILL.pink} />
    </pattern>
  </defs>
  <g>
    <text x="150" y="22" text-anchor="middle" class="ptitle">{title}</text>
    <!-- whole cell -->
    <ellipse cx="62" cy="108" rx="50" ry="26" fill={fillOf(state, kind)} stroke="#3b3346" stroke-width="1.5" class="fillfx" />
    <text x="62" y="160" text-anchor="middle" class="small">{NAME[state]}</text>
    <!-- zoom lines -->
    <line x1="104" y1="94" x2="150" y2="48" stroke="#9aa3ad" stroke-dasharray="3 3" />
    <line x1="104" y1="122" x2="150" y2="186" stroke="#9aa3ad" stroke-dasharray="3 3" />
    <!-- envelope strip, outside at top, cytoplasm at bottom -->
    <rect x="150" y="48" width="70" height="138" rx="4" fill="#fff" stroke="#c7ced6" />
    {#if kind === 'pos'}
      <rect x="150" y="62" width="70" height="64" fill={fillOf(state, kind)} opacity="0.85" class="fillfx" />
      <rect x="150" y="128" width="70" height="8" fill="#e5c66f" />
      <rect x="150" y="138" width="70" height="48" fill={fillOf(state, kind)} opacity="0.45" class="fillfx" />
      <text x="228" y="98" class="lab">Thick</text>
      <text x="228" y="112" class="lab">peptidoglycan</text>
      <text x="228" y="135" class="lab">Cell membrane</text>
      <text x="228" y="166" class="lab">Cytoplasm</text>
    {:else}
      <rect x="150" y="62" width="70" height="10" fill="#e5c66f" opacity={damaged ? 0.25 : 1} stroke-dasharray={damaged ? '4 3' : null} stroke={damaged ? '#8a6d1c' : null} />
      <rect x="150" y="80" width="70" height="7" fill={fillOf(state, kind)} opacity="0.85" class="fillfx" />
      <rect x="150" y="96" width="70" height="8" fill="#e5c66f" />
      <rect x="150" y="106" width="70" height="80" fill={fillOf(state, kind)} opacity="0.45" class="fillfx" />
      <text x="228" y="70" class="lab">Outer membrane{damaged ? ', breached' : ''}</text>
      <text x="228" y="87" class="lab">Thin peptidoglycan</text>
      <text x="228" y="103" class="lab">Cell membrane</text>
      <text x="228" y="150" class="lab">Cytoplasm</text>
    {/if}
  </g>
  </svg>
{/snippet}

{#if error}
  <div class="gs card"><p class="err">⚠ {error}</p></div>
{:else if !data}
  <div class="gs card"><p>Loading…</p></div>
{:else}
  <figure class="gs card">
    <figcaption class="head">
      <strong>{data.title}</strong>
      <span class="hint">Step {step + 1} of {steps.length}</span>
    </figcaption>
    {#if data.intro}<p class="intro">{data.intro}</p>{/if}

    <ol class="track" aria-label="Staining steps">
      {#each steps as s, i}
        <li class:done={i < step} class:on={i === step}>{s.reagent}</li>
      {/each}
    </ol>

    <div class="panels">
      {@render cell('Gram-positive', shown.pos, 'pos', false)}
      {@render cell('Gram-negative', shown.neg, 'neg', shown.damaged === 'neg')}
    </div>

    <div class="stepbox" aria-live="polite">
      <p class="reagent"><b>{cur.reagent}.</b> {cur.action}</p>
      {#if cur.predict}
        <div class="predict">
          <p class="pstem">Predict first: {cur.predict.stem}</p>
          <div class="opts">
            {#each cur.predict.options as o, oi}
              <button type="button" class="opt"
                class:correct={guess != null && o.correct}
                class:wrong={guess === oi && !o.correct}
                disabled={guess != null}
                onclick={() => (guess = oi)}>{@html mdInline(o.text)}</button>
            {/each}
          </div>
          {#if guess != null}
            <div class="fb">{@html md(cur.predict.options[guess].feedback)}</div>
          {/if}
        </div>
      {/if}
      {#if !gated}<p class="explain">{@html mdInline(cur.explain)}</p>{/if}
    </div>

    {#if last}
      <div class="summary">{@html md(data.summary)}</div>
      {#if data.whatifs}
        <p class="wtitle">What if something goes wrong?</p>
        <div class="whatifs">
          {#each data.whatifs as w, wi}
            <button type="button" class="chip" class:on={whatif === wi} aria-pressed={whatif === wi}
              onclick={() => (whatif = whatif === wi ? -1 : wi)}>{w.label}</button>
          {/each}
        </div>
        {#if whatif >= 0}<p class="explain">{@html mdInline(data.whatifs[whatif].explain)}</p>{/if}
      {/if}
    {/if}

    <div class="controls">
      <button type="button" class="btn secondary" onclick={() => go(-1)} disabled={step === 0}>Back</button>
      {#if !last}
        <button type="button" class="btn" onclick={() => go(1)} disabled={gated}>{gated ? 'Make a prediction first' : 'Next step'}</button>
      {:else}
        <button type="button" class="btn secondary" onclick={restart}>Start again</button>
      {/if}
    </div>
  </figure>
{/if}

<style>
  .gs {
    --surface:#fff; --ink:#1a2027; --muted:#5b6670; --line:#d8dee5;
    --brand:#0b5d6b; --brand-bg:#eaf4f5; --good-bg:#e7f5ee; --good-line:#1f9d6b;
    --warn-bg:#fdf1e3; --warn-line:#d08a2c; --focus:#1664c0;
    color:var(--ink); font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; margin:1.2rem 0;
  }
  .gs.card { background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:16px 20px; }
  .gs .head { display:flex; flex-wrap:wrap; gap:6px 12px; align-items:baseline; justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:10px; margin-bottom:10px; }
  .gs .hint { font-size:.78rem; color:var(--muted); }
  .gs .intro { font-size:.92rem; margin:0 0 10px; }
  .gs .track { display:flex; flex-wrap:wrap; gap:6px; list-style:none; padding:0; margin:0 0 6px; }
  .gs .track li { font-size:.74rem; padding:3px 10px; border-radius:99px; border:1px solid var(--line); color:var(--muted); }
  .gs .track li.done { background:var(--brand-bg); color:var(--brand); border-color:#bcd9dc; }
  .gs .track li.on { background:var(--brand); color:#fff; border-color:var(--brand); font-weight:600; }
  .gs .panels { display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:4px 12px; }
  .gs svg { width:100%; height:auto; display:block; }
  .gs .ptitle { font:600 15px system-ui,sans-serif; fill:var(--ink); }
  .gs .lab { font:13px system-ui,sans-serif; fill:#3d4650; }
  .gs .small { font:12px system-ui,sans-serif; fill:var(--muted); }
  .gs .fillfx { transition:fill .5s ease; }
  .gs .stepbox { background:#f7f9fb; border:1px solid var(--line); border-radius:9px; padding:10px 14px; }
  .gs .reagent { margin:0 0 6px; }
  .gs .explain { margin:6px 0 0; font-size:.94rem; }
  .gs .pstem { font-weight:600; margin:4px 0 8px; }
  .gs button { font:inherit; cursor:pointer; }
  .gs .opts { display:flex; flex-direction:column; gap:6px; }
  .gs .opt { text-align:left; background:#fff; color:var(--ink); border:1px solid var(--line); border-radius:8px; padding:9px 12px; min-height:44px; }
  .gs .opt:hover:not(:disabled) { border-color:var(--brand); }
  .gs .opt.correct { border-color:var(--good-line); background:var(--good-bg); }
  .gs .opt.wrong { border-color:var(--warn-line); background:var(--warn-bg); }
  .gs .opt:disabled { cursor:default; }
  .gs .fb { margin-top:8px; font-size:.93rem; }
  .gs .fb :global(p) { margin:.2em 0; }
  .gs .summary { margin-top:12px; padding:10px 14px; border-left:4px solid var(--brand); background:var(--brand-bg); border-radius:6px; font-size:.95rem; }
  .gs .summary :global(p) { margin:.2em 0; }
  .gs .wtitle { margin:12px 0 6px; font-weight:600; font-size:.92rem; }
  .gs .whatifs { display:flex; flex-wrap:wrap; gap:6px; }
  .gs .chip { font-size:.84rem; border:1px solid var(--line); background:#fff; color:var(--ink); border-radius:99px; padding:5px 12px; min-height:36px; }
  .gs .chip.on { border-color:var(--brand); background:var(--brand-bg); color:var(--brand); font-weight:600; }
  .gs .controls { display:flex; gap:8px; margin-top:12px; }
  .gs .btn { background:var(--brand); color:#fff; border:1px solid var(--brand); border-radius:8px; padding:8px 16px; min-height:40px; font-weight:600; }
  .gs .btn:disabled { opacity:.55; cursor:default; }
  .gs .btn.secondary { background:transparent; color:var(--brand); border-color:var(--line); }
  .gs :focus-visible { outline:3px solid var(--focus); outline-offset:2px; border-radius:6px; }
  .gs .err { color:#9b1c1c; }
  @media (prefers-reduced-motion: reduce) { .gs .fillfx { transition:none; } }
</style>
