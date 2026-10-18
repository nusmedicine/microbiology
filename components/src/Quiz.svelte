<script>
  import { onMount } from 'svelte';
  import yaml from 'js-yaml';
  import { md, mdInline } from './lib/md.js';
  import { load, save } from './lib/store.js';

  let { src } = $props();

  let quiz = $state(null);
  let error = $state(null);
  let answers = $state({}); // { [questionId]: chosenOptionIndex }

  onMount(async () => {
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error('Could not load quiz (' + res.status + ')');
      quiz = yaml.load(await res.text());
      const saved = load('quiz:' + quiz.id);
      if (saved && saved.answers) answers = saved.answers;
    } catch (e) {
      error = String((e && e.message) || e);
    }
  });

  function persist() { if (quiz) save('quiz:' + quiz.id, { answers: $state.snapshot(answers) }); }
  function pick(qid, idx) { if (answers[qid] != null) return; answers[qid] = idx; persist(); }
  function reset() { answers = {}; persist(); }

  let answered = $derived(quiz ? Object.keys(answers).length : 0);
  let correct = $derived(
    quiz ? quiz.questions.reduce((acc, q) => {
      const a = answers[q.id];
      return acc + (a != null && q.options[a] && q.options[a].correct ? 1 : 0);
    }, 0) : 0
  );
</script>

{#if error}
  <div class="quiz card"><p class="err">⚠ {error}</p></div>
{:else if !quiz}
  <div class="quiz card"><p>Loading quiz…</p></div>
{:else}
  <div class="quiz card">
    <div class="qtop">
      <strong>{quiz.title}</strong>
      <span class="score" aria-live="polite">Answered {answered}/{quiz.questions.length}{#if answered} · {correct} correct{/if}</span>
    </div>

    {#each quiz.questions as q, qi}
      <div class="q">
        <p class="stem">{qi + 1}. {@html mdInline(q.stem)}</p>
        <div class="opts" role="group" aria-label={'Question ' + (qi + 1) + ' options'}>
          {#each q.options as o, oi}
            {@const answered = answers[q.id] != null}
            {@const chosen = answers[q.id] === oi}
            <button type="button" onclick={() => pick(q.id, oi)} disabled={answered}
              class="opt {answered ? (chosen ? 'chosen ' + (o.correct ? 'correct' : 'incorrect') : (o.correct ? 'correct' : '')) : ''}">
              {@html mdInline(o.text)}{#if answered && (chosen || o.correct)}<span class="tag">{o.correct ? 'Correct' : 'Reconsider'}</span>{/if}
            </button>
          {/each}
        </div>
        {#if answers[q.id] != null}
          {@const opt = q.options[answers[q.id]]}
          {#if opt.feedback}<div class="feedback" role="status">{@html md(opt.feedback)}</div>{/if}
        {/if}
      </div>
    {/each}

    <div class="actions"><button type="button" class="btn secondary" onclick={reset}>Reset quiz</button></div>
  </div>
{/if}

<style>
  .quiz {
    --surface:#fff; --ink:#1a2027; --muted:#5b6670; --line:#d8dee5;
    --brand-ink:#08503f; --good-bg:#e7f5ee; --good-line:#1f9d6b; --good-ink:#0d5e3f;
    --warn-bg:#fdf1e3; --warn-line:#d08a2c; --focus:#1664c0;
    color:var(--ink);
    font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    margin:1.2rem 0;
  }
  .quiz.card { background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:16px 20px; }
  .quiz .qtop { display:flex; flex-wrap:wrap; gap:8px; align-items:baseline; justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:10px; margin-bottom:6px; }
  .quiz .score { font-size:.82rem; color:var(--muted); }
  .quiz .q { padding:14px 0; border-bottom:1px solid #eef1f4; }
  .quiz .q:last-of-type { border-bottom:0; }
  .quiz .stem { font-weight:600; margin:0 0 10px; }
  .quiz button { font:inherit; cursor:pointer; }
  .quiz .opts { display:flex; flex-direction:column; gap:8px; }
  .quiz .opt { display:block; width:100%; text-align:left; background:#fff; color:var(--ink); border:1px solid var(--line); border-radius:9px; padding:11px 14px; min-height:44px; }
  .quiz .opt:hover:not(:disabled) { border-color:var(--good-line); background:#f3f8f7; }
  .quiz .opt.chosen { border-width:2px; padding:10px 13px; }
  .quiz .opt.correct, .quiz .opt.chosen.correct { border-color:var(--good-line); background:var(--good-bg); }
  .quiz .opt.chosen.incorrect { border-color:var(--warn-line); background:var(--warn-bg); }
  .quiz .opt .tag { display:inline-block; font-size:.7rem; font-weight:700; letter-spacing:.03em; text-transform:uppercase; margin-left:8px; padding:1px 7px; border-radius:99px; color:#fff; background:var(--good-line); }
  .quiz .opt.incorrect .tag { background:var(--warn-line); }
  .quiz .feedback { margin:10px 0 2px; padding:10px 13px; border-radius:9px; border:1px solid var(--line); background:#f7f9fb; font-size:.94rem; }
  .quiz .feedback :global(p) { margin:.2em 0; }
  .quiz .actions { margin-top:14px; }
  .quiz .btn.secondary { background:transparent; color:var(--brand-ink); border:1px solid var(--line); border-radius:8px; padding:9px 14px; min-height:40px; font-weight:600; }
  .quiz .btn.secondary:hover { background:#eef2f1; }
  .quiz :focus-visible { outline:3px solid var(--focus); outline-offset:2px; border-radius:6px; }
  .quiz .err { color:#9b1c1c; }
</style>
