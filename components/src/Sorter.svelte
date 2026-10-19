<script>
  // Sorter — interleaved category practice with two to five categories. Each item is assigned to a
  // category with immediate feedback that names the deciding feature. When every item is sorted,
  // a summary states what the members of each category have in common (the principle comes AFTER
  // the practice, as in the contrasting-cases evidence). YAML-driven.
  import { onMount } from 'svelte';
  import { load, save } from './lib/store.js';
  import { loadManifest } from './lib/manifest.js';
  import { md, mdInline } from './lib/md.js';

  let { src } = $props();

  let data = $state(null);
  let error = $state(null);
  let answers = $state({}); // { [itemIndex]: categoryKey }

  let cats = $derived(data ? data.categories : []);
  let items = $derived(data ? data.items : []);
  let catOf = $derived(Object.fromEntries(cats.map((c) => [c.key, c])));
  let done = $derived(items.length > 0 && items.every((_, i) => answers[i]));
  let score = $derived(items.reduce((acc, it, i) => acc + (answers[i] === it.answer ? 1 : 0), 0));

  onMount(async () => {
    try {
      const d = await loadManifest(src);
      if (!d || !Array.isArray(d.categories) || !Array.isArray(d.items)) throw new Error('empty manifest');
      data = d;
      const saved = load('sorter:' + d.id);
      if (saved && saved.answers && typeof saved.answers === 'object') {
        const keys = new Set(d.categories.map((c) => c.key));
        const clean = {};
        for (const [k, v] of Object.entries(saved.answers)) {
          const i = Number(k);
          if (Number.isInteger(i) && i >= 0 && i < d.items.length && keys.has(v)) clean[i] = v;
        }
        answers = clean;
      }
    } catch (e) {
      error = String((e && e.message) || e);
    }
  });

  $effect(() => {
    if (data) save('sorter:' + data.id, { answers });
  });

  function assign(i, key) {
    if (answers[i]) return;
    answers = { ...answers, [i]: key };
  }
  function reset() { answers = {}; }
</script>

{#if error}
  <div class="so card"><p class="err">⚠ {error}</p></div>
{:else if !data}
  <div class="so card"><p>Loading…</p></div>
{:else}
  <figure class="so card">
    <figcaption class="head">
      <strong>{data.title}</strong>
      <span class="hint">{Object.keys(answers).length}/{items.length} sorted{#if Object.keys(answers).length} · {score} correct{/if}</span>
    </figcaption>
    {#if data.intro}<p class="intro">{@html mdInline(data.intro)}</p>{/if}

    <ul class="items">
      {#each items as it, i}
        {@const a = answers[i]}
        <li class:right={a && a === it.answer} class:wrong={a && a !== it.answer}>
          <p class="itext">{@html mdInline(it.text)}</p>
          <div class="cats" role="group" aria-label="Choose a category">
            {#each cats as c}
              <button type="button" class="cbtn" disabled={!!a} class:pick={a === c.key} class:ans={a && c.key === it.answer}
                onclick={() => assign(i, c.key)}>{c.label}</button>
            {/each}
          </div>
          {#if a}<p class="why">{a === it.answer ? '✓' : '✗ ' + catOf[it.answer].label + '.'} {@html mdInline(it.why)}</p>{/if}
        </li>
      {/each}
    </ul>

    {#if done}
      <div class="summary">
        {#each cats as c}{#if c.summary}<p><b>{c.label}:</b> {@html mdInline(c.summary)}</p>{/if}{/each}
      </div>
      <button type="button" class="btn secondary" onclick={reset}>Start again</button>
    {/if}
  </figure>
{/if}

<style>
  .so {
    --surface:#fff; --ink:#1a2027; --muted:#5b6670; --line:#d8dee5;
    --brand:#0b5d6b; --brand-bg:#eaf4f5; --good-bg:#e7f5ee; --good-line:#1f9d6b;
    --warn-bg:#fdf1e3; --warn-line:#d08a2c; --focus:#1664c0;
    color:var(--ink); font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; margin:1.2rem 0;
  }
  .so.card { background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:16px 20px; }
  .so .head { display:flex; flex-wrap:wrap; gap:6px 12px; align-items:baseline; justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:10px; margin-bottom:10px; }
  .so .hint { font-size:.78rem; color:var(--muted); }
  .so .intro { font-size:.92rem; margin:0 0 10px; }
  .so .items { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:8px; }
  .so .items li { border:1px solid var(--line); border-radius:8px; padding:8px 12px; }
  .so .items li.right { border-color:var(--good-line); background:var(--good-bg); }
  .so .items li.wrong { border-color:var(--warn-line); background:var(--warn-bg); }
  .so .itext { margin:0 0 6px; font-size:.93rem; }
  .so button { font:inherit; cursor:pointer; }
  .so .cats { display:flex; flex-wrap:wrap; gap:6px; }
  .so .cbtn { background:#fff; color:var(--ink); border:1px solid var(--line); border-radius:99px; padding:4px 12px; min-height:36px; font-size:.84rem; }
  .so .cbtn:hover:not(:disabled) { border-color:var(--brand); background:var(--brand-bg); }
  .so .cbtn:disabled { cursor:default; opacity:.6; }
  .so .cbtn.pick, .so .cbtn.ans { opacity:1; font-weight:600; }
  .so .cbtn.ans { border-color:var(--good-line); }
  .so .why { margin:6px 0 0; font-size:.87rem; }
  .so .summary { margin-top:12px; padding:10px 14px; border-left:4px solid var(--brand); background:var(--brand-bg); border-radius:6px; font-size:.93rem; }
  .so .summary p { margin:.3em 0; }
  .so .btn.secondary { margin-top:10px; background:transparent; color:var(--brand); border:1px solid var(--line); border-radius:8px; padding:8px 16px; min-height:40px; font-weight:600; }
  .so :focus-visible { outline:3px solid var(--focus); outline-offset:2px; border-radius:6px; }
  .so .err { color:#9b1c1c; }
</style>
