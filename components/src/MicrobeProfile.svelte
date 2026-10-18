<script>
  // MicrobeProfile — the book's fixed five-slot organism card (identity & structure · lifestyle &
  // niche · mechanism of harm · general consequence · contrast partner). A slot is either WORKED
  // (shown filled) or a PREDICT slot: the learner chooses before the expert entry is revealed.
  // Mixing the two in one card fades the support across the book (worked → partial → blank).
  // When every slot is filled, the card collapses to the finished profile. YAML-driven.
  import { onMount } from 'svelte';
  import { load, save } from './lib/store.js';
  import { loadManifest } from './lib/manifest.js';
  import { md, mdInline } from './lib/md.js';

  let { src } = $props();

  const SLOTS = {
    identity: 'Identity and structure',
    lifestyle: 'Lifestyle and niche',
    harm: 'Mechanism of harm',
    consequence: 'General consequence',
    contrast: 'Contrast partner',
  };

  let data = $state(null);
  let error = $state(null);
  let picks = $state({}); // { [slotIndex]: optionIndex }

  let slots = $derived(data ? data.slots : []);
  let filled = $derived(slots.filter((s, i) => !s.predict || picks[i] != null).length);
  let complete = $derived(slots.length > 0 && filled === slots.length);

  onMount(async () => {
    try {
      data = await loadManifest(src);
      if (!data || !Array.isArray(data.slots) || !data.slots.length) throw new Error('empty manifest');
      const saved = load('microbe-profile:' + data.id);
      if (saved && saved.picks && typeof saved.picks === 'object') {
        const clean = {};
        for (const [k, v] of Object.entries(saved.picks)) {
          const i = Number(k);
          const s = data.slots[i];
          if (s && s.predict && Number.isInteger(v) && v >= 0 && v < s.predict.options.length) clean[i] = v;
        }
        picks = clean;
      }
    } catch (e) {
      error = String((e && e.message) || e);
    }
  });

  $effect(() => {
    if (data) save('microbe-profile:' + data.id, { picks });
  });

  function choose(si, oi) {
    if (picks[si] != null) return;
    picks = { ...picks, [si]: oi };
  }
  function reset() { picks = {}; }
</script>

{#if error}
  <div class="mp card"><p class="err">⚠ {error}</p></div>
{:else if !data}
  <div class="mp card"><p>Loading…</p></div>
{:else}
  <figure class="mp card">
    <figcaption class="head">
      <span class="kicker">Microbe profile</span>
      <strong class="name"><em>{data.name}</em></strong>
      <span class="group">{data.group}</span>
      <span class="hint">{filled}/{slots.length} slots filled</span>
    </figcaption>
    {#if data.intro && !complete}<p class="intro">{@html mdInline(data.intro)}</p>{/if}

    <dl class="slots">
      {#each slots as s, si}
        {@const open = !s.predict || picks[si] != null}
        <div class="slot" class:open class:todo={!open}>
          <dt>{SLOTS[s.slot] || s.slot}{#if s.predict && !complete}<span class="ptag">{picks[si] != null ? 'you predicted' : 'predict'}</span>{/if}</dt>
          <dd>
            {#if !open}
              <p class="pstem">{@html mdInline(s.predict.stem)}</p>
              <div class="opts">
                {#each s.predict.options as o, oi}
                  <button type="button" class="opt" onclick={() => choose(si, oi)}>{@html mdInline(o.text)}</button>
                {/each}
              </div>
            {:else}
              {#if s.predict && !complete}
                {@const o = s.predict.options[picks[si]]}
                <p class="verdict" class:good={o.correct}>{o.correct ? '✓ ' : '✗ '}{@html mdInline(o.feedback)}</p>
              {/if}
              <div class="entry">{@html md(s.entry)}</div>
            {/if}
          </dd>
        </div>
      {/each}
    </dl>

    {#if complete}
      <p class="done">Profile complete. Compare it with its contrast partner: the same five questions, different answers.</p>
      {#if slots.some((s) => s.predict)}<button type="button" class="btn secondary" onclick={reset}>Hide and predict again</button>{/if}
    {/if}
  </figure>
{/if}

<style>
  .mp {
    --surface:#fff; --ink:#1a2027; --muted:#5b6670; --line:#d8dee5;
    --brand:#0b5d6b; --brand-bg:#eaf4f5; --good-bg:#e7f5ee; --good-line:#1f9d6b;
    --warn-bg:#fdf1e3; --warn-line:#d08a2c; --focus:#1664c0;
    color:var(--ink); font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; margin:1.2rem 0;
  }
  .mp.card { background:var(--surface); border:1px solid var(--line); border-top:5px solid var(--brand); border-radius:10px; padding:14px 20px 16px; }
  .mp .head { display:flex; flex-wrap:wrap; gap:4px 12px; align-items:baseline; border-bottom:1px solid var(--line); padding-bottom:10px; margin-bottom:6px; }
  .mp .kicker { width:100%; font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--brand); }
  .mp .name { font-size:1.15rem; }
  .mp .group { font-size:.86rem; color:var(--muted); }
  .mp .hint { margin-left:auto; font-size:.78rem; color:var(--muted); }
  .mp .intro { font-size:.92rem; margin:6px 0; }
  .mp .slots { margin:0; }
  .mp .slot { display:grid; grid-template-columns:minmax(120px, 28%) 1fr; gap:10px; padding:10px 0; border-bottom:1px solid #eef1f4; }
  .mp .slot:last-child { border-bottom:0; }
  .mp dt { font-weight:700; font-size:.9rem; color:var(--brand); }
  .mp .ptag { display:block; margin-top:3px; font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:#a2650f; }
  .mp dd { margin:0; font-size:.93rem; }
  .mp .entry :global(p) { margin:0 0 .3em; }
  .mp .pstem { margin:0 0 6px; font-weight:600; }
  .mp button { font:inherit; cursor:pointer; }
  .mp .opts { display:flex; flex-direction:column; gap:6px; }
  .mp .opt { text-align:left; background:#fff; color:var(--ink); border:1px solid var(--line); border-radius:8px; padding:8px 12px; min-height:42px; }
  .mp .opt:hover { border-color:var(--brand); background:var(--brand-bg); }
  .mp .verdict { margin:0 0 6px; padding:6px 10px; border-radius:7px; background:var(--warn-bg); border:1px solid var(--warn-line); font-size:.88rem; }
  .mp .verdict.good { background:var(--good-bg); border-color:var(--good-line); }
  .mp .done { margin:10px 0 0; font-size:.9rem; color:var(--muted); }
  .mp .btn.secondary { margin-top:8px; background:transparent; color:var(--brand); border:1px solid var(--line); border-radius:8px; padding:7px 14px; min-height:38px; font-weight:600; }
  .mp :focus-visible { outline:3px solid var(--focus); outline-offset:2px; border-radius:6px; }
  .mp .err { color:#9b1c1c; }
  @media (max-width:560px) { .mp .slot { grid-template-columns:1fr; gap:4px; } }
</style>
