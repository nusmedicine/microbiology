<script>
  // ContrastPair — a comparison activity for two easily confused organisms. Stage 1: the learner
  // reads both profiles side by side and picks the feature that separates them; the principle is
  // stated only AFTER the comparison (contrasting-cases evidence). Stage 2: interleaved sorting —
  // short descriptions are assigned to A or B with immediate feedback that names the feature.
  // Optional morphology sketches (clusters / chains / rods). Data-driven from a YAML manifest.
  import { onMount } from 'svelte';
  import { load, save } from './lib/store.js';
  import { loadManifest } from './lib/manifest.js';
  import { md, mdInline } from './lib/md.js';

  let { src } = $props();

  let data = $state(null);
  let error = $state(null);
  let choice = $state(null); // chosen row index for the "which feature separates them?" question
  let sorted = $state({}); // { [itemIndex]: 'a' | 'b' }

  let rows = $derived(data ? data.rows : []);
  let items = $derived(data ? data.sort || [] : []);
  let revealed = $derived(choice != null);
  let sortedCount = $derived(Object.keys(sorted).length);
  let sortScore = $derived(items.reduce((acc, it, i) => acc + (sorted[i] === it.answer ? 1 : 0), 0));

  onMount(async () => {
    try {
      data = await loadManifest(src);
      if (!data || !data.a || !data.b || !Array.isArray(data.rows)) throw new Error('empty manifest');
      const saved = load('contrast-pair:' + data.id);
      if (saved) {
        if (Number.isInteger(saved.choice) && saved.choice >= 0 && saved.choice < data.rows.length) choice = saved.choice;
        if (saved.sorted && typeof saved.sorted === 'object') {
          const clean = {};
          for (const [k, v] of Object.entries(saved.sorted)) {
            const i = Number(k);
            if (Number.isInteger(i) && i >= 0 && i < (data.sort || []).length && (v === 'a' || v === 'b')) clean[i] = v;
          }
          sorted = clean;
        }
      }
    } catch (e) {
      error = String((e && e.message) || e);
    }
  });

  $effect(() => {
    if (data) save('contrast-pair:' + data.id, { choice, sorted });
  });

  function assign(i, side) {
    if (sorted[i]) return;
    sorted = { ...sorted, [i]: side };
  }
  function reset() { choice = null; sorted = {}; }
</script>

{#snippet morph(kind)}
  <svg viewBox="0 0 120 60" class="morph" aria-hidden="true">
    {#if kind === 'clusters'}
      {#each [[40,22],[52,18],[64,22],[46,32],[58,32],[70,30],[52,42],[64,42],[40,40],[76,40],[58,52],[46,50]] as [x, y]}<circle cx={x} cy={y} r="6" class="pos" />{/each}
    {:else if kind === 'chains'}
      {#each [10,22,34,46,58,70,82,94,106] as x, i}<circle cx={x} cy={30 + (i % 2 ? 3 : -3)} r="6" class="pos" />{/each}
    {:else if kind === 'rods-neg'}
      {#each [[14,18,0],[52,14,20],[88,22,-15],[30,40,10],[70,44,-5]] as [x, y, r]}<rect x={x} y={y} width="26" height="10" rx="5" class="neg" transform="rotate({r} {x + 13} {y + 5})" />{/each}
    {/if}
  </svg>
{/snippet}

{#if error}
  <div class="cpair card"><p class="err">⚠ {error}</p></div>
{:else if !data}
  <div class="cpair card"><p>Loading…</p></div>
{:else}
  <figure class="cpair card">
    <figcaption class="head">
      <strong>{data.title}</strong>
      <span class="hint">Compare, then sort</span>
    </figcaption>
    {#if data.intro}<p class="intro">{@html mdInline(data.intro)}</p>{/if}

    <div class="tablewrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Feature</th>
            <th scope="col"><span class="tagA">A</span> <em>{data.a.name}</em>{#if data.a.morph}{@render morph(data.a.morph)}{/if}</th>
            <th scope="col"><span class="tagB">B</span> <em>{data.b.name}</em>{#if data.b.morph}{@render morph(data.b.morph)}{/if}</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as r, ri}
            <tr class:sep={revealed && r.separates} class:same={revealed && !r.separates}>
              <th scope="row">{r.feature}{#if revealed}<span class="rtag">{r.separates ? 'differs' : 'shared'}</span>{/if}</th>
              <td>{@html mdInline(r.a)}</td>
              <td>{@html mdInline(r.b)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="q">
      <p class="stem">{data.question.stem}</p>
      <div class="opts">
        {#each data.question.options as ri}
          {@const r = rows[ri]}
          <button type="button" class="opt" disabled={revealed}
            class:correct={revealed && ri === data.question.answer}
            class:wrong={revealed && choice === ri && ri !== data.question.answer}
            onclick={() => (choice = ri)}>{r.feature}</button>
        {/each}
      </div>
      {#if revealed}
        <div class="fb" class:good={choice === data.question.answer}>
          {@html md((choice === data.question.answer ? '**Yes.** ' : '**Not the best choice.** ') + data.question.feedback)}
        </div>
        <div class="principle">{@html md(data.principle)}</div>
      {/if}
    </div>

    {#if revealed && items.length}
      <div class="sort">
        <p class="stem">Now sort: is each description A or B? <span class="hint">{sortedCount}/{items.length}{#if sortedCount} · {sortScore} correct{/if}</span></p>
        <ul>
          {#each items as it, i}
            {@const s = sorted[i]}
            <li class:right={s && s === it.answer} class:wrong={s && s !== it.answer}>
              <span class="itext">{@html mdInline(it.text)}</span>
              <span class="ab">
                <button type="button" class="abtn" disabled={!!s} class:pick={s === 'a'} onclick={() => assign(i, 'a')} aria-label="A: {data.a.name}">A</button>
                <button type="button" class="abtn" disabled={!!s} class:pick={s === 'b'} onclick={() => assign(i, 'b')} aria-label="B: {data.b.name}">B</button>
              </span>
              {#if s}<span class="why">{s === it.answer ? '✓' : '✗ It is ' + it.answer.toUpperCase() + '.'} {@html mdInline(it.why)}</span>{/if}
            </li>
          {/each}
        </ul>
      </div>
      <button type="button" class="btn secondary" onclick={reset}>Start again</button>
    {/if}
  </figure>
{/if}

<style>
  .cpair {
    --surface:#fff; --ink:#1a2027; --muted:#5b6670; --line:#d8dee5;
    --brand:#0b5d6b; --brand-bg:#eaf4f5; --good-bg:#e7f5ee; --good-line:#1f9d6b;
    --warn-bg:#fdf1e3; --warn-line:#d08a2c; --focus:#1664c0;
    color:var(--ink); font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; margin:1.2rem 0;
  }
  .cpair.card { background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:16px 20px; }
  .cpair .head { display:flex; flex-wrap:wrap; gap:6px 12px; align-items:baseline; justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:10px; margin-bottom:10px; }
  .cpair .hint { font-size:.78rem; color:var(--muted); font-weight:400; }
  .cpair .intro { font-size:.92rem; margin:0 0 10px; }
  .cpair .tablewrap { overflow-x:auto; }
  .cpair table { width:100%; border-collapse:collapse; font-size:.9rem; margin:0; }
  .cpair th, .cpair td { border-bottom:1px solid #e7ebef; padding:7px 8px; text-align:left; vertical-align:top; }
  .cpair thead th { font-weight:600; vertical-align:bottom; }
  .cpair tbody th { font-weight:600; width:26%; }
  .cpair tr.sep { background:#fff6e5; }
  .cpair tr.same td, .cpair tr.same th { color:var(--muted); }
  .cpair .rtag { display:block; font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); }
  .cpair tr.sep .rtag { color:#a2650f; }
  .cpair .tagA, .cpair .tagB { display:inline-block; width:22px; height:22px; border-radius:50%; text-align:center; line-height:22px; font-size:.78rem; color:#fff; font-style:normal; }
  .cpair .tagA { background:#0b5d6b; }
  .cpair .tagB { background:#7a4fa3; }
  .cpair .morph { display:block; width:120px; height:60px; margin-top:4px; }
  .cpair .morph .pos { fill:#5a2387; }
  .cpair .morph .neg { fill:#e0608f; }
  .cpair button { font:inherit; cursor:pointer; }
  .cpair .q { margin-top:12px; }
  .cpair .stem { font-weight:600; margin:0 0 8px; }
  .cpair .opts { display:flex; flex-wrap:wrap; gap:6px; }
  .cpair .opt { background:#fff; color:var(--ink); border:1px solid var(--line); border-radius:99px; padding:6px 14px; min-height:40px; }
  .cpair .opt:hover:not(:disabled) { border-color:var(--brand); background:var(--brand-bg); }
  .cpair .opt:disabled { cursor:default; }
  .cpair .opt.correct { border-color:var(--good-line); background:var(--good-bg); font-weight:600; }
  .cpair .opt.wrong { border-color:var(--warn-line); background:var(--warn-bg); }
  .cpair .fb { margin-top:10px; padding:10px 14px; border-radius:9px; border:1px solid var(--warn-line); background:var(--warn-bg); font-size:.94rem; }
  .cpair .fb.good { border-color:var(--good-line); background:var(--good-bg); }
  .cpair .fb :global(p), .cpair .principle :global(p) { margin:.2em 0; }
  .cpair .principle { margin-top:10px; padding:10px 14px; border-left:4px solid var(--brand); background:var(--brand-bg); border-radius:6px; font-size:.95rem; }
  .cpair .sort { margin-top:14px; }
  .cpair .sort ul { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:6px; }
  .cpair .sort li { display:grid; grid-template-columns:1fr auto; gap:4px 10px; align-items:center; border:1px solid var(--line); border-radius:8px; padding:8px 10px; }
  .cpair .sort li.right { border-color:var(--good-line); background:var(--good-bg); }
  .cpair .sort li.wrong { border-color:var(--warn-line); background:var(--warn-bg); }
  .cpair .itext { font-size:.92rem; }
  .cpair .ab { display:flex; gap:6px; }
  .cpair .abtn { width:40px; height:40px; border-radius:8px; border:1px solid var(--line); background:#fff; color:var(--ink); font-weight:700; }
  .cpair .abtn:hover:not(:disabled) { border-color:var(--brand); }
  .cpair .abtn:disabled { cursor:default; opacity:.6; }
  .cpair .abtn.pick { opacity:1; border-color:var(--ink); }
  .cpair .why { grid-column:1 / -1; font-size:.86rem; }
  .cpair .btn.secondary { margin-top:12px; background:transparent; color:var(--brand); border:1px solid var(--line); border-radius:8px; padding:8px 16px; min-height:40px; font-weight:600; }
  .cpair :focus-visible { outline:3px solid var(--focus); outline-offset:2px; border-radius:6px; }
  .cpair .err { color:#9b1c1c; }
</style>
