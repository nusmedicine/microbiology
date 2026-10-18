<script>
  // OxygenTube — predict-then-reveal on the thioglycollate oxygen gradient. Each unnamed organism
  // is described only by its energy metabolism and its relationship with oxygen; the learner picks
  // which of five growth patterns it will show, then sees the answer, the reasoning and the real
  // organism's name. The organism name is withheld until after the choice so the task is reasoning
  // from mechanism, not recalling a list. Data-driven from a YAML manifest.
  import { onMount } from 'svelte';
  import { load, save } from './lib/store.js';
  import { loadManifest } from './lib/manifest.js';
  import { md, mdInline } from './lib/md.js';

  let { src } = $props();

  let data = $state(null);
  let error = $state(null);
  let idx = $state(0);
  let picks = $state({}); // { [organismIndex]: patternKey }

  let orgs = $derived(data ? data.organisms : []);
  let pats = $derived(data ? data.patterns : []);
  let org = $derived(orgs[idx]);
  let picked = $derived(org ? picks[idx] : null);
  let done = $derived(orgs.length > 0 && orgs.every((_, i) => picks[i]));
  let score = $derived(orgs.reduce((a, o, i) => a + (picks[i] === o.pattern ? 1 : 0), 0));
  let answered = $derived(Object.keys(picks).length);

  // Deterministic dot field per pattern: density(d) for depth d in [0,1].
  const DENS = {
    top: (d) => (d < 0.14 ? 1 : 0),
    gradient: (d) => Math.max(0.12, 1 - d * 1.1),
    band: (d) => (d > 0.09 && d < 0.22 ? 1 : 0),
    even: () => 0.45,
    bottom: (d) => (d > 0.58 ? 0.9 : 0),
  };
  function dots(key) {
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const out = [];
    for (let i = 0; i < 420; i++) {
      const x = 7 + rnd() * 30, d = rnd(), keep = rnd();
      if (keep < (DENS[key] || (() => 0))(d)) out.push({ x, y: 22 + d * 124 });
    }
    return out;
  }
  const FIELD = Object.fromEntries(Object.keys(DENS).map((k) => [k, dots(k)]));

  onMount(async () => {
    try {
      data = await loadManifest(src);
      if (!data || !Array.isArray(data.organisms) || !data.organisms.length) throw new Error('empty manifest');
      const saved = load('oxygen-tube:' + data.id);
      if (saved && saved.picks && typeof saved.picks === 'object') {
        const clean = {};
        for (const [k, v] of Object.entries(saved.picks)) {
          const i = Number(k);
          if (Number.isInteger(i) && i >= 0 && i < data.organisms.length && data.patterns.some((p) => p.key === v)) clean[i] = v;
        }
        picks = clean;
      }
      if (saved && Number.isInteger(saved.idx) && saved.idx >= 0 && saved.idx < data.organisms.length) idx = saved.idx;
    } catch (e) {
      error = String((e && e.message) || e);
    }
  });

  $effect(() => {
    if (data) save('oxygen-tube:' + data.id, { picks, idx });
  });

  function pick(key) {
    if (picked) return;
    picks = { ...picks, [idx]: key };
  }
  function next() {
    const n = orgs.findIndex((_, i) => i > idx && !picks[i]);
    const any = orgs.findIndex((_, i) => !picks[i]);
    idx = n >= 0 ? n : any >= 0 ? any : idx;
  }
  function reset() { picks = {}; idx = 0; }
  const patOf = (k) => pats.find((p) => p.key === k);
</script>

{#snippet tube(p, state)}
  <svg viewBox="0 0 44 160" class="tube" aria-hidden="true">
    <rect x="3" y="4" width="38" height="152" rx="16" fill="#fbf7ee" stroke="#8d96a0" stroke-width="1.5" />
    <rect x="4.5" y="8" width="35" height="16" rx="10" fill="#f6c6d6" opacity="0.8" />
    {#each FIELD[p.key] as d}<circle cx={d.x} cy={d.y} r="1.6" fill={state === 'right' ? '#1f7a55' : state === 'wrong' ? '#b06a1d' : '#59636e'} />{/each}
  </svg>
{/snippet}

{#if error}
  <div class="ot card"><p class="err">⚠ {error}</p></div>
{:else if !data}
  <div class="ot card"><p>Loading…</p></div>
{:else}
  <figure class="ot card">
    <figcaption class="head">
      <strong>{data.title}</strong>
      <span class="hint">{answered} / {orgs.length} placed{#if answered} · {score} correct{/if}</span>
    </figcaption>
    {#if data.intro}<p class="intro">{data.intro}</p>{/if}

    <div class="orgnav" role="group" aria-label="Choose an organism">
      {#each orgs as o, i}
        <button type="button" class="ochip" class:on={i === idx}
          class:right={picks[i] && picks[i] === o.pattern} class:wrong={picks[i] && picks[i] !== o.pattern}
          aria-pressed={i === idx} onclick={() => (idx = i)}>{i + 1}</button>
      {/each}
    </div>

    <div class="clue">
      <p class="oname">{org.name}{#if picked}: <em>{org.example}</em>{/if}</p>
      <p>{@html mdInline(org.clue)}</p>
      <p class="ask">{picked ? 'Your choice is marked below.' : 'Which tube will it grow in?'}</p>
    </div>

    <div class="tubes" role="group" aria-label="Growth patterns">
      {#each pats as p}
        {@const isAns = picked && p.key === org.pattern}
        {@const isWrong = picked === p.key && p.key !== org.pattern}
        <button type="button" class="tbtn" class:ans={isAns} class:wrong={isWrong} class:chosen={picked === p.key}
          disabled={!!picked} onclick={() => pick(p.key)}
          aria-label={'Tube ' + p.letter + (done || picked ? ': ' + p.rule : '')}>
          {@render tube(p, isAns ? 'right' : isWrong ? 'wrong' : '')}
          <span class="tl">{p.letter}</span>
          {#if done}<span class="tg">{p.group}</span>{/if}
        </button>
      {/each}
    </div>
    <p class="legend"><span class="pinkdot"></span>pink = oxygen present · dots = growth</p>

    {#if picked}
      {@const ans = patOf(org.pattern)}
      <div class="fb" class:good={picked === org.pattern} aria-live="polite">
        <p><b>{picked === org.pattern ? 'Correct' : 'Not quite'}: tube {ans.letter}, {ans.group.toLowerCase()}.</b> {ans.rule}</p>
        <p>{@html mdInline(org.why)}</p>
      </div>
      {#if !done}<button type="button" class="btn" onclick={next}>Next organism</button>{/if}
    {/if}

    {#if done}
      <div class="summary">{@html md(data.summary)}</div>
      <button type="button" class="btn secondary" onclick={reset}>Try again</button>
    {/if}
  </figure>
{/if}

<style>
  .ot {
    --surface:#fff; --ink:#1a2027; --muted:#5b6670; --line:#d8dee5;
    --brand:#0b5d6b; --brand-bg:#eaf4f5; --good-bg:#e7f5ee; --good-line:#1f9d6b;
    --warn-bg:#fdf1e3; --warn-line:#d08a2c; --focus:#1664c0;
    color:var(--ink); font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; margin:1.2rem 0;
  }
  .ot.card { background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:16px 20px; }
  .ot .head { display:flex; flex-wrap:wrap; gap:6px 12px; align-items:baseline; justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:10px; margin-bottom:10px; }
  .ot .hint { font-size:.78rem; color:var(--muted); }
  .ot .intro { font-size:.92rem; margin:0 0 10px; }
  .ot button { font:inherit; cursor:pointer; }
  .ot .orgnav { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px; }
  .ot .ochip { width:36px; height:36px; border-radius:50%; border:1px solid var(--line); background:#fff; color:var(--ink); font-weight:600; }
  .ot .ochip.on { box-shadow:0 0 0 2px var(--focus); }
  .ot .ochip.right { background:var(--good-bg); border-color:var(--good-line); }
  .ot .ochip.wrong { background:var(--warn-bg); border-color:var(--warn-line); }
  .ot .clue { background:#f7f9fb; border:1px solid var(--line); border-radius:9px; padding:10px 14px; }
  .ot .clue p { margin:.25em 0; }
  .ot .oname { font-weight:700; }
  .ot .ask { color:var(--muted); font-size:.88rem; }
  .ot .tubes { display:grid; grid-template-columns:repeat(5, 1fr); gap:8px; margin-top:12px; }
  .ot .tbtn { display:flex; flex-direction:column; align-items:center; gap:4px; background:#fff; border:1px solid var(--line); border-radius:10px; padding:8px 4px; color:var(--ink); }
  .ot .tbtn:hover:not(:disabled) { border-color:var(--brand); background:var(--brand-bg); }
  .ot .tbtn:disabled { cursor:default; }
  .ot .tbtn.ans { border:2px solid var(--good-line); background:var(--good-bg); }
  .ot .tbtn.wrong { border:2px solid var(--warn-line); background:var(--warn-bg); }
  .ot .tube { width:44px; height:160px; }
  .ot .tl { font-weight:700; }
  .ot .tg { font-size:.72rem; text-align:center; line-height:1.25; color:var(--muted); }
  .ot .legend { font-size:.76rem; color:var(--muted); margin:6px 0 0; display:flex; align-items:center; gap:6px; }
  .ot .pinkdot { width:12px; height:12px; border-radius:3px; background:#f6c6d6; display:inline-block; }
  .ot .fb { margin:12px 0 8px; padding:10px 14px; border-radius:9px; border:1px solid var(--warn-line); background:var(--warn-bg); }
  .ot .fb.good { border-color:var(--good-line); background:var(--good-bg); }
  .ot .fb p { margin:.25em 0; font-size:.94rem; }
  .ot .summary { margin:12px 0 8px; padding:10px 14px; border-left:4px solid var(--brand); background:var(--brand-bg); border-radius:6px; font-size:.95rem; }
  .ot .summary :global(p) { margin:.2em 0; }
  .ot .btn { background:var(--brand); color:#fff; border:1px solid var(--brand); border-radius:8px; padding:8px 16px; min-height:40px; font-weight:600; }
  .ot .btn.secondary { background:transparent; color:var(--brand); border-color:var(--line); }
  .ot :focus-visible { outline:3px solid var(--focus); outline-offset:2px; border-radius:6px; }
  .ot .err { color:#9b1c1c; }
  @media (max-width:520px) { .ot .tubes { gap:4px; } .ot .tube { width:36px; height:130px; } }
</style>
