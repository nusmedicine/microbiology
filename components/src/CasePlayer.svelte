<script>
  import { onMount, tick } from 'svelte';
  import yaml from 'js-yaml';
  import * as E from './lib/engine.js';
  import { md, mdInline } from './lib/md.js';
  import { load, save, clear } from './lib/store.js';
  import { patientConfig } from './lib/config.js';
  import { patientSystemPrompt, evaluatorMessages, callPatient, callEvaluator, parsePatientReply } from './lib/patient.js';
  import { resolveAsset } from './lib/base.js';
  import { optionOrder } from './lib/order.js';

  let { src } = $props();

  let def = $state(null);
  let state = $state(null);
  let error = $state(null);
  let byId = {};
  let titleEl = $state(null);
  let lastId;

  // Simulated-patient LLM: null when the book has no endpoint configured, in
  // which case patient-chat degrades to the placeholder + fallbackGoto.
  const llm = patientConfig();
  // Ephemeral chat state (NOT persisted): { msgs, turns, phase, feedback, busy, input, error }
  let chat = $state(null);
  let chatNodeId; // guards one-time init per patient-chat node

  let n = $derived(state && def ? byId[state.currentId] : null);
  let total = $derived(def ? E.countEndings(def) : 0);

  // --- Visual-novel patient portrait: the sprite's expression tracks the situation. ---
  const EMOTIONS = ['neutral', 'concerned', 'relieved', 'skeptical', 'surprised'];
  const emo = (e) => (EMOTIONS.includes(e) ? e : 'neutral');
  let hasSprite = $derived(!!(def && def.persona && def.persona.sprite));
  let emotion = $derived.by(() => {
    if (!n) return 'neutral';
    // during a live chat: anxious while talking, resolves on the outcome
    if (n.type === 'patient-chat' && chat) {
      if (chat.phase === 'feedback') return chat.feedback && chat.feedback.objectiveMet ? 'relieved' : 'concerned';
      return emo(chat.emotion);
    }
    // while an answer's feedback is showing, the patient reacts to that choice
    if (n.type === 'mcq' && state && state.pending) {
      const opt = n.options.find((o) => o.id === state.pending);
      if (opt) return emo(opt.reaction || (opt.correct ? 'relieved' : 'concerned'));
    }
    if (n.type === 'end') return n.outcome === 'success' ? 'relieved' : 'concerned';
    return emo(n.emotion);
  });
  let spriteUrl = $derived(hasSprite ? resolveAsset(`${def.persona.sprite}/${emotion}.svg`) : '');
  let spriteAlt = $derived(def && def.persona ? `${def.persona.name}, looking ${emotion}.` : '');

  onMount(async () => {
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error('Could not load case (' + res.status + ')');
      def = yaml.load(await res.text());
      byId = E.buildIndex(def);
      const saved = load(def.id);
      state = saved || E.createInitialState(def, []);
      if (!state.currentId) E.enter(state, def, byId, def.start);
      persist();
    } catch (e) {
      error = String((e && e.message) || e);
    }
  });

  // Move focus to the new node's heading for screen-reader context. Skip the
  // initial mount (adopt the node silently) so loading a chapter never yanks the
  // viewport down to the case; and use preventScroll on genuine transitions so
  // focus moves for assistive tech without hijacking the reader's scroll position.
  $effect(() => {
    const id = state && state.currentId;
    if (!id) return;
    if (lastId === undefined) { lastId = id; return; }
    if (id !== lastId) {
      lastId = id;
      tick().then(() => titleEl && titleEl.focus({ preventScroll: true }));
    }
  });

  function persist() { if (def && state) save(def.id, state); }
  // Answering keeps the SAME option buttons (they are disabled and restyled in place,
  // not destroyed and recreated), so focus is not thrown to the page chrome and the
  // viewport does not jump.
  function choose(id) { E.choose(state, byId, id); persist(); }
  function contMcq() { E.continueMcq(state, def, byId); persist(); }
  function contInfo() { E.continueInfo(state, def, byId); persist(); }
  function contChat() { E.continuePatientChat(state, def, byId); persist(); }
  function restart() { E.restart(state, def, byId); persist(); }
  function reset() { E.reset(state, def, byId); persist(); }

  // --- Live patient-chat (only when an LLM endpoint is configured) ---
  // Init/tear down the ephemeral chat as we enter/leave a patient-chat node.
  $effect(() => {
    const id = state && state.currentId;
    const node = id ? byId[id] : null;
    if (node && node.type === 'patient-chat' && llm) {
      if (chatNodeId !== id) { chatNodeId = id; startChat(node); }
    } else if (chatNodeId != null) {
      chatNodeId = null;
      chat = null;
    }
  });

  function startChat(node) {
    chat = { msgs: [], turns: 0, phase: 'chat', feedback: null, busy: false, input: '', error: null, emotion: 'concerned' };
    stickToBottom = true;
    if (node.opener) chat.msgs.push({ role: 'assistant', content: node.opener });
  }

  function chatKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chatSend(); }
  }

  async function chatSend() {
    if (!chat || chat.busy || chat.phase !== 'chat') return;
    const text = chat.input.trim();
    if (!text) return;
    const node = n;
    const limit = node.turnLimit || 8;
    chat.input = '';
    chat.error = null;
    chat.msgs.push({ role: 'user', content: text });
    stickToBottom = true; // sending is an explicit action: follow the conversation down
    chat.turns += 1;
    chat.busy = true;
    const messages = [
      { role: 'system', content: patientSystemPrompt(def.persona, node) },
      ...chat.msgs.map(({ role, content }) => ({ role, content })),
    ];
    let aiIdx = -1;
    try {
      const full = await callPatient(llm, messages, (partial) => {
        const parsed = parsePatientReply(partial);
        if (parsed.emotion) chat.emotion = parsed.emotion;
        if (aiIdx < 0) { aiIdx = chat.msgs.length; chat.msgs.push({ role: 'assistant', content: parsed.text }); }
        else chat.msgs[aiIdx].content = parsed.text;
      });
      if (aiIdx < 0) { // non-streaming fallback (endpoint didn't stream)
        const parsed = parsePatientReply(full);
        if (parsed.emotion) chat.emotion = parsed.emotion;
        chat.msgs.push({ role: 'assistant', content: parsed.text });
      }
    } catch (e) {
      chat.error = String((e && e.message) || e);
    } finally {
      chat.busy = false;
      if (chat.turns >= limit && chat.phase === 'chat') chatEnd();
    }
  }

  async function chatEnd() {
    if (!chat || chat.phase !== 'chat') return;
    chat.phase = 'evaluating';
    chat.busy = true;
    chat.error = null;
    try {
      chat.feedback = await callEvaluator(llm, evaluatorMessages(def, n, chat.msgs));
    } catch (e) {
      chat.error = String((e && e.message) || e);
      chat.feedback = null;
    } finally {
      chat.busy = false;
      chat.phase = 'feedback';
    }
  }

  function chatContinue() {
    const met = !!(chat && chat.feedback && chat.feedback.objectiveMet);
    E.finishPatientChat(state, def, byId, met);
    persist();
  }

  // Keep the chat log pinned to the newest message so the patient's reply is visible
  // as it streams in, unless the reader has scrolled up to re-read earlier turns.
  let chatlogEl = $state(null);
  let stickToBottom = true;
  function onChatScroll() {
    if (chatlogEl) stickToBottom = chatlogEl.scrollHeight - chatlogEl.scrollTop - chatlogEl.clientHeight < 48;
  }
  $effect(() => {
    // Read the reactive deps FIRST (before any guard) so this effect re-runs on every
    // new message, streamed token, and typing-indicator toggle — even on runs where the
    // log element is not yet bound.
    const len = chat ? chat.msgs.length : 0;
    const last = len ? chat.msgs[len - 1] : null;
    void (last && last.content);
    void (chat && chat.busy);
    if (chatlogEl && stickToBottom) {
      tick().then(() => { if (chatlogEl && stickToBottom) chatlogEl.scrollTop = chatlogEl.scrollHeight; });
    }
  });
</script>

{#if error}
  <div class="cp card"><p class="err">⚠ {error}</p></div>
{:else if !state || !n}
  <div class="cp card"><p>Loading case…</p></div>
{:else}
  <div class="cp">
    <div class="topbar">
      <strong class="brand">{def.label || 'Case'}</strong>
      <span class="endings">
        Endings discovered: <span class="tick">{state.completedEndings.length}</span> of {total}{#if state.completedEndings.length} — {state.completedEndings.map((e) => e.title).join(', ')}{:else} (explore different choices){/if}
      </span>
    </div>

    <div class="card">
      <div class="cast" class:withportrait={hasSprite}>
        {#if hasSprite}
          <figure class="portrait">
            <img class="sprite" src={spriteUrl} alt={spriteAlt} width="140" height="140" />
            <figcaption>
              <b>{def.persona.name}</b>
              <span class="who">{def.persona.age} · {def.persona.occupation}</span>
              <span class="mood" aria-hidden="true">{emotion}</span>
            </figcaption>
          </figure>
        {/if}
        <div class="content">
      {#if def.persona}<p class="persona">{#if !hasSprite}<b>{def.persona.name}</b>{#if def.persona.age}, {def.persona.age}{/if}{#if def.persona.occupation}, {def.persona.occupation}{/if}{' — '}{/if}{def.persona.presentation}</p>{/if}

      {#if n.type === 'info'}
        <h3 class="nt" tabindex="-1" bind:this={titleEl}>{n.title || 'Information'}</h3>
        <div class="prose">{@html md(n.body)}</div>
        <div class="actions"><button type="button" class="btn" onclick={contInfo}>Continue →</button></div>

      {:else if n.type === 'mcq'}
        <h3 class="nt stem" tabindex="-1" bind:this={titleEl}>{@html mdInline(n.stem)}</h3>
        <div class="opts" role="group" aria-label="Answer options">
          {#each optionOrder(n.options.length, def.id + ':' + n.id, n.ordered).map((i) => n.options[i]) as o}
            <button type="button" onclick={() => choose(o.id)} disabled={!!state.pending}
              class="opt {state.pending ? (o.id === state.pending ? 'chosen ' + (o.correct ? 'correct' : 'incorrect') : (o.correct ? 'correct' : '')) : ''}">
              {@html mdInline(o.text)}{#if state.pending && (o.id === state.pending || o.correct)}<span class="tag">{o.correct ? 'Correct' : 'Reconsider'}</span>{/if}
            </button>
          {/each}
        </div>
        {#if state.pending}
          {@const opt = n.options.find((o) => o.id === state.pending)}
          <div class="feedback" role="status"><h4>Feedback</h4><div class="prose">{@html md(opt.feedback || '')}</div></div>
          <div class="actions"><button type="button" class="btn" onclick={contMcq}>Continue →</button></div>
        {/if}

      {:else if n.type === 'patient-chat'}
        {#if !llm}
          <h3 class="nt" tabindex="-1" bind:this={titleEl}>Optional: talk to the patient</h3>
          <div class="note">
            <strong>AI patient roleplay</strong> — here you would converse with a guardrailed AI
            playing {def.persona.name}. Objective: <em>{n.objective}</em>.
            <br>Not enabled in this build, so the case continues seamlessly (graceful <code>fallbackGoto</code>).
          </div>
          <div class="actions"><button type="button" class="btn" onclick={contChat}>Continue →</button></div>
        {:else if chat}
          <h3 class="nt" tabindex="-1" bind:this={titleEl}>Talk with {def.persona.name}</h3>
          <p class="chat-obj"><strong>Your goal:</strong> {n.objective}
            <span class="framing">· simulated patient, not medical advice</span></p>

          <div class="chatlog" role="log" aria-live="polite" aria-label="Conversation with the patient" bind:this={chatlogEl} onscroll={onChatScroll}>
            {#each chat.msgs as m}
              <div class="cmsg {m.role === 'assistant' ? 'from-patient' : 'from-student'}">
                <span class="cwho">{m.role === 'assistant' ? def.persona.name : 'You'}</span>
                <span class="ctext">{m.content}</span>
              </div>
            {/each}
            {#if chat.busy && chat.phase === 'chat' && chat.msgs[chat.msgs.length - 1]?.role === 'user'}<div class="cmsg from-patient typing" aria-hidden="true">…</div>{/if}
            {#if chat.error}<div class="cmsg cerr">⚠ {chat.error}</div>{/if}
          </div>

          {#if chat.phase === 'chat'}
            <div class="chatinput">
              <textarea rows="2" bind:value={chat.input} disabled={chat.busy}
                onkeydown={chatKey} aria-label="Your message to {def.persona.name}"
                placeholder="What do you say to {def.persona.name}?"></textarea>
              <button type="button" class="btn" onclick={chatSend} disabled={chat.busy || !chat.input.trim()}>Send</button>
            </div>
            <div class="chatmeta">
              <span class="turns">Turn {chat.turns} / {n.turnLimit || 8}</span>
              <button type="button" class="btn secondary" onclick={chatEnd}
                disabled={chat.busy || chat.msgs.length < 2}>End conversation →</button>
            </div>
          {:else if chat.phase === 'evaluating'}
            <div class="note" role="status">Reviewing your conversation…</div>
          {:else if chat.phase === 'feedback'}
            <div class="debrief chat-feedback">
              {#if chat.feedback}
                <span class="outcome {chat.feedback.objectiveMet ? 'success' : 'partial'}">
                  {chat.feedback.objectiveMet ? 'Objective met' : 'Objective not fully met'}</span>
                {#if chat.feedback.wentWell && chat.feedback.wentWell.length}
                  <h4>What went well</h4>
                  <ul class="keypoints">{#each chat.feedback.wentWell as x}<li>{x}</li>{/each}</ul>
                {/if}
                {#if chat.feedback.toImprove && chat.feedback.toImprove.length}
                  <h4>To improve</h4>
                  <ul class="keypoints">{#each chat.feedback.toImprove as x}<li>{x}</li>{/each}</ul>
                {/if}
                {#if chat.feedback.overall}<p class="overall">{chat.feedback.overall}</p>{/if}
              {:else}
                <p class="muted">The conversation is complete (structured feedback was unavailable).</p>
              {/if}
            </div>
            <div class="actions"><button type="button" class="btn" onclick={chatContinue}>Continue →</button></div>
          {/if}
        {/if}

      {:else if n.type === 'end'}
        <span class="outcome {n.outcome}">Outcome: {n.outcome}</span>
        <h3 class="nt" tabindex="-1" bind:this={titleEl}>{n.title}</h3>
        <div class="prose">{@html md(n.body)}</div>
        {#if n.debrief}
          <div class="debrief">
            {#if n.debrief.objectivesMet && n.debrief.objectivesMet.length}
              <h4>Objectives met</h4>
              <ul class="keypoints">{#each n.debrief.objectivesMet as i}{#if def.objectives[i - 1]}<li>{def.objectives[i - 1]}</li>{/if}{/each}</ul>
            {/if}
            {#if n.debrief.keyPoints && n.debrief.keyPoints.length}
              <h4>Key points</h4>
              <ul class="keypoints">{#each n.debrief.keyPoints as k}<li>{k}</li>{/each}</ul>
            {/if}
          </div>
        {/if}
        <div class="actions"><button type="button" class="btn" onclick={restart}>↻ Play again</button></div>
      {/if}
        </div>
      </div>
    </div>

    <div class="actions">
      <button type="button" class="btn secondary" onclick={restart}>↻ Restart case</button>
      <button type="button" class="btn secondary" onclick={reset}>Reset progress</button>
    </div>

    <details class="debug">
      <summary>Author view (debug) — variables &amp; path</summary>
      <div class="dbg">Variables: <code>{JSON.stringify(state.vars)}</code><br><span class="path">Path: {state.path.join(' → ')}</span></div>
    </details>
  </div>
{/if}

<style>
  .cp {
    --bg:#f6f7f9; --surface:#fff; --ink:#1a2027; --muted:#5b6670; --line:#d8dee5;
    --brand:#0b6b5b; --brand-ink:#08503f;
    --good-bg:#e7f5ee; --good-line:#1f9d6b; --good-ink:#0d5e3f;
    --warn-bg:#fdf1e3; --warn-line:#d08a2c; --warn-ink:#8a5410; --focus:#1664c0;
    color:var(--ink);
    font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    margin:1.2rem 0;
  }
  .cp .card { background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:18px 20px; }
  .cp .topbar { display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:space-between; margin-bottom:10px; }
  .cp .brand { color:var(--brand-ink); }
  .cp .endings { font-size:.82rem; color:var(--muted); }
  .cp .tick { color:var(--good-ink); font-weight:600; }
  .cp h3.nt { font-size:1.08rem; margin:0 0 .5em; }
  .cp .stem { font-weight:600; }
  .cp .persona { color:var(--muted); font-size:.9rem; margin:0 0 14px; }
  .cp .persona b { color:var(--ink); }
  .cp .cast.withportrait { display:flex; gap:16px; align-items:flex-start; }
  .cp .portrait { flex:0 0 140px; margin:0; text-align:center; }
  .cp .portrait .sprite { width:140px; height:140px; border-radius:12px; border:1px solid var(--line); background:#eef5f2; display:block; transition:opacity .2s ease; }
  .cp .portrait figcaption { margin-top:7px; line-height:1.35; }
  .cp .portrait figcaption b { font-size:.92rem; color:var(--ink); display:block; }
  .cp .portrait .who { font-size:.76rem; color:var(--muted); display:block; }
  .cp .portrait .mood { margin-top:3px; font-size:.74rem; font-weight:600; color:var(--brand-ink); text-transform:capitalize; display:inline-block; padding:1px 9px; border-radius:99px; background:#eef5f2; border:1px solid var(--line); }
  .cp .content { flex:1 1 auto; min-width:0; }
  @media (max-width:520px) { .cp .cast.withportrait { flex-direction:column; align-items:center; } .cp .content { width:100%; } }
  .cp .prose :global(p) { margin:.5em 0; }
  .cp button { font:inherit; cursor:pointer; }
  .cp .btn { background:var(--brand); color:#fff; border:1px solid var(--brand-ink); border-radius:8px; padding:11px 16px; min-height:44px; font-weight:600; }
  .cp .btn:hover { background:var(--brand-ink); }
  .cp .btn.secondary { background:transparent; color:var(--brand-ink); border-color:var(--line); }
  .cp .btn.secondary:hover { background:#eef2f1; }
  .cp .opts { display:flex; flex-direction:column; gap:10px; margin:14px 0 4px; }
  .cp .opt { display:block; width:100%; text-align:left; background:#fff; color:var(--ink); border:1px solid var(--line); border-radius:10px; padding:13px 15px; min-height:44px; }
  .cp .opt:hover:not(:disabled) { border-color:var(--brand); background:#f3f8f7; }
  .cp .opt.chosen { border-width:2px; padding:12px 14px; }
  .cp .opt.chosen.correct, .cp .opt.correct { border-color:var(--good-line); background:var(--good-bg); }
  .cp .opt.chosen.incorrect { border-color:var(--warn-line); background:var(--warn-bg); }
  .cp .opt .tag { display:inline-block; font-size:.72rem; font-weight:700; letter-spacing:.03em; text-transform:uppercase; margin-left:8px; padding:1px 7px; border-radius:99px; color:#fff; background:var(--good-line); }
  .cp .opt.incorrect .tag { background:var(--warn-line); }
  .cp .feedback { margin:14px 0; padding:12px 15px; border-radius:10px; border:1px solid var(--line); background:#f7f9fb; }
  .cp .feedback h4 { margin:0 0 4px; font-size:.78rem; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); }
  .cp .note { font-size:.9rem; color:var(--muted); background:#f1f4f7; border:1px dashed var(--line); border-radius:10px; padding:12px 14px; margin:12px 0; }
  .cp .actions { margin-top:16px; display:flex; gap:10px; flex-wrap:wrap; }
  .cp .outcome { display:inline-block; font-size:.78rem; font-weight:700; text-transform:uppercase; letter-spacing:.04em; padding:3px 10px; border-radius:99px; margin-bottom:8px; }
  .cp .outcome.success { background:var(--good-bg); color:var(--good-ink); border:1px solid var(--good-line); }
  .cp .outcome.partial { background:var(--warn-bg); color:var(--warn-ink); border:1px solid var(--warn-line); }
  .cp .outcome.poor { background:#fde8e8; color:#9b1c1c; border:1px solid #e06666; }
  .cp .debrief h4 { font-size:.92rem; margin:14px 0 4px; }
  .cp ul.keypoints { margin:.3em 0 0; padding-left:1.2em; }
  .cp ul.keypoints li { margin:.22em 0; }
  .cp .debug { margin-top:18px; font-size:.84rem; color:var(--muted); }
  .cp .debug summary { cursor:pointer; }
  .cp .debug code, .cp .note code, .cp .feedback :global(code) { background:#eef2f5; padding:1px 5px; border-radius:5px; }
  .cp .path { font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:.8rem; word-break:break-word; }
  .cp :focus-visible { outline:3px solid var(--focus); outline-offset:2px; border-radius:6px; }
  .cp .err { color:#9b1c1c; }

  /* --- live patient chat --- */
  .cp .chat-obj { font-size:.9rem; color:var(--muted); margin:0 0 10px; }
  .cp .chat-obj .framing { font-style:italic; }
  .cp .chatlog { display:flex; flex-direction:column; gap:8px; max-height:340px; overflow-y:auto; padding:6px 2px; margin-bottom:10px; }
  .cp .cmsg { max-width:85%; padding:9px 12px; border-radius:12px; }
  .cp .cmsg .cwho { display:block; font-size:.7rem; color:var(--muted); margin-bottom:2px; }
  .cp .cmsg .ctext { white-space:pre-wrap; }
  .cp .cmsg.from-patient { align-self:flex-start; background:#eef5f2; border:1px solid var(--line); }
  .cp .cmsg.from-student { align-self:flex-end; background:var(--brand); color:#fff; border:1px solid var(--brand-ink); }
  .cp .cmsg.from-student .cwho { color:#dbeee8; }
  .cp .cmsg.typing { color:var(--muted); letter-spacing:2px; }
  .cp .cmsg.cerr { align-self:center; background:var(--warn-bg); color:var(--warn-ink); border:1px solid var(--warn-line); font-size:.85rem; }
  .cp .chatinput { display:flex; gap:8px; align-items:flex-end; }
  .cp .chatinput textarea { flex:1; resize:vertical; min-height:44px; font:inherit; padding:9px 11px; border:1px solid var(--line); border-radius:10px; color:var(--ink); background:#fff; }
  .cp .chatmeta { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:10px; }
  .cp .chatmeta .turns { font-size:.82rem; color:var(--muted); }
  .cp .chat-feedback { margin-top:6px; }
  .cp .chat-feedback .overall { margin-top:10px; font-style:italic; }
  .cp .muted { color:var(--muted); }
  @media (prefers-reduced-motion: reduce) { .cp * { transition:none !important; } }
</style>
