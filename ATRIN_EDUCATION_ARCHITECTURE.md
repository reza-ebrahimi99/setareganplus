# Atrin Education Architecture

> Foundation for a Persian Educational Intelligence Platform (client-side).  
> This document describes the **Education**, **Curriculum**, **Vision**, and **Evaluation** engines.  
> It does **not** change AI APIs, CRM, Bale, backend, auth, prompts, or conversation services.

---

## Vision

Atrin is not a chatbot shell. It is an **Education Operating System**:

1. Understand the learner’s question (normalize → detect → strategy).
2. Ground answers in **structured Iranian curriculum** (books → chapters → lessons → exercises).
3. Prepare for **vision/OCR** inputs (book pages, homework photos) without implementing OCR yet.
4. Continuously **evaluate** detection quality with local benchmarks and analytics.

---

## Engine Map

```
User input (text today · image tomorrow)
        │
        ▼
┌───────────────────┐
│ Education Engine  │  lib/atrin/education/
│ normalize → detect│
│ strategy → format │
└─────────┬─────────┘
          │
          ├──────────► Curriculum Engine   lib/atrin/curriculum/
          │            search · graph · catalog · import stubs
          │
          ├──────────► Vision Engine       lib/atrin/vision/
          │            OCR stubs · parsers · curriculum match
          │
          └──────────► Evaluation Engine   lib/atrin/evaluation/
                       benchmarks · runner · local analytics
```

UI layers consume engines; they never hardcode curriculum strings:

- `components/atrin/education/*`
- `components/atrin/curriculum/*`
- `components/atrin/evaluation/*`

---

## 1. Education Engine

**Path:** `lib/atrin/education/`

Pipeline:

```
Input
 → Normalizer (digits, operators, fractions, unicode; keeps original)
 → Subject Detection
 → Grade Detection
 → Difficulty Detection
 → Intent Detection
 → Question Type Detection
 → Teaching Strategy
 → Response Formatter (sections + actions + subject blocks)
 → Presentation (UI)  ·  AI transport remains existing chat stack
```

**Extension points**

| Point | How to extend |
|--------|----------------|
| New subject | Add rules in `detect-subject.ts` + strategy case |
| New strategy | `TeachingStrategyId` + `strategy.ts` + `format.ts` meta |
| New action | `EducationActionId` + labels/prompts in `format.ts` |
| Study memory | `study-profile.ts` (localStorage only) |

**Non-goals:** calling models, mutating CRM, changing prompts.

---

## 2. Curriculum Engine

**Path:** `lib/atrin/curriculum/`

Hierarchy:

```
Curriculum Engine
 → Books
 → Subjects / Grades
 → Chapters
 → Lessons
 → Pages
 → Exercises
 → Knowledge Graph
```

Every `CurriculumItem` carries: id, grade, subject, book, chapter, lesson, page range, keywords, objectives, related topics, prerequisites, difficulty, exam/gifted/konkur importance, study time, future resources.

**Search** (`search.ts`): page / exercise / lesson / chapter / topic.  
Low confidence → clarification prompt. **Never invent** catalog rows.

**Knowledge graph** (`graph.ts`): topic ↔ related / previous / next / exercises / videos / FAQ / exam / gifted / konkur.

**Import pipeline** (`import.ts`): adapters for `official_pdf | markdown | json | cms | database` — **architecture only**, status `not_implemented`.

**Registry:** `getCurriculumCatalog()` is the single content source for UI.

---

## 3. Vision Engine

**Path:** `lib/atrin/vision/`

Planned pipeline:

```
Vision
 → OCR
 → Page Detection
 → Formula Detection
 → Diagram Detection
 → Handwriting
 → Object Detection
 → Curriculum Matching
 → Education Engine
```

Today: `analyzeVision()` returns `not_implemented` with full result shape ready for adapters.

**Input kinds:** homework photo, book page, exam sheet, worksheet, notebook, handwriting, diagram, geometry, chart, chemical equation, graph.

**Parsers (structure recognition only — no solving)**

- Math: fractions, roots, matrices, functions, limits, derivatives, integrals, geometry, stats, probability, trigonometry  
- Chemistry: formulas (normalized), reactions, acids/bases, organic, periodic, moles, redox  
- Physics: motion, energy, force, pressure, electricity, magnetism, heat, optics, modern, units, constants  

`lib/atrin/education/vision.ts` remains a thin legacy stub; platform work targets `lib/atrin/vision/`.

---

## 4. Evaluation Engine

**Path:** `lib/atrin/evaluation/`

```
User Question
 → Education Engine
 → Evaluation (vs expected)
 → Quality Score
 → Improvement Suggestions
```

**Benchmarks:** `lib/atrin/evaluation/benchmarks/Grade1` … `Grade12` (+ `dataset.ts` aggregate).  
Subjects: Math, Science, Persian, English, Arabic, Chemistry, Physics, Biology, Programming, Gifted, Konkur.

Each item: question, expected subject/grade/intent/strategy/response structure (and optional normalization fragments).

**Runner:** `runEducationEvaluationSuite()` measures subject, grade, intent, question type, strategy, normalization accuracy + average confidence.

**CLI:** `npm run test:atrin-education`

**Analytics:** localStorage only (`EducationAnalyticsPanel`) — most asked subjects, weakest detection, common mistakes, grades, topics.

---

## Data Flow (production path)

1. Learner sends text through existing Atrin chat UI (`useAiChat` untouched).
2. `EducationPanel` runs `runEducationEngine` on the latest user query (client intelligence).
3. Optional: `searchCurriculum` / `CurriculumExplorer` grounds the topic.
4. Study profile + evaluation analytics update locally.
5. Future: Vision adapter fills `VisionAnalysisResult` → curriculum match → same Education pipeline.
6. Future: Import adapters replace seed catalog; RAG can index `CurriculumItem` + resources without UI rewrites.

---

## Student Profile

Extended local profile (`StudyProfile`):

- preferred grade / preferred subject  
- weak topics / strong topics  
- learning history  
- completed lessons / recent exercises  
- preferred explanation style  

Used only to improve presentation and future adaptive hints — never sent to backend in this architecture.

---

## Accessibility

Education/curriculum surfaces should keep:

- RTL (`dir="rtl"`)
- Keyboard-focusable actions
- `aria-label` on panels
- Respect reduced motion / high contrast via existing `styles/atrin.css` tokens where applicable

---

## Future: OCR · RAG · Adaptive Learning

| Capability | Hook |
|------------|------|
| OCR | Implement `VisionAdapter.analyze` → populate `VisionAnalysisResult` |
| Handwriting | `detectedHandwriting[]` + Education normalize |
| PDF books | `CurriculumImportAdapter` (`official_pdf`) → `setCurriculumCatalog` |
| RAG | Index `CurriculumItem` + `futureResources`; retrieval before AI call (host-owned) |
| Adaptive | Consume `weakTopics` / evaluation weakest dimensions to bias strategy |

No major refactor required if new code stays behind these interfaces.

---

## Quality Rules

- Strict TypeScript, tree-shakeable barrels (`index.ts`)
- No duplicated curriculum strings in React components
- Additive only relative to chat/CRM/Bale/backend
- Seed content is replaceable via registry/import — not a permanent data store

---

## Quick Start (dev)

```bash
npm run test:atrin-education   # local benchmark suite
npm run build                  # production typecheck + compile
```

Import examples:

```ts
import { runEducationEngine } from "@/lib/atrin/education";
import { searchCurriculum } from "@/lib/atrin/curriculum";
import { analyzeVision, parseMathStructures } from "@/lib/atrin/vision";
import { runEducationEvaluationSuite } from "@/lib/atrin/evaluation";
```
