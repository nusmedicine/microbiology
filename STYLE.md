# House style and copy audit

How *Microbes in Medicine* is written, and how to check a draft before it goes to reviewers.
Run the automatic part with:

```sh
node scripts/copy-audit.mjs            # all chapters and island data
node scripts/copy-audit.mjs book/chapters/principles/host-microbe.qmd
```

The checker flags patterns; it does not decide. A flag is a prompt to reread the sentence, and
some flags will be fine where they stand.

## 1. Voice and level

- Write for a medical student who has finished cell biology and tissues and is starting general
  pathology. Assume that knowledge; build on it explicitly ("you met this in general pathology").
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
| Hedging filler | "may potentially", "can often sometimes" | One hedge, where the evidence needs it |
| False ranges | "from bacteria to parasites" when no scale is meant | List the items, or say "several groups" |

### Formatting

- **Bold** only for a term at its defining use, and sparingly for one warning per callout. Do not bold
  phrases for emphasis.
- No inline-header lists (each bullet starting with a bold label and a colon) unless the items are
  genuinely labelled fields. Prefer a table or prose.
- Prefer prose to bullet lists for reasoning. Lists are for parallel items.
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

- **Chapter opener.** One italic blockquote of one or two sentences that states the chapter's question
  in concrete terms. Do not write "This chapter…" or "This chapter asks the Nth question…".
- **Chapter ending.** The last content section hands on to the next chapter or to Part II; it does
  not restate what the chapter covered. Then, in this order: *Check your understanding* (quiz),
  *Review with flashcards*, *Practise: …* (case), *References*.
- **Reading order.** Part I chapters must not assume anything first taught in Part II. When a Part I
  chapter mentions a Part II example, phrase it as a forward reference and link to it.
- **Cross-references** use the exact chapter title in italics as a link, with a section anchor where
  useful: `[*Microbes and their hosts*](host-microbe.qmd#sec-host-drf)`. From `principles/` to
  `microbes/` the path is `../microbes/…`. Island data cannot hold links, so it uses the italic title
  alone.
- **Section IDs** are prefixed by chapter (`sec-world-`, `sec-bact-`, `sec-gen-`, `sec-host-`,
  `sec-trans-`, `sec-det-`, `sec-map-`, `sec-gpc-`), so links stay unique across the book.
- **One home per topic.** Each concept is taught fully in one chapter; other chapters give one
  sentence and a link. The six questions live in *The microbial world*; the microbiota in *Microbes
  and their hosts*; spores and hand rub in *Detecting and controlling microbes*.

## 5. Before review

1. `node scripts/copy-audit.mjs` and reread every flagged line.
2. Grep the chapter's defined terms against `book/glossary.qmd`.
3. Check every organism-specific number against its cited source.
4. After rendering, check that internal links and anchors resolve.
