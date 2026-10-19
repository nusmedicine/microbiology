<script>
  // BodyMap — traces an organism's route through the body on a schematic of the body systems,
  // drawn after the systems-integration diagram of the Year 1 "Introduction to body systems"
  // lecture: the circulation in the centre feeding the organs, body surfaces on the left, the
  // nervous system, lymphoid organs and musculoskeletal tissues on the right. Each step of a route
  // marks where the organism lives, enters, multiplies, spreads (in blood, lymph, nerves or air)
  // or does damage, and can ask the learner to predict the site before it is revealed. One
  // manifest can hold several routes for one organism (for example infection, intoxication and
  // toxin-mediated shock). YAML-driven; progress is kept per manifest.
  import { onMount } from 'svelte';
  import { load, save } from './lib/store.js';
  import { loadManifest } from './lib/manifest.js';
  import { mdInline } from './lib/md.js';

  let { src } = $props();

  // ---- Fixed map: 18 body sites in three columns (viewBox 360 × 486) -------------------------
  const COL = { L: 60, C: 180, R: 300 };
  const ROW = (i) => 30 + i * 54;
  const W = 100, H = 36;
  const NODES = {
    outside: { col: 'L', row: 0, label: ['Outside', 'the body'], dashed: true },
    'ear-sinus': { col: 'L', row: 1, label: ['Middle ear,', 'sinuses'] },
    skin: { col: 'L', row: 6, label: ['Skin'] },
    genital: { col: 'L', row: 7, label: ['Genital', 'tract'] },
    'nose-throat': { col: 'C', row: 1, label: ['Nose and', 'throat'] },
    airway: { col: 'C', row: 2, label: ['Airway'] },
    alveoli: { col: 'C', row: 3, label: ['Lungs:', 'alveoli'] },
    heart: { col: 'C', row: 4, label: ['Heart and', 'valves'] },
    blood: { col: 'C', row: 5, label: ['Blood'] },
    liver: { col: 'C', row: 6, label: ['Liver'] },
    gut: { col: 'C', row: 7, label: ['Gut'] },
    urinary: { col: 'C', row: 8, label: ['Kidney,', 'bladder'] },
    brain: { col: 'R', row: 0, label: ['Brain and', 'meninges'] },
    nerves: { col: 'R', row: 1, label: ['Nerves,', 'ganglia'] },
    lymph: { col: 'R', row: 3, label: ['Lymph', 'nodes'] },
    spleen: { col: 'R', row: 5, label: ['Spleen'] },
    tissue: { col: 'R', row: 6, label: ['Soft', 'tissue'] },
    bone: { col: 'R', row: 7, label: ['Bones and', 'joints'] },
  };
  const KEYS = Object.keys(NODES);
  const nodeName = (k) => NODES[k].label.join(' ');

  // Transport networks, drawn under the sites. Blood: pulmonary circuit, an arterial trunk from the
  // heart (up to the brain, down to the kidney) and a venous trunk back, with a branch to each organ
  // the circulation feeds. Lymph: soft tissue to lymph nodes. Nerve: ganglia to brain. Air: nose
  // and throat to the airway, the alveoli and the middle ear and sinuses.
  const ART = '#e3a49b', VEIN = '#9db8d9';
  const NET = {
    blood: [
      ['M190,210 V228', ART], ['M170,228 V210', VEIN],
      ['M230,246 H240 V30 H250', ART], ['M240,246 V462 H230', ART],
      ['M240,300 H250', ART], ['M240,354 H250', ART], ['M240,408 H250', ART],
      ['M240,300 H230', ART], ['M240,354 H230', ART], ['M240,408 H230', ART],
      ['M130,462 H120 V246 H130', VEIN],
      ['M130,300 H120', VEIN], ['M130,354 H120', VEIN], ['M130,408 H120', VEIN],
      ['M120,354 H110', VEIN], ['M120,408 H110', VEIN],
    ],
    lymph: [['M350,354 H356 V192 H350', '#8fd1b4']],
    nerve: [['M300,48 V66', '#e2c15d']],
    air: [['M180,102 V120', '#c3ccd6'], ['M180,156 V174', '#c3ccd6'], ['M110,84 H130', '#c3ccd6']],
  };
  const NET_HI = { blood: '#eb6834', lymph: '#1baf7a', nerve: '#c99a06', air: '#2a78d6' };

  const KINDS = {
    lives: { label: 'Lives', color: '#1baf7a' },
    enters: { label: 'Enters', color: '#2a78d6' },
    multiplies: { label: 'Multiplies', color: '#7a4fa3' },
    spreads: { label: 'Spreads', color: '#eb6834' },
    damages: { label: 'Damages', color: '#c0264b' },
    defence: { label: 'Host defence', color: '#5b6670' },
  };
  const VIA = {
    blood: 'in the blood', lymph: 'in lymph', nerve: 'along nerves', air: 'through the air spaces',
    direct: 'through the tissue', swallowed: 'swallowed',
  };

  const list = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  function box(k) {
    const n = NODES[k];
    return { cx: COL[n.col], cy: ROW(n.row) };
  }
  // Point on a site's box edge (plus padding) in the direction of (tx, ty).
  function edgePoint(k, tx, ty, pad = 4) {
    const { cx, cy } = box(k);
    const dx = tx - cx, dy = ty - cy;
    const sx = dx === 0 ? Infinity : (W / 2 + pad) / Math.abs(dx);
    const sy = dy === 0 ? Infinity : (H / 2 + pad) / Math.abs(dy);
    const s = Math.min(sx, sy);
    return [cx + dx * s, cy + dy * s];
  }
  // A gently curved arrow from one site to another, with its arrowhead.
  function arrow(a, b) {
    const A = box(a), B = box(b);
    const dx = B.cx - A.cx, dy = B.cy - A.cy;
    const len = Math.hypot(dx, dy) || 1;
    const off = Math.min(36, len * 0.2);
    const qx = (A.cx + B.cx) / 2 - (dy / len) * off, qy = (A.cy + B.cy) / 2 + (dx / len) * off;
    const [x1, y1] = edgePoint(a, qx, qy);
    const [x2, y2] = edgePoint(b, qx, qy, 6);
    const ang = Math.atan2(y2 - qy, x2 - qx);
    const hx = (r, t) => (x2 + r * Math.cos(ang + t)).toFixed(1) + ',' + (y2 + r * Math.sin(ang + t)).toFixed(1);
    return {
      d: `M${x1.toFixed(1)},${y1.toFixed(1)} Q${qx.toFixed(1)},${qy.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`,
      head: `${x2.toFixed(1)},${y2.toFixed(1)} ${hx(-9, -0.45)} ${hx(-9, 0.45)}`,
    };
  }

  // ---- State -----------------------------------------------------------------------------------
  let data = $state(null);
  let error = $state(null);
  let r = $state(0); // route index
  let s = $state(0); // step index within the route
  let answers = $state({}); // { 'route:step': chosen site key }
  let showAll = $state(false);
  let hover = $state(null);
  let width = $state(0); // card width: on phones the labels are larger, so their lines sit further apart
  let narrow = $derived(width > 0 && width < 440);
  let gap = $derived(narrow ? 15 : 13);

  let routes = $derived(data ? data.routes : []);
  let steps = $derived(routes[r] ? routes[r].steps : []);
  let step = $derived(steps[s]);
  let akey = $derived(r + ':' + s);
  let pending = $derived(!!(step && step.ask && answers[akey] == null));
  let chosen = $derived(answers[akey]);
  let accepted = $derived(step ? list(step.answer ?? step.at) : []);
  let last = $derived(showAll ? steps.length - 1 : pending ? s - 1 : s); // last step drawn on the map
  let kindsUsed = $derived(Object.keys(KINDS).filter((k) => routes.some((rt) => rt.steps.some((p) => p.kind === k))));
  // How a step travelled, unless the site already says so (a step that arrives in the blood).
  const viaText = (p) => (p.via && VIA[p.via] && !(p.via === 'blood' && list(p.at).includes('blood')) ? ' · ' + VIA[p.via] : '');

  let siteState = $derived.by(() => {
    const st = {};
    steps.forEach((p, i) => {
      if (i > last) return;
      for (const k of list(p.at)) st[k] = { kind: p.kind, current: !showAll && i === s };
    });
    return st;
  });
  let badges = $derived.by(() => {
    const b = {};
    steps.forEach((p, i) => {
      if (i > last) return;
      for (const k of list(p.at)) (b[k] ||= []).push({ n: i + 1, kind: p.kind });
    });
    return b;
  });
  let arrows = $derived.by(() => {
    const out = [];
    const add = (i, faint) => {
      for (const a of list(steps[i - 1].at))
        for (const b of list(steps[i].at))
          if (a !== b) out.push({ ...arrow(a, b), faint, key: i + a + b });
    };
    if (showAll) for (let i = 1; i < steps.length; i++) add(i, true);
    else if (!pending && s > 0) add(s, false);
    return out;
  });
  let activeNet = $derived(!showAll && !pending && step && NET[step.via] ? step.via : null);
  let mapLabel = $derived(
    !step ? 'Map of the body systems'
      : pending ? `Map of the body systems. Step ${s + 1} of ${steps.length}: predict the site.`
      : `Map of the body systems. Step ${s + 1} of ${steps.length}, ${KINDS[step.kind].label.toLowerCase()}: ${list(step.at).map(nodeName).join(', ')}.`
  );

  onMount(async () => {
    try {
      const d = await loadManifest(src);
      const rts = d && (d.routes || (d.steps ? [{ name: '', steps: d.steps }] : null));
      if (!rts || !rts.length) throw new Error('no routes in manifest');
      for (const rt of rts) {
        if (!Array.isArray(rt.steps) || !rt.steps.length) throw new Error('route without steps');
        for (const p of rt.steps) {
          for (const k of [...list(p.at), ...list(p.options), ...list(p.answer)])
            if (!NODES[k]) throw new Error('unknown body site "' + k + '" (known: ' + KEYS.join(', ') + ')');
          if (!KINDS[p.kind]) throw new Error('unknown step kind "' + p.kind + '"');
          if (p.via && !VIA[p.via]) throw new Error('unknown route "via: ' + p.via + '"');
        }
      }
      d.routes = rts;
      const saved = load('body-map:' + d.id);
      if (saved) {
        if (Number.isInteger(saved.r) && saved.r >= 0 && saved.r < rts.length) r = saved.r;
        if (Number.isInteger(saved.s) && saved.s >= 0 && saved.s < rts[r].steps.length) s = saved.s;
        if (saved.answers && typeof saved.answers === 'object') {
          const clean = {};
          for (const [k, v] of Object.entries(saved.answers)) if (NODES[v]) clean[k] = v;
          answers = clean;
        }
      }
      data = d;
    } catch (e) {
      error = String((e && e.message) || e);
    }
  });

  $effect(() => {
    if (data) save('body-map:' + data.id, { r, s, answers });
  });

  function pickRoute(i) { r = i; s = 0; showAll = false; }
  function next() { if (!pending && s < steps.length - 1) s += 1; }
  function back() { if (s > 0) s -= 1; }
  function choose(k) {
    if (!pending || !list(step.options).includes(k)) return;
    answers = { ...answers, [akey]: k };
    hover = null;
  }
  function restart() {
    const keep = {};
    for (const [k, v] of Object.entries(answers)) if (!k.startsWith(r + ':')) keep[k] = v;
    answers = keep;
    s = 0;
    showAll = false;
  }
</script>

{#if error}
  <div class="bm card"><p class="err">⚠ {error}</p></div>
{:else if !data}
  <div class="bm card"><p>Loading…</p></div>
{:else}
  <figure class="bm card" bind:clientWidth={width}>
    <figcaption class="head">
      <strong>{@html mdInline(data.title)}</strong>
      {#if !showAll}<span class="hint">Step {s + 1} of {steps.length}</span>{/if}
    </figcaption>
    {#if data.intro}<p class="intro">{@html mdInline(data.intro)}</p>{/if}

    {#if routes.length > 1}
      <div class="tabs" role="group" aria-label="Routes">
        {#each routes as rt, i}
          <button type="button" class="tab" class:on={i === r} aria-pressed={i === r} onclick={() => pickRoute(i)}>{@html mdInline(rt.name)}</button>
        {/each}
      </div>
    {/if}

    <div class="grid">
      <svg viewBox="0 0 360 486" class="map" role="img" aria-label={mapLabel}>
        <!-- transport networks -->
        {#each Object.entries(NET) as [net, paths]}
          {#each paths as [d, c]}
            <path {d} class="net" stroke={activeNet === net ? NET_HI[net] : c}
              stroke-width={activeNet === net ? 4 : 2.2} opacity={activeNet && activeNet !== net ? 0.45 : 1} />
          {/each}
        {/each}

        <!-- route arrows (drawn under the sites, so they pass behind boxes) -->
        {#each arrows as a (a.key)}
          <path d={a.d} class="halo" />
          <path d={a.d} class="arrow" class:faint={a.faint} />
          <polygon points={a.head} class="head" opacity={a.faint ? 0.6 : 1} />
        {/each}

        <!-- body sites -->
        {#each KEYS as k}
          {@const n = NODES[k]}
          {@const st = siteState[k]}
          {@const opt = pending && list(step.options).includes(k)}
          {@const cx = COL[n.col]}
          {@const cy = ROW(n.row)}
          <!-- Clicking a site is a pointer shortcut; keyboard users answer with the option buttons. -->
          <g class="site" class:opt class:hov={hover === k} class:cur={st && st.current}
            onclick={() => choose(k)} onpointerenter={() => opt && (hover = k)} onpointerleave={() => opt && (hover = null)}>
            <rect x={cx - W / 2} y={cy - H / 2} width={W} height={H} rx="7"
              class:dashed={n.dashed}
              fill={st ? (st.current ? KINDS[st.kind].color + '24' : '#fff') : opt && hover === k ? '#eaf2fc' : '#f4f6f8'}
              stroke={st ? KINDS[st.kind].color : opt ? '#1664c0' : '#c9d1da'}
              stroke-width={st ? (st.current ? 2.6 : 1.7) : opt ? 2 : 1} />
            {#each n.label as line, j}
              <text x={cx} y={cy + (j - (n.label.length - 1) / 2) * gap + (narrow ? 4.9 : 4.3)} class="lbl" class:strong={st && st.current}>{line}</text>
            {/each}
          </g>
        {/each}

        <!-- step badges at each site's right edge -->
        {#each Object.entries(badges) as [k, bs]}
          {#each bs as b, j}
            {@const cx = COL[NODES[k].col] + W / 2}
            {@const cy = ROW(NODES[k].row) - H / 2 + 2 + j * 16}
            <circle {cx} {cy} r="8" fill={KINDS[b.kind].color} stroke="#fff" stroke-width="1.5" />
            <text x={cx} y={cy + 3.6} class="num">{b.n}</text>
          {/each}
        {/each}
      </svg>

      <div class="panel">
        {#if showAll}
          <ol class="all">
            {#each steps as p, i}
              <li>
                <span class="chip" style="--k:{KINDS[p.kind].color}">{KINDS[p.kind].label}</span>
                <span class="where">{list(p.at).map(nodeName).join(', ')}{viaText(p)}</span>
                <span class="txt">{@html mdInline(p.text)}</span>
              </li>
            {/each}
          </ol>
        {:else if step}
          <div class="stephead">
            <span class="chip" style="--k:{pending ? '#1664c0' : KINDS[step.kind].color}">{pending ? 'Predict' : KINDS[step.kind].label}</span>
            {#if !pending}
              <span class="where">{list(step.at).map(nodeName).join(', ')}{viaText(step)}</span>
            {/if}
          </div>
          {#if step.ask}
            <p class="ask">{@html mdInline(step.ask)}</p>
            <div class="opts">
              {#each list(step.options) as k}
                <button type="button" class="opt" disabled={!pending}
                  class:correct={!pending && accepted.includes(k)} class:wrong={!pending && chosen === k && !accepted.includes(k)}
                  onpointerenter={() => pending && (hover = k)} onpointerleave={() => (hover = null)}
                  onfocus={() => pending && (hover = k)} onblur={() => (hover = null)}
                  onclick={() => choose(k)}>{nodeName(k)}</button>
              {/each}
            </div>
            {#if pending}
              <p class="lock">Choose on the map or above; the step is revealed after the choice.</p>
            {:else if step.why}
              <p class="why" class:good={accepted.includes(chosen)}>{@html mdInline(step.why)}</p>
            {/if}
          {/if}
          {#if !pending}
            <p class="txt" aria-live="polite">{@html mdInline(step.text)}</p>
          {/if}
        {/if}

        <div class="nav">
          {#if !showAll}
            <button type="button" class="btn secondary" onclick={back} disabled={s === 0}>Back</button>
            <button type="button" class="btn" onclick={next} disabled={pending || s >= steps.length - 1}>Next step</button>
          {/if}
          <div class="dots" aria-hidden="true">
            {#each steps as _, i}<span class="dot" class:done={showAll || i <= last} class:here={!showAll && i === s}></span>{/each}
          </div>
        </div>
        <div class="small">
          <button type="button" class="txtbtn" onclick={() => (showAll = !showAll)} aria-expanded={showAll}>
            {showAll ? 'Step through the route' : 'Show the whole route'}
          </button>
          <button type="button" class="txtbtn" onclick={restart}>Start this route again</button>
        </div>
      </div>
    </div>

    <div class="legend" aria-hidden="true">
      {#each kindsUsed as k}<span class="chip" style="--k:{KINDS[k].color}">{KINDS[k].label}</span>{/each}
      <span class="key"><i style="background:{ART}"></i><i style="background:{VEIN}"></i>Blood</span>
      <span class="key"><i style="background:#8fd1b4"></i>Lymph</span>
      <span class="key"><i style="background:#e2c15d"></i>Nerves</span>
      <span class="key"><i style="background:#c3ccd6"></i>Air passages</span>
    </div>
    {#if data.note}<p class="note">{@html mdInline(data.note)}</p>{/if}
  </figure>
{/if}

<style>
  .bm {
    --surface:#fff; --ink:#1a2027; --muted:#5b6670; --line:#d8dee5;
    --brand:#0b5d6b; --brand-bg:#eaf4f5; --good-bg:#e7f5ee; --good-line:#1f9d6b;
    --warn-bg:#fdf1e3; --warn-line:#d08a2c; --focus:#1664c0;
    color:var(--ink); font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; margin:1.2rem 0;
    container-type:inline-size;
  }
  .bm.card { background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:16px 20px; }
  .bm .head { display:flex; flex-wrap:wrap; gap:6px 12px; align-items:baseline; justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:10px; margin-bottom:10px; }
  .bm .hint { font-size:.78rem; color:var(--muted); font-variant-numeric:tabular-nums; }
  .bm .intro { font-size:.92rem; margin:0 0 10px; }
  .bm button { font:inherit; cursor:pointer; }
  .bm .tabs { display:flex; flex-wrap:wrap; gap:6px; margin:0 0 12px; }
  .bm .tab { background:#fff; color:var(--ink); border:1px solid var(--line); border-radius:99px; padding:6px 14px; min-height:38px; font-size:.9rem; }
  .bm .tab:hover { border-color:var(--brand); }
  .bm .tab.on { background:var(--brand); border-color:var(--brand); color:#fff; font-weight:600; }
  .bm .grid { display:grid; grid-template-columns:minmax(0, 380px) minmax(0, 1fr); gap:16px 20px; align-items:start; }
  @container (max-width: 640px) {
    .bm .grid { grid-template-columns:minmax(0, 1fr); }
    .bm .map { max-width:420px; margin:0 auto; }
  }
  .bm .map { width:100%; height:auto; display:block; }
  .bm .net { fill:none; stroke-linecap:round; stroke-linejoin:round; transition:stroke .25s, stroke-width .25s, opacity .25s; }
  .bm .halo { fill:none; stroke:#fff; stroke-width:7; stroke-linecap:round; opacity:.9; }
  .bm .arrow { fill:none; stroke:#2b3440; stroke-width:2.4; stroke-linecap:round; }
  .bm .head { fill:#2b3440; }
  .bm .arrow.faint { stroke-width:1.6; opacity:.6; }
  .bm .lbl { font:500 12.5px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; fill:#3c4650; text-anchor:middle; pointer-events:none; }
  .bm .lbl.strong { font-weight:700; fill:var(--ink); }
  .bm .num { font:700 10px system-ui,sans-serif; fill:#fff; text-anchor:middle; pointer-events:none; }
  .bm .site rect { transition:fill .2s, stroke .2s; }
  .bm .site rect.dashed { stroke-dasharray:4 3; }
  .bm .site.opt { cursor:pointer; }
  .bm .site.opt rect { stroke-dasharray:5 3; }
  .bm .site.cur rect { animation:bm-pulse 1.6s ease-in-out 2; }
  @keyframes bm-pulse { 50% { stroke-width:4.2; } }
  @media (prefers-reduced-motion: reduce) {
    .bm .site.cur rect { animation:none; }
    .bm .net, .bm .site rect { transition:none; }
  }
  .bm .panel { min-width:0; }
  .bm .stephead { display:flex; flex-wrap:wrap; gap:6px 10px; align-items:center; margin:0 0 6px; }
  .bm .chip { display:inline-block; border-radius:99px; padding:1px 10px; font-size:.74rem; font-weight:700; letter-spacing:.03em; text-transform:uppercase; color:#fff; background:var(--k); }
  .bm .where { font-weight:600; font-size:.95rem; }
  .bm .txt { margin:.4em 0 0; font-size:.95rem; }
  .bm .ask { font-weight:600; margin:6px 0 8px; }
  .bm .opts { display:flex; flex-wrap:wrap; gap:6px; }
  .bm .opt { background:#fff; color:var(--ink); border:1px solid var(--line); border-radius:99px; padding:6px 14px; min-height:40px; font-size:.9rem; }
  .bm .opt:hover:not(:disabled) { border-color:var(--focus); background:#eaf2fc; }
  .bm .opt:disabled { cursor:default; }
  .bm .opt.correct { border-color:var(--good-line); background:var(--good-bg); font-weight:600; }
  .bm .opt.wrong { border-color:var(--warn-line); background:var(--warn-bg); }
  .bm .lock { margin:8px 0 0; font-size:.8rem; color:var(--muted); }
  .bm .why { margin:10px 0 0; padding:8px 12px; border-radius:8px; border:1px solid var(--warn-line); background:var(--warn-bg); font-size:.92rem; }
  .bm .why.good { border-color:var(--good-line); background:var(--good-bg); }
  .bm .nav { display:flex; flex-wrap:wrap; align-items:center; gap:8px 10px; margin-top:14px; }
  .bm .btn { background:var(--brand); color:#fff; border:1px solid var(--brand); border-radius:8px; padding:8px 16px; min-height:40px; font-weight:600; }
  .bm .btn.secondary { background:transparent; color:var(--brand); border-color:var(--line); }
  .bm .btn:disabled { opacity:.45; cursor:default; }
  .bm .dots { display:flex; gap:5px; margin-left:4px; }
  .bm .dot { width:9px; height:9px; border-radius:50%; background:#d8dee5; }
  .bm .dot.done { background:#9aa8b6; }
  .bm .dot.here { background:var(--brand); }
  .bm .small { display:flex; flex-wrap:wrap; gap:4px 14px; margin-top:8px; }
  .bm .txtbtn { border:none; background:none; color:var(--brand); font-size:.84rem; text-decoration:underline; padding:2px; }
  .bm .all { margin:0; padding-left:1.3em; display:flex; flex-direction:column; gap:8px; font-size:.92rem; }
  .bm .all .txt { display:block; margin:.15em 0 0; }
  .bm .legend { display:flex; flex-wrap:wrap; gap:6px 12px; align-items:center; margin-top:14px; padding-top:10px; border-top:1px solid var(--line); font-size:.8rem; color:var(--muted); }
  .bm .legend .chip { font-size:.66rem; }
  .bm .key { display:inline-flex; align-items:center; gap:4px; }
  .bm .key i { display:inline-block; width:16px; height:4px; border-radius:2px; }
  .bm .note { font-size:.8rem; color:var(--muted); margin:8px 0 0; }
  .bm :focus-visible { outline:3px solid var(--focus); outline-offset:2px; border-radius:6px; }
  .bm .err { color:#9b1c1c; }
  /* Phones (kept last so it overrides the rules above): the map shrinks below its drawn size, so
     its labels are set larger to stay legible, and the card gives the map more of the width. */
  @container (max-width: 440px) {
    .bm .lbl { font-size:14px; }
    .bm .num { font-size:11px; }
  }
  @media (max-width: 480px) {
    .bm.card { padding:14px 12px; }
  }
</style>
