# Microbes in Medicine

An interactive web e-textbook (**Quarto + Svelte 5**) on **general microbiology** for medical
students in the foundation block. It uses the same framework as *Health in Medicine*
(`../book-health`): Markdown chapters plus interactive "islands" driven by YAML data.

**Teaching approach:** the book asks the same six questions of every kind of microbe instead of
presenting a catalogue of organisms. The evidence behind this is in
[reports/Microbiology teaching for novice medics.md](reports/Microbiology%20teaching%20for%20novice%20medics.md)
(notes in `research_notes/`), summarised in the shareable doc
[Teaching foundation microbiology without a bug parade](https://claude.ai/code/artifact/ac5d12dc-9872-4a3b-8792-13f553836cd6).

## Status: pilot
- Unit 2, **How bacteria are built and get energy** (`book/chapters/02-bacteria-build-energy.qmd`),
  is written in full. The other seven units are outline stubs.
- All content awaits review by teaching staff. The author line in `book/_quarto.yml` is a
  placeholder.

## Interactive islands
Embed with `<div data-island="<key>" data-src="/<folder>/<file>.yml"></div>`.

| Key | Component | Data folder | What it does |
|---|---|---|---|
| `quiz` | `Quiz.svelte` | `quizzes/` | MCQs with per-option feedback (from book-health) |
| `case` | `CasePlayer.svelte` | `cases/` | Branching MCQ case (from book-health; `label` sets the header, persona age optional) |
| `gram-stain` | `GramStain.svelte` | `diagrams/` | Steps through the Gram stain; the decolouriser step is gated behind a prediction; "what if" errors |
| `oxygen-tube` | `OxygenTube.svelte` | `diagrams/` | Unnamed organisms described by metabolism; predict where each grows in an oxygen gradient |
| `contrast-pair` | `ContrastPair.svelte` | `diagrams/` | Two similar organisms side by side: find the separating feature, then sort descriptions A or B |
| `microbe-profile` | `MicrobeProfile.svelte` | `diagrams/` | The five-slot organism card; each slot is worked or predict-first, so support can fade |
| `flashcards` | `Flashcards.svelte` | `decks/` | Spaced-repetition deck (Leitner boxes, local only) with Anki export |

## Develop
Toolchain as for book-health (portable Node and Quarto under `%LOCALAPPDATA%`).

```sh
npm --prefix components run build      # Svelte -> book/assets/components.js|css
node scripts/validate-cases.mjs        # lint case graphs
node scripts/render.mjs                # render out-of-tree to %TEMP%\book-microbio-preview
node scripts/check-assets.mjs "%TEMP%\book-microbio-preview\_book"
```

Preview with the `book-preview` launch config (port 8791). Rendering out-of-tree avoids the
Dropbox file-lock errors described in book-health's HANDOVER.

`components/node_modules` was copied from book-health, so no `npm install` is needed locally.
The GitHub Pages workflow (`.github/workflows/publish.yml`) is ready but this folder is not yet a
git repository.
