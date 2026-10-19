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
- Parts by kind of microbe after a shared foundation: **Foundations** (`book/chapters/foundations/`),
  then **The bacterial world**, **The viral world**, **The fungal world** and **The parasitic world**
  (`bacteria/`, `viruses/`, `fungi/`, `parasites/`), and **Across the worlds** (`across/`). Each
  world opens with a part page (`index.qmd`) mapping its chapters and answering the six questions.
- **Written in full:** the four foundation chapters; in the bacterial world, structure and energy,
  genetics, detection, *A map of the bacteria* and *Gram-positive cocci* (the depth test case); in
  the viral world, the four opening chapters and *Herpesviruses* (the first viral group chapter).
  *How bacteria cause damage* is partly written. Every other chapter is a planned outline.
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
| `body-map` | `BodyMap.svelte` | `diagrams/` | An organism's route through a schematic of the body systems (after the Year 1 systems-integration diagram). Step kinds: `lives`, `enters`, `multiplies`, `spreads`, `latent`, `reactivates`, `damages`, `defence`; `via` (`blood`, `lymph`, `nerve`, `air`, `direct`, `swallowed`) highlights the network; `arrow: false` drops the arrow where the network shows the path. Steps can ask for a prediction first (`ask`, `options`, `answer`, `why`); several routes per organism as tabs. Sites: `outside`, `ear-sinus`, `skin`, `genital`, `fetus`, `eye`, `nose-throat`, `airway`, `alveoli`, `heart`, `blood`, `liver`, `gut`, `urinary`, `brain`, `nerves`, `lymph`, `spleen`, `tissue`, `bone` |

Answer options in quizzes, cases, profile and body-map predictions and the simulations are shown in
a shuffled order seeded by the item's id, so the same question looks the same on every visit and the
correct option is not always first. Authors can write options in any order. `ordered: true` on an
item keeps the authored order, for options that form a scale (concentrations, percentages).

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
The GitHub Pages workflow (`.github/workflows/publish.yml`) renders the book and publishes it on
every push to `main`.
