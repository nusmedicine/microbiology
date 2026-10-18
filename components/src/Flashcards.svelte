<script>
  // Flashcards — a small spaced-repetition deck (Leitner boxes). Cards are conceptual by design:
  // "why", "predict" and "tell apart" prompts, not organism-to-fact pairs. Each card has a box
  // (1–5) and a due time; "Again" sends it back to box 1 and to the end of today's queue, "Got it"
  // moves it up a box and schedules it 1/3/7/14/30 days out. Progress lives in local storage only.
  // The deck can be downloaded as tab-separated text for import into Anki. YAML-driven.
  import { onMount } from 'svelte';
  import { load, save } from './lib/store.js';
  import { loadManifest } from './lib/manifest.js';
  import { md, mdInline } from './lib/md.js';

  let { src } = $props();

  const DAY = 864e5;
  const GAP = [1, 3, 7, 14, 30]; // days until next review after reaching box 1..5
  const KIND = { why: 'Why', predict: 'Predict', apart: 'Tell apart', how: 'How' };

  let data = $state(null);
  let error = $state(null);
  let prog = $state({}); // { [cardId]: { box, due } }
  let queue = $state([]); // card ids for this session
  let flipped = $state(false);
  let reviewed = $state(0);
  let now = $state(Date.now());

  let cards = $derived(data ? data.cards : []);
  let byId = $derived(Object.fromEntries(cards.map((c) => [c.id, c])));
  let card = $derived(queue.length ? byId[queue[0]] : null);
  let dueCount = $derived(cards.filter((c) => !prog[c.id] || prog[c.id].due <= now).length);
  let nextDue = $derived.by(() => {
    const t = cards.map((c) => (prog[c.id] ? prog[c.id].due : 0)).filter((d) => d > now);
    return t.length ? Math.min(...t) : null;
  });
  let boxes = $derived([1, 2, 3, 4, 5].map((b) => cards.filter((c) => (prog[c.id] ? prog[c.id].box : 0) === b).length));
  let unseen = $derived(cards.filter((c) => !prog[c.id]).length);

  onMount(async () => {
    try {
      data = await loadManifest(src);
      if (!data || !Array.isArray(data.cards) || !data.cards.length) throw new Error('empty deck');
      const saved = load('flashcards:' + data.id);
      if (saved && saved.prog && typeof saved.prog === 'object') {
        const ids = new Set(data.cards.map((c) => c.id));
        const clean = {};
        for (const [k, v] of Object.entries(saved.prog)) {
          if (ids.has(k) && v && Number.isInteger(v.box) && v.box >= 1 && v.box <= 5 && Number.isFinite(v.due)) clean[k] = { box: v.box, due: v.due };
        }
        prog = clean;
      }
      startDue();
    } catch (e) {
      error = String((e && e.message) || e);
    }
  });

  $effect(() => {
    if (data) save('flashcards:' + data.id, { prog });
  });

  function startDue() {
    now = Date.now();
    queue = cards.filter((c) => !prog[c.id] || prog[c.id].due <= now).map((c) => c.id);
    flipped = false;
  }
  function startAll() {
    now = Date.now();
    queue = cards.map((c) => c.id);
    flipped = false;
  }
  function rate(ok) {
    if (!card) return;
    const id = card.id;
    const box = ok ? Math.min(5, (prog[id] ? prog[id].box : 0) + 1) : 1;
    prog = { ...prog, [id]: { box, due: ok ? Date.now() + GAP[box - 1] * DAY : Date.now() } };
    reviewed += 1;
    queue = ok ? queue.slice(1) : [...queue.slice(1), id];
    flipped = false;
    now = Date.now();
  }
  function resetDeck() { prog = {}; reviewed = 0; startDue(); }
  function inDays(t) {
    const d = Math.ceil((t - now) / DAY);
    return d <= 1 ? 'tomorrow' : 'in ' + d + ' days';
  }
  function plain(s) { return String(s).replace(/\*\*|\*|`/g, '').replace(/\s*\n\s*/g, ' ').trim(); }
  function download() {
    const lines = cards.map((c) => plain(c.front).replace(/\t/g, ' ') + '\t' + plain(c.back).replace(/\t/g, ' '));
    const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/tab-separated-values' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (data.id || 'deck') + '.tsv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
</script>

{#if error}
  <div class="fc card"><p class="err">⚠ {error}</p></div>
{:else if !data}
  <div class="fc card"><p>Loading…</p></div>
{:else}
  <figure class="fc card">
    <figcaption class="head">
      <strong>{data.title}</strong>
      <span class="hint">{cards.length} cards · {unseen} new · {dueCount} due</span>
    </figcaption>
    {#if data.intro}<p class="intro">{@html mdInline(data.intro)}</p>{/if}

    {#if card}
      <div class="stage">
        <div class="face" aria-live="polite">
          <span class="kind">{KIND[card.kind] || 'Card'}</span>
          <div class="front">{@html md(card.front)}</div>
          {#if flipped}<div class="back">{@html md(card.back)}</div>{/if}
        </div>
        <div class="controls">
          {#if !flipped}
            <button type="button" class="btn" onclick={() => (flipped = true)}>Show answer</button>
            <span class="left">{queue.length} left in this round</span>
          {:else}
            <button type="button" class="btn again" onclick={() => rate(false)}>Again</button>
            <button type="button" class="btn" onclick={() => rate(true)}>Got it</button>
            <span class="left">Did your answer match? Rate yourself.</span>
          {/if}
        </div>
      </div>
    {:else}
      <div class="stage empty">
        <p><b>Round finished.</b> {reviewed ? 'You reviewed ' + reviewed + ' card' + (reviewed === 1 ? '' : 's') + '.' : ''}
          {#if nextDue}Next card due {inDays(nextDue)}.{/if}</p>
        <div class="controls">
          {#if dueCount}<button type="button" class="btn" onclick={startDue}>Review {dueCount} due</button>{/if}
          <button type="button" class="btn secondary" onclick={startAll}>Practise all anyway</button>
        </div>
      </div>
    {/if}

    <div class="boxes" aria-label="Cards by box">
      {#each boxes as n, i}<span class="bx" title="Box {i + 1}"><b>{n}</b> box {i + 1}</span>{/each}
    </div>
    <div class="foot">
      <button type="button" class="txt" onclick={download}>Download for Anki (.tsv)</button>
      <button type="button" class="txt" onclick={resetDeck}>Reset progress</button>
    </div>
  </figure>
{/if}

<style>
  .fc {
    --surface:#fff; --ink:#1a2027; --muted:#5b6670; --line:#d8dee5;
    --brand:#0b5d6b; --brand-bg:#eaf4f5; --warn-line:#d08a2c; --focus:#1664c0;
    color:var(--ink); font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; margin:1.2rem 0;
  }
  .fc.card { background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:16px 20px; }
  .fc .head { display:flex; flex-wrap:wrap; gap:6px 12px; align-items:baseline; justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:10px; margin-bottom:10px; }
  .fc .hint { font-size:.78rem; color:var(--muted); }
  .fc .intro { font-size:.92rem; margin:0 0 10px; }
  .fc .face { min-height:150px; border:1px solid var(--line); border-radius:12px; padding:14px 18px; background:linear-gradient(#fff, #f8fafb); }
  .fc .kind { display:inline-block; font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--brand); background:var(--brand-bg); border-radius:99px; padding:2px 10px; }
  .fc .front { font-weight:600; margin-top:8px; }
  .fc .front :global(p), .fc .back :global(p) { margin:.3em 0; }
  .fc .back { margin-top:10px; padding-top:10px; border-top:1px dashed var(--line); font-size:.95rem; }
  .fc button { font:inherit; cursor:pointer; }
  .fc .controls { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-top:10px; }
  .fc .btn { background:var(--brand); color:#fff; border:1px solid var(--brand); border-radius:8px; padding:8px 16px; min-height:40px; font-weight:600; }
  .fc .btn.again { background:#fff; color:#8a4b0c; border-color:var(--warn-line); }
  .fc .btn.secondary { background:transparent; color:var(--brand); border-color:var(--line); }
  .fc .left { font-size:.8rem; color:var(--muted); }
  .fc .empty p { margin:0; }
  .fc .boxes { display:flex; flex-wrap:wrap; gap:6px; margin-top:12px; }
  .fc .bx { font-size:.74rem; color:var(--muted); border:1px solid var(--line); border-radius:6px; padding:2px 8px; }
  .fc .bx b { color:var(--ink); }
  .fc .foot { display:flex; gap:14px; margin-top:8px; }
  .fc .txt { border:none; background:none; color:var(--brand); font-size:.8rem; text-decoration:underline; padding:2px; }
  .fc :focus-visible { outline:3px solid var(--focus); outline-offset:2px; border-radius:6px; }
  .fc .err { color:#9b1c1c; }
</style>
