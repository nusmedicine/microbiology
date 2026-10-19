# House style and copy audit

How *Microbes in Medicine* is written, and how to check a draft before it goes to reviewers.
Run the automatic part with:

```sh
node scripts/copy-audit.mjs            # all chapters and island data
node scripts/copy-audit.mjs book/chapters/foundations/host-microbe.qmd
```

The checker flags patterns; it does not decide. A flag is a prompt to reread the sentence, and
some flags will be fine where they stand.

## 1. Voice and level

- Write for a medical student who has finished cell biology and tissues and is starting general
  pathology. Assume that knowledge; build on it explicitly ("as in general pathology", "we met this
  principle in general pathology").
- **Academic voice.** State facts in the third person. Use the first-person plural *we* for the
  shared line of reasoning, as in Alberts' *Molecular Biology of the Cell* or a review article: "we
  can predict…", "we return to these organisms in…". Use *we* sparingly, where it carries reasoning,
  and not to open every paragraph.
- Do not address the reader as *you* in chapter prose. Instructions in the interactive parts
  (quizzes, sorters, cases, "Predict" callouts, the sentence telling the reader how to use an island)
  may use the imperative or *you*, because they are instructions.
- The book, a part, a chapter or a section is never the subject of an action verb: not "This book
  asks…", "*Gram-positive cocci* returns to…" or "The next chapter takes up…". Write "We ask the same
  six questions…", or give the reference in parentheses after the fact it supports: "(see
  [*Gram-positive cocci*](…))". Parentheses are preferred: a sentence whose only job is to point
  elsewhere is metacommentary (§3).
- Plain, direct sentences. Prefer *is*, *has*, *does* over *serves as*, *stands as*, *functions as*,
  *represents*, *boasts*, *features*.
- One idea per sentence where possible. Vary sentence length; do not stack short dramatic sentences.
- State a fact and its consequence. Do not tell the reader that something is important; show what it
  explains.
- No promotional or emotional colour: no *fascinating*, *remarkable*, *vibrant*, *rich*,
  *groundbreaking*, *profound*.
- Do not address the reader with false enthusiasm or reassurance ("Don't worry", "Great question").

## 2. Medical and scientific terminology

- **Use the correct medical or microbiological term** where clinicians and scientists would use it:
  *haemolysis* not "bursting red cells", *necrotic* not "dead", *ischaemic* not "without blood supply",
  *pyogenic* not "pus-forming", *hypotension* not "low blood pressure", *neonate* not "newborn",
  *asplenia* not "no spleen", *otitis media* not "middle ear infection", *infective endocarditis* not
  "heart valve infection", *cellulitis* not "spreading skin infection".
- **Define every term the first time it appears in a chapter** unless it was taught in cell biology,
  tissues or general pathology. Pattern: the term in bold, then the definition in plain words, e.g.
  "**Pyogenic** (pus-forming) bacteria…" or "…an **abscess**, a walled-off collection of pus."
- Later uses in the same chapter are plain text (no bold).
- In a definition table (a column of terms with their meanings), the terms are not bolded: the table
  itself marks them.
- Every defined term also goes in the glossary (`book/glossary.qmd`), alphabetically, with the same
  definition. If a definition changes, change it in both places.
- **Never cycle synonyms for a technical term** to avoid repetition ("organism", "microbe", "bug",
  "germ" for the same thing in one paragraph). Pick the term and keep it. Never use "bug" or "germ"
  except when quoting a misconception.
- Spelling: British (colour, haemolysis, faecal, oesophagus, paediatric, sterilisation).
- Organism names: genus and species in italics, genus capitalised (*Staphylococcus aureus*). After the
  first use in a chapter, abbreviate the genus (*S. aureus*) unless two genera share an initial nearby.
  Informal group names are roman and lower case (staphylococci, streptococci, enterococci).
- Units: SI with a space (37 °C, 2 µm, 121 °C). Numbers: digits for measurements and statistics.

### Examples

Students in this course tend to memorise every named disease in case it is examined, and detail
they cannot yet place pulls attention from the principle (the seductive-details effect). Examples
therefore follow four rules.

- **Anchor organisms.** The foundation chapters and the opening chapters of each world draw their
  examples from one small cast, reused in every chapter so
  that each new principle attaches to an organism already met: *Staphylococcus aureus*,
  *Streptococcus pyogenes*, *Escherichia coli*, *Bacteroides fragilis*, *Mycobacterium
  tuberculosis*, *Burkholderia pseudomallei*, influenza virus, HIV, *Candida albicans*, *Plasmodium
  falciparum* and *Ascaris lumbricoides*. An organism outside the cast needs a reason: a local study,
  a historical discovery, the organism of a practice case, or the only common organism that shows a
  trait (*Mycoplasma*, which has no wall).
- **One example per idea**, plus at most one contrasting example when the idea is a distinction.
- **One sentence of clinical detail**: only the fact that shows the principle. No symptoms, tests or
  treatment.
- **Marked as an example.** Put it in an example box (`::: {.example}`), so the principle and its
  illustration are visibly different.

## 3. Copy-audit checklist

Based on the Wikipedia guide *Signs of AI writing* (WikiProject AI Cleanup) and Pangram's corpus
comparison of AI and human text. These patterns are not proof of anything; they make prose generic
and are cheap to fix. The underlying fix is always the same: say the specific thing.

### Vocabulary to avoid or justify

*delve, crucial, pivotal, vital, key* (as an adjective of importance), *tapestry, testament, underscore,
highlight* (as a verb of importance), *intricate, intricacies, meticulous, showcase, landscape*
(figurative), *realm, interplay, robust, enduring, foster, garner, bolster, enhance, leverage,
navigate* (figurative), *journey, unlock, harness, seamless, holistic, multifaceted, paramount,
nuanced, invaluable, game-changer, cutting-edge, ever-evolving, dynamic*.

Sentence openers to avoid: *Additionally, Furthermore, Moreover, Notably, Importantly, Crucially,
Interestingly, Ultimately, Overall, In summary, In conclusion, It is important to note, It is worth
noting*.

### Constructions to avoid or limit

| Pattern | Example | Fix |
|---|---|---|
| Negative parallelism | "It is not X, it is Y"; "not just X but also Y"; "not a catalogue, but…" | State Y directly. Keep a contrast only when the misconception X is real and named |
| Significance padding | "plays a key role in", "serves as a reminder", "highlighting the importance of" | Say what it does |
| Trailing -ing analysis | "…, highlighting how bacteria adapt." | Make it a sentence with a subject, or delete |
| Reflexive triads | three adjectives or three short clauses, every time | Use the number of items the content has |
| Vague attribution | "experts agree", "studies show", "it is widely believed" | Name the source and cite it |
| Section summaries | a closing paragraph that restates the section | Delete, or replace with the next question |
| Rhetorical scaffolding | "So what does this mean?", "Here's the thing", "This is where X comes in" | Delete; start with the content |
| Metacommentary | "Inoculum and immunity need detail now."; "Two of the traits need defining first."; "The table answers the six questions."; "We start with three people."; "…are enough at this stage"; "We turn next to…" | Delete, or replace with a sentence about the subject. Structure is shown by headings and overview diagrams, not narrated |
| Hedging filler | "may potentially", "can often sometimes" | One hedge, where the evidence needs it |
| False ranges | "from bacteria to parasites" when no scale is meant | List the items, or say "several groups" |

### Formatting

- **Bold** only for a term at its defining use, and sparingly for one warning per callout. Do not bold
  phrases for emphasis.
- No inline-header lists (each bullet starting with a bold label and a colon) unless the items are
  genuinely labelled fields. Prefer a table or prose.
- **Lists for parallel points.** When a paragraph sets out three or more parallel points (causes,
  steps, examples, consequences, properties), give them as a bulleted list introduced by a full
  sentence, or a numbered list when the order matters. Each item is a complete sentence or a phrase
  parallel to the others. Keep reasoning that links one point to the next in prose: a chain of
  "because… so…" is a paragraph, not a list.
- Headings in sentence case. No emoji. No decorative arrows or box characters in prose.
- Em dashes: at most one or two per chapter, and never as a substitute for a comma, colon or full stop.
  Use a comma, colon, parentheses or a new sentence first.
- Straight quotes in source files (`"` and `'`).

### Island data (quizzes, cases, flashcards, cards)

- Feedback starts with the explanation, not with "Right." or "Correct!". The component already shows
  whether the answer was correct.
- Wrong-answer feedback names the misconception and gives the mechanism, without scolding.
- No two consecutive feedback strings with the same opening word.
- Summary and principle fields in diagram data are plain sentences: no bolded one-line takeaway.
- Flashcards carry no bold.

## 4. Organisation

- **Chapter opener.** One italic blockquote of one or two sentences that states the chapter's problem
  in concrete terms, as a statement. *We* is allowed; "This chapter…" is not.
- **Chapter ending.** The chapter ends with its last content section, without a summary or a
  sentence announcing the next chapter (the page footer links to it). Then, in this order: *Check
  your understanding* (quiz), *Review with flashcards*, *Practise: …* (case), *References*.
- **No metacommentary.** Sentences describe the subject, not the text, the reader's progress or the
  pace of the course. A sentence that introduces a table, list or island states its content ("Three
  routes move genes between bacteria:"), not its purpose ("The table answers…"). One short
  instruction before an island is allowed.
- **Reading order.** Foundation chapters must not assume anything first taught in a later part, and a
  world's opening chapters must not assume its group chapters. A forward mention is phrased as a
  forward reference and linked.
- **Cross-references** use the exact chapter title in italics as a link, with a section anchor where
  useful: `[*Microbes and their hosts*](host-microbe.qmd#sec-host-drf)`. The link sits in parentheses
  or in a sentence whose subject is *we* or the topic, never the chapter itself (§1). Chapters sit in part
  folders (`foundations/`, `bacteria/`, `viruses/`, `fungi/`, `parasites/`, `across/`); between
  folders the path is `../bacteria/…`. Island data cannot hold links, so it uses the italic title
  alone.
- **Section IDs** are prefixed by chapter (`sec-world-`, `sec-bact-`, `sec-gen-`, `sec-host-`,
  `sec-trans-`, `sec-det-`, `sec-dbac-`, `sec-bdam-`, `sec-map-`, `sec-gpc-`, `sec-vstr-`,
  `sec-vchg-`, `sec-vhost-`, `sec-vdet-`, `sec-herp-`, `sec-fun-`, `sec-fgrp-`, `sec-life-`,
  `sec-proto-`, `sec-helm-`), so links stay unique across the book.
- **Common beliefs.** A callout that addresses a widely held belief is headed with a neutral
  question ("Do bacteria have mitochondria?"), states the belief and where it comes from, then gives
  the evidence. Avoid "corrected", "myth", "wrong" and other words that judge the reader.
- **Learning objectives.** After the opener, a simple note callout headed *Learning objectives*
  lists four to six things a student should be able to do, as verb phrases ("Distinguish…",
  "Explain…"). They are the chapter's answer to "what do I need to know?".
- **Overview and hierarchy diagrams** (styles in `book/styles.css`):
  - A *chapter map* (`::: {.concept-tree}`) after the objectives: at most four branches, each
    linked to its section. Section headings follow the map.
  - A *tree* for a classification with real subdivisions (no more than three levels).
  - A *spectrum* (`::: {.spectrum}`) when the categories are ends of a continuous range, so the
    diagram does not teach a false either/or.
  - A *table* when categories are compared on the same attributes.
  - A *flow* (`::: {.flow}`) for a sequence of four to seven steps.
  - A *body map* (the `body-map` island) for an organism's route through the body: where it lives,
    enters, spreads and does damage. Each step names a structure from the Year 1 overview of body
    systems and says, in one or two sentences, what happens there; a structure the overview did not
    cover is explained in the step itself. In a group chapter it follows each main organism's
    "who, where, how" table.
- **One home per topic.** Each concept is taught fully in one chapter; other chapters give one
  sentence and a link. The six questions live in *The microbial world*; the microbiota in *Microbes
  and their hosts*; spores and hand rub in *Detecting and controlling microbes*.

## 5. Before review

1. `node scripts/copy-audit.mjs` and reread every flagged line.
2. Grep the chapter's defined terms against `book/glossary.qmd`.
3. Check every organism-specific number against its cited source.
4. After rendering, check that internal links and anchors resolve.
