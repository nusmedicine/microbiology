<script>
  // BacteriaMap — the bacterial groups taught in lectures, laid out as combinations of a few traits
  // (envelope · shape · oxygen · where it grows · lab growth). EXPLORE: click a group for the logic
  // that ties its traits to its behaviour; click a column to line groups up by that trait, showing
  // that a "class" is just a trait combination. TEST: interleaved practice — a set of traits (and one
  // extra fact) is shown without a name, and the learner names the group. A manifest may `extends`
  // another (to reuse one map's data) and set `mode: identify` to open on the test. The same
  // component drives the map of the viruses: `rowLabel` names the first column and `prompt` replaces
  // the explore-mode prompt, both defaulting to the bacterial wording. YAML-driven.
  import { onMount } from 'svelte';
  import { load, save } from './lib/store.js';
  import { loadManifest } from './lib/manifest.js';
  import { md, mdInline } from './lib/md.js';

  let { src } = $props();

  let data = $state(null);
  let error = $state(null);
  let mode = $state('explore');
  let sel = $state(null); // selected group id
  let sortKey = $state(null);
  let qi = $state(0);
  let answers = $state({}); // { [itemIndex]: groupId }

  let traits = $derived(data ? data.traits : []);
  let groups = $derived(data ? data.groups : []);
  let items = $derived(data ? data.identify || [] : []);
  let rowLabel = $derived((data && data.rowLabel) || 'Group');
  let byId = $derived(Object.fromEntries(groups.map((g) => [g.id, g])));
  let selected = $derived(sel ? byId[sel] : null);
  let rows = $derived.by(() => {
    if (!sortKey) return groups;
    const t = traits.find((x) => x.key === sortKey);
    const order = Object.keys(t.values);
    return [...groups].sort((a, b) => order.indexOf(a[sortKey]) - order.indexOf(b[sortKey]));
  });
  let item = $derived(items[qi]);
  let picked = $derived(item ? answers[qi] : null);
  let score = $derived(items.reduce((acc, it, i) => acc + (answers[i] === it.answer ? 1 : 0), 0));
  let done = $derived(items.length > 0 && items.every((_, i) => answers[i]));

  const tv = (key, val) => {
    const t = traits.find((x) => x.key === key);
    return (t && t.values[val]) || { label: val, color: '#6c7682' };
  };
  const tlabel = (key) => (traits.find((x) => x.key === key) || { label: key }).label;

  onMount(async () => {
    try {
      let d = await loadManifest(src);
      if (d && d.extends) {
        const base = await loadManifest(d.extends);
        d = { ...base, ...d, traits: base.traits, groups: base.groups, identify: d.identify || base.identify };
      }
      if (!d || !Array.isArray(d.traits) || !Array.isArray(d.groups)) throw new Error('empty manifest');
      data = d;
      mode = d.mode === 'identify' ? 'identify' : 'explore';
      const saved = load('bacteria-map:' + d.id);
      if (saved && saved.answers && typeof saved.answers === 'object') {
        const ids = new Set(d.groups.map((g) => g.id));
        const clean = {};
        for (const [k, v] of Object.entries(saved.answers)) {
          const i = Number(k);
          if (Number.isInteger(i) && i >= 0 && i < (d.identify || []).length && ids.has(v)) clean[i] = v;
        }
        answers = clean;
      }
      if (saved && Number.isInteger(saved.qi) && saved.qi >= 0 && saved.qi < (d.identify || []).length) qi = saved.qi;
    } catch (e) {
      error = String((e && e.message) || e);
    }
  });

  $effect(() => {
    if (data) save('bacteria-map:' + data.id, { answers, qi });
  });

  function pickGroup(id) {
    if (picked) return;
    answers = { ...answers, [qi]: id };
  }
  function nextItem() {
    const n = items.findIndex((_, i) => i > qi && !answers[i]);
    const any = items.findIndex((_, i) => !answers[i]);
    qi = n >= 0 ? n : any >= 0 ? any : qi;
  }
  function resetTest() { answers = {}; qi = 0; }
</script>

{#if error}
  <div class="bm card"><p class="err">⚠ {error}</p></div>
{:else if !data}
  <div class="bm card"><p>Loading…</p></div>
{:else}
  <figure class="bm card">
    <figcaption class="head">
      <strong>{data.title}</strong>
      <span class="tabs" role="tablist" aria-label="Mode">
        <button type="button" role="tab" aria-selected={mode === 'explore'} class:on={mode === 'explore'} onclick={() => (mode = 'explore')}>Explore</button>
        {#if items.length}<button type="button" role="tab" aria-selected={mode === 'identify'} class:on={mode === 'identify'} onclick={() => (mode = 'identify')}>Test yourself</button>{/if}
      </span>
    </figcaption>

    {#if mode === 'explore'}
      {#if data.intro}<p class="intro">{@html mdInline(data.intro)}</p>{/if}
      <div class="tablewrap">
        <table>
          <thead>
            <tr>
              <th scope="col">{rowLabel}</th>
              {#each traits as t}
                <th scope="col">
                  <button type="button" class="colbtn" class:on={sortKey === t.key} aria-pressed={sortKey === t.key}
                    onclick={() => (sortKey = sortKey === t.key ? null : t.key)}>{t.label}{sortKey === t.key ? ' ▾' : ''}</button>
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each rows as g (g.id)}
              <tr class:on={sel === g.id}>
                <th scope="row"><button type="button" class="gbtn" aria-expanded={sel === g.id} onclick={() => (sel = sel === g.id ? null : g.id)}>{g.name}</button></th>
                {#each traits as t}
                  {@const v = tv(t.key, g[t.key])}
                  <td><span class="chip" class:dim={sortKey && sortKey !== t.key} style="--c:{v.color}">{v.label}</span></td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      {#if selected}
        <div class="detail" aria-live="polite">
          <p class="dname">{selected.name}</p>
          <p class="ex">{@html mdInline(selected.examples)}</p>
          <div class="logic">{@html md(selected.logic)}</div>
          <p class="home"><b>Usual home:</b> {selected.home}</p>
        </div>
      {:else}
        <p class="prompt">{data.prompt || 'Click a group name to see the logic behind its traits.'}</p>
      {/if}
    {:else}
      <p class="intro">{data.identifyIntro || 'Each set of traits belongs to one group. Name the group, then read why.'} <span class="hint">{Object.keys(answers).length}/{items.length} · {score} correct</span></p>
      <div class="qnav" role="group" aria-label="Choose a question">
        {#each items as it, i}
          <button type="button" class="qchip" class:on={i === qi}
            class:right={answers[i] && answers[i] === it.answer} class:wrong={answers[i] && answers[i] !== it.answer}
            aria-pressed={i === qi} onclick={() => (qi = i)}>{i + 1}</button>
        {/each}
      </div>
      <div class="clues">
        {#each Object.entries(item.clues) as [k, v]}
          {@const c = tv(k, v)}
          <span class="clue"><span class="ck">{tlabel(k)}</span><span class="chip" style="--c:{c.color}">{c.label}</span></span>
        {/each}
        {#if item.extra}<p class="extra">{@html mdInline(item.extra)}</p>{/if}
      </div>
      <div class="gopts" role="group" aria-label={'Which ' + rowLabel.toLowerCase() + '?'}>
        {#each groups as g}
          <button type="button" class="gopt" disabled={!!picked}
            class:correct={picked && g.id === item.answer} class:wrong={picked === g.id && g.id !== item.answer}
            onclick={() => pickGroup(g.id)}>{g.name}</button>
        {/each}
      </div>
      {#if picked}
        {@const g = byId[item.answer]}
        <div class="fb" class:good={picked === item.answer} aria-live="polite">
          <p><b>{picked === item.answer ? 'Correct' : 'Answer: ' + g.name}.</b></p>
          {@html md(g.logic)}
        </div>
        {#if !done}<button type="button" class="btn" onclick={nextItem}>Next</button>{:else}<button type="button" class="btn secondary" onclick={resetTest}>Try again</button>{/if}
      {/if}
    {/if}
  </figure>
{/if}

<style>
  .bm {
    --surface:#fff; --ink:#1a2027; --muted:#5b6670; --line:#d8dee5;
    --brand:#0b5d6b; --brand-bg:#eaf4f5; --good-bg:#e7f5ee; --good-line:#1f9d6b;
    --warn-bg:#fdf1e3; --warn-line:#d08a2c; --focus:#1664c0;
    color:var(--ink); font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; margin:1.2rem 0;
  }
  .bm.card { background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:16px 20px; }
  .bm .head { display:flex; flex-wrap:wrap; gap:8px 12px; align-items:center; justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:10px; margin-bottom:10px; }
  .bm button { font:inherit; cursor:pointer; }
  .bm .tabs { display:inline-flex; border:1px solid var(--line); border-radius:8px; overflow:hidden; }
  .bm .tabs button { border:none; background:#fff; color:var(--brand); padding:6px 14px; font-size:.86rem; font-weight:600; min-height:36px; }
  .bm .tabs button.on { background:var(--brand); color:#fff; }
  .bm .intro { font-size:.92rem; margin:0 0 10px; }
  .bm .hint { font-size:.78rem; color:var(--muted); white-space:nowrap; }
  .bm .tablewrap { overflow-x:auto; }
  .bm table { border-collapse:collapse; font-size:.82rem; width:100%; min-width:640px; margin:0; }
  .bm th, .bm td { border-bottom:1px solid #e7ebef; padding:5px 6px; text-align:left; vertical-align:middle; }
  .bm thead th { padding-bottom:6px; }
  .bm .colbtn { border:none; background:none; color:var(--brand); font-weight:700; font-size:.8rem; padding:2px 0; text-decoration:underline dotted; text-underline-offset:3px; }
  .bm .colbtn.on { color:var(--ink); text-decoration:none; }
  .bm .gbtn { border:none; background:none; color:var(--ink); font-weight:600; text-align:left; padding:2px 0; font-size:.84rem; }
  .bm .gbtn:hover { color:var(--brand); text-decoration:underline; }
  .bm tr.on { background:var(--brand-bg); }
  .bm .chip { display:inline-block; font-size:.74rem; line-height:1.3; padding:2px 8px; border-radius:99px; color:var(--c); background:color-mix(in srgb, var(--c) 12%, #fff); border:1px solid color-mix(in srgb, var(--c) 35%, #fff); white-space:nowrap; }
  .bm .chip.dim { opacity:.45; }
  .bm .detail { margin-top:12px; padding:10px 14px; border-left:4px solid var(--brand); background:var(--brand-bg); border-radius:6px; }
  .bm .detail p { margin:.25em 0; }
  .bm .dname { font-weight:700; }
  .bm .ex { font-size:.88rem; color:var(--muted); }
  .bm .logic :global(p) { margin:.3em 0; font-size:.94rem; }
  .bm .home { font-size:.88rem; }
  .bm .prompt { margin:10px 2px 0; font-size:.84rem; color:var(--muted); }
  .bm .qnav { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px; }
  .bm .qchip { width:34px; height:34px; border-radius:50%; border:1px solid var(--line); background:#fff; font-weight:600; color:var(--ink); }
  .bm .qchip.on { box-shadow:0 0 0 2px var(--focus); }
  .bm .qchip.right { background:var(--good-bg); border-color:var(--good-line); }
  .bm .qchip.wrong { background:var(--warn-bg); border-color:var(--warn-line); }
  .bm .clues { background:#f7f9fb; border:1px solid var(--line); border-radius:9px; padding:10px 14px; display:flex; flex-wrap:wrap; gap:8px 14px; align-items:center; }
  .bm .clue { display:inline-flex; align-items:center; gap:6px; }
  .bm .ck { font-size:.74rem; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.03em; }
  .bm .extra { width:100%; margin:2px 0 0; font-size:.93rem; }
  .bm .gopts { display:flex; flex-wrap:wrap; gap:6px; margin-top:12px; }
  .bm .gopt { background:#fff; color:var(--ink); border:1px solid var(--line); border-radius:99px; padding:6px 12px; min-height:38px; font-size:.86rem; }
  .bm .gopt:hover:not(:disabled) { border-color:var(--brand); background:var(--brand-bg); }
  .bm .gopt:disabled { cursor:default; }
  .bm .gopt.correct { border-color:var(--good-line); background:var(--good-bg); font-weight:600; }
  .bm .gopt.wrong { border-color:var(--warn-line); background:var(--warn-bg); }
  .bm .fb { margin:12px 0 8px; padding:10px 14px; border-radius:9px; border:1px solid var(--warn-line); background:var(--warn-bg); font-size:.94rem; }
  .bm .fb.good { border-color:var(--good-line); background:var(--good-bg); }
  .bm .fb :global(p) { margin:.25em 0; }
  .bm .btn { background:var(--brand); color:#fff; border:1px solid var(--brand); border-radius:8px; padding:8px 16px; min-height:40px; font-weight:600; }
  .bm .btn.secondary { background:transparent; color:var(--brand); border-color:var(--line); }
  .bm :focus-visible { outline:3px solid var(--focus); outline-offset:2px; border-radius:6px; }
  .bm .err { color:#9b1c1c; }
</style>
