# Microbes in Medicine

An interactive web e-textbook (**Quarto + Svelte 5**) on **general microbiology** for medical
students in the foundation block. It uses the same framework as *Health in Medicine*
(`../book-health`): Markdown chapters plus interactive "islands" driven by YAML data.

**Teaching approach:** the book asks the same six questions of every kind of microbe instead of
presenting a catalogue of organisms. The evidence behind this is in
[reports/Microbiology teaching for novice medics.md](reports/Microbiology%20teaching%20for%20novice%20medics.md)
(notes in `research_notes/`), summarised in the shareable doc
[Teaching foundation microbiology without a bug parade](https://claude.ai/code/artifact/ac5d12dc-9872-4a3b-8792-13f553836cd6).

Writing conventions and the copy-audit checklist are in [STYLE.md](STYLE.md).

## Status: pilot
- Two parts: **Principles** (`book/chapters/principles/`) and **Meeting the microbes**
  (`book/chapters/microbes/`), one chapter per organism group, mirroring the MD1140 sessions.
- **Part I (Principles) is complete:** all six chapters written, each with a quiz, a flashcard deck
  and interactive work. Part II has *A map of the bacteria* and *Gram-positive cocci* (the depth test
  case); the remaining group chapters are template-based outlines.
- `book/glossary.qmd` (appendix) defines every term the chapters introduce.
- `book/teaching-notes.qmd` (appendix) maps the current MD1140 bacteriology sessions onto this
  approach, for discussion with teaching staff.
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
| `sorting-key` | `SortingKey.svelte` | `diagrams/` | Branching identification key where each branch explains what the trait means; whole-key view |
| `rank-order` | `RankOrder.svelte` | `diagrams/` | Predict-then-reveal ordering; optional log-scale ruler with bands |
| `sorter` | `Sorter.svelte` | `diagrams/` | Interleaved category practice with per-item feedback and a per-category summary |
| `selection-sim` | `SelectionSim.svelte` | `diagrams/` | Resistance selection on a plate, gated behind a prediction; tracked on a line chart |
| `damage-response` | `DamageResponse.svelte` | `diagrams/` | Damage-response curves with a slider and a zone readout |
| `epidemic-sim` | `EpidemicSim.svelte` | `diagrams/` | SIR model with R0 and vaccination sliders, crosshair readout and table view |
| `mic-reader` | `MicReader.svelte` | `diagrams/` | Broth-dilution series: pick the MIC, then classify against breakpoints |
| `bacteria-map` | `BacteriaMap.svelte` | `diagrams/` | Bacterial groups as trait combinations: explore and sort by trait, or name the group from its traits (`extends` + `mode: identify`) |

## Develop
Toolchain as for book-health (portable Node and Quarto under `%LOCALAPPDATA%`).

```sh
npm --prefix components run build      # Svelte -> book/assets/components.js|css
node scripts/copy-audit.mjs         # house-style and AI-tell check (see STYLE.md)
node scripts/validate-cases.mjs        # lint case graphs
node scripts/render.mjs                # render out-of-tree to %TEMP%\book-microbio-preview
node scripts/check-assets.mjs "%TEMP%\book-microbio-preview\_book"
```

Preview with the `book-preview` launch config (port 8791). Rendering out-of-tree avoids the
Dropbox file-lock errors described in book-health's HANDOVER.

`components/node_modules` was copied from book-health, so no `npm install` is needed locally.
The GitHub Pages workflow (`.github/workflows/publish.yml`) is ready but this folder is not yet a
git repository.
