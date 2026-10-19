<script>
  // SortingKey — a branching identification key for a group of organisms, taught as reasoning:
  // each branch is a trait, and choosing it reveals what that trait MEANS for the organism (not just
  // where it leads). The trail of choices stays visible, so the learner sees an organism as the sum
  // of the traits that led to it. A "show the whole key" view lays out the full tree. Reusable for
  // bacteria, viruses, fungi and parasites. Data-driven from a YAML manifest.
  import { onMount } from 'svelte';
  import { load, save } from './lib/store.js';
  import { loadManifest } from './lib/manifest.js';
  import { md, mdInline } from './lib/md.js';

  let { src } = $props();

  let data = $state(null);
  let error = $state(null);
  let path = $state([]); // [{ node, opt }] choices made so far
  let whole = $state(false);
  let seen = $state({}); // leaf ids reached at least once

  let nodes = $derived(data ? Object.fromEntries(data.nodes.map((n) => [n.id, n])) : {});
  let leaves = $derived(data ? Object.fromEntries(data.leaves.map((l) => [l.id, l])) : {});
  let curId = $derived(path.length ? nodes[path.at(-1).node].options[path.at(-1).opt].next : data ? data.start : null);
  let curNode = $derived(curId ? nodes[curId] : null);
  let curLeaf = $derived(curId && !nodes[curId] ? leaves[curId] : null);
  let seenCount = $derived(Object.keys(seen).length);

  onMount(async () => {
    try {
      const d = await loadManifest(src);
      if (!d || !Array.isArray(d.nodes) || !Array.isArray(d.leaves) || !d.start) throw new Error('empty manifest');
      data = d;
      const saved = load('sorting-key:' + d.id);
      if (saved && saved.seen && typeof saved.seen === 'object') {
        const ids = new Set(d.leaves.map((l) => l.id));
        seen = Object.fromEntries(Object.keys(saved.seen).filter((k) => ids.has(k)).map((k) => [k, true]));
      }
    } catch (e) {
      error = String((e && e.message) || e);
    }
  });

  $effect(() => {
    if (data) save('sorting-key:' + data.id, { seen });
  });

  $effect(() => {
    if (curLeaf && !seen[curLeaf.id]) seen = { ...seen, [curLeaf.id]: true };
  });

  function choose(i) { path = [...path, { node: curId, opt: i }]; }
  function back() { path = path.slice(0, -1); }
  function restart() { path = []; }
</script>

{#snippet tree(id, depth)}
  {#if nodes[id]}
    <li>
      <span class="tq">{nodes[id].question}</span>
      <ul>
        {#each nodes[id].options as o}
          <li><span class="to">{o.label}</span> <span class="tm">— {@html mdInline(o.meaning)}</span>
            <ul>{@render tree(o.next, depth + 1)}</ul>
          </li>
        {/each}
      </ul>
    </li>
  {:else if leaves[id]}
    <li class="tleaf"><b>{@html mdInline(leaves[id].name)}</b>{#if leaves[id].tag === 'main'} <span class="mtag">main</span>{/if}</li>
  {/if}
{/snippet}

{#if error}
  <div class="sk card"><p class="err">⚠ {error}</p></div>
{:else if !data}
  <div class="sk card"><p>Loading…</p></div>
{:else}
  <figure class="sk card">
    <figcaption class="head">
      <strong>{data.title}</strong>
      <span class="hint">{seenCount} / {data.leaves.length} organisms reached</span>
    </figcaption>
    {#if data.intro}<p class="intro">{@html mdInline(data.intro)}</p>{/if}

    {#if path.length}
      <ol class="trail" aria-label="Your choices so far">
        {#each path as step}
          {@const n = nodes[step.node]}
          {@const o = n.options[step.opt]}
          <li><span class="tqs">{n.question}</span> <b>{o.label}</b><span class="mean">{@html mdInline(o.meaning)}</span></li>
        {/each}
      </ol>
    {/if}

    {#if curNode}
      <div class="ask" aria-live="polite">
        <p class="q">{curNode.question}</p>
        <div class="opts">
          {#each curNode.options as o, i}
            <button type="button" class="opt" onclick={() => choose(i)}>{o.label}</button>
          {/each}
        </div>
      </div>
    {:else if curLeaf}
      <div class="leaf" class:main={curLeaf.tag === 'main'} aria-live="polite">
        <span class="ltag">{curLeaf.tag === 'main' ? 'Main organism: full profile in this chapter' : 'Supporting organism'}</span>
        <p class="lname">{@html mdInline(curLeaf.name)}</p>
        <div class="lblurb">{@html md(curLeaf.blurb)}</div>
      </div>
    {/if}

    <div class="controls">
      {#if path.length}<button type="button" class="btn secondary" onclick={back}>Back one step</button>{/if}
      {#if curLeaf}<button type="button" class="btn" onclick={restart}>Sort another</button>{/if}
      <button type="button" class="txt" onclick={() => (whole = !whole)} aria-expanded={whole}>{whole ? 'Hide' : 'Show'} the whole key</button>
    </div>

    {#if whole}
      <ul class="whole">{@render tree(data.start, 0)}</ul>
    {/if}
  </figure>
{/if}

<style>
  .sk {
    --surface:#fff; --ink:#1a2027; --muted:#5b6670; --line:#d8dee5;
    --brand:#0b5d6b; --brand-bg:#eaf4f5; --focus:#1664c0;
    color:var(--ink); font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; margin:1.2rem 0;
  }
  .sk.card { background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:16px 20px; }
  .sk .head { display:flex; flex-wrap:wrap; gap:6px 12px; align-items:baseline; justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:10px; margin-bottom:10px; }
  .sk .hint { font-size:.78rem; color:var(--muted); }
  .sk .intro { font-size:.92rem; margin:0 0 10px; }
  .sk .trail { list-style:none; margin:0 0 10px; padding:0 0 0 14px; border-left:3px solid var(--brand); display:flex; flex-direction:column; gap:6px; }
  .sk .trail li { font-size:.9rem; }
  .sk .tqs { color:var(--muted); }
  .sk .mean { display:block; font-size:.86rem; color:#3d4650; }
  .sk .ask { background:#f7f9fb; border:1px solid var(--line); border-radius:9px; padding:10px 14px; }
  .sk .q { font-weight:600; margin:0 0 8px; }
  .sk button { font:inherit; cursor:pointer; }
  .sk .opts { display:flex; flex-wrap:wrap; gap:6px; }
  .sk .opt { background:#fff; color:var(--ink); border:1px solid var(--line); border-radius:99px; padding:6px 14px; min-height:40px; }
  .sk .opt:hover { border-color:var(--brand); background:var(--brand-bg); }
  .sk .leaf { border:1px solid var(--line); border-left:5px solid #8a96a3; border-radius:8px; padding:10px 14px; }
  .sk .leaf.main { border-left-color:var(--brand); background:var(--brand-bg); }
  .sk .ltag { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); }
  .sk .leaf.main .ltag { color:var(--brand); }
  .sk .lname { font-weight:700; font-size:1.05rem; margin:2px 0 4px; }
  .sk .lblurb :global(p) { margin:.25em 0; font-size:.93rem; }
  .sk .controls { display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-top:10px; }
  .sk .btn { background:var(--brand); color:#fff; border:1px solid var(--brand); border-radius:8px; padding:7px 14px; min-height:38px; font-weight:600; }
  .sk .btn.secondary { background:transparent; color:var(--brand); border-color:var(--line); }
  .sk .txt { border:none; background:none; color:var(--brand); font-size:.84rem; text-decoration:underline; padding:2px; margin-left:auto; }
  .sk .whole { margin:10px 0 0; padding-left:18px; font-size:.86rem; border-top:1px solid var(--line); padding-top:10px; }
  .sk .whole ul { padding-left:18px; }
  .sk .tq { font-weight:600; }
  .sk .to { font-weight:600; color:var(--brand); }
  .sk .tm { color:var(--muted); }
  .sk .mtag { font-size:.66rem; font-weight:700; text-transform:uppercase; color:var(--brand); border:1px solid var(--brand); border-radius:99px; padding:0 6px; }
  .sk :focus-visible { outline:3px solid var(--focus); outline-offset:2px; border-radius:6px; }
  .sk .err { color:#9b1c1c; }
</style>
