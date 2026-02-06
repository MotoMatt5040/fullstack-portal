# Survey Pipeline — Development Roadmap

## Project Summary

The Survey Pipeline automates conversion of survey questionnaire documents (.docx) into Voxco Excel questionnaire import files (.xlsx). It uses a local Qwen3-32B LLM running on DGX Spark to extract structured question data, then deterministically generates the Excel output.

**Architecture:**

```
Survey .docx
     │
     ▼
 docx_parser.py        Parse & classify paragraphs, assemble structural chunks
     │
     ▼
 llm_extractor.py      Qwen3-32B extracts question metadata → Pydantic validation
     │
     ▼
 SurveySpec JSON        Intermediate JSON (reviewable & editable)
     │
     ▼
 excel_generator.py     Deterministic Voxco Excel generation
     │
     ▼
 Voxco .xlsx            Ready for import
```

**Workflow:** `python convert_to_excel.py survey.docx` — or use `--json-only` to extract and review before generating Excel.

---

## Current State

### What's Built and Working

| Component | Status | Description |
|-----------|--------|-------------|
| **Document Parser** | Complete | Three-stage pipeline: paragraph classification → structural assembly → LLM-ready formatting. Handles standard questions, grid/matrix questions, multi-column questions, intro text detachment. |
| **LLM Extractor** | Complete | 17-rule extraction prompt for Qwen3-32B. Post-validation strips interviewer instructions, validates Voxco expressions, cleans answer text. |
| **Pydantic Schema** | Complete | Full data model: 7 question types, answer options with visibility/fixed/exclusive flags, grid rows, post-answer actions, skip/ask logic, block assignments. |
| **Excel Generator** | Complete | Deterministic .xlsx builder. All 7 question types, 7 block sections, per-question/per-answer settings, logic rows, global survey config (50+ settings). |
| **CLI** | Complete | Full pipeline, JSON-only mode, from-JSON mode, title/identifier overrides. |
| **Format Documentation** | Complete | 450+ line specification of Voxco Excel format. |

### First Production Test: 18114QF.docx

- **28 questions** extracted successfully (28/28)
- **3 grid questions** properly assembled from individual rows:
  - Q5: 7-row favorability grid (6-point scale)
  - Q16: 9-row favor/oppose grid (5-point scale)
  - Q25: 4-row more/less likely grid (6-point scale)
- Grid answer text correctly synthesized: "Favorable / Strongly", "Favor / Somewhat", etc.
- Interviewer instructions stripped from question text
- DNR options properly hidden (visible=false, fixed=true)
- Termination logic generated for screener questions
- Multi-column questions (Q1/Q2) split into separate RadioButton questions

### Known Limitations (Current)

- **LLM accuracy varies** — occasional misclassification (e.g., RadioButton extracted as ChoiceGrid). Caught during JSON review step.
- **No automated tests** — test directory exists but is empty.
- **No retry on LLM failure** — if JSON parsing fails, the question is skipped.
- **SELECTION/rotation rows** not yet generated in Excel (answer randomization is set via settings, but explicit SELECTION rows are missing).
- **Simple logic only** — skip/ask logic supports `{Q1}=1 AND {Q2}=2` format; no nested conditions.

---

## Development Phases

### Phase 1: Validation & Quality Assurance

**Goal:** Confidence that extracted output matches expected Voxco format.

| Task | Description |
|------|-------------|
| Extraction quality report | After LLM extraction, generate a summary of warnings: bare numeric answer text, invalid logic expressions, missing answer codes, questions that failed extraction. |
| Side-by-side comparison tool | Script to compare generated .xlsx against a known-good reference file (e.g., 13256W template). Report structural differences. |
| JSON diff viewer | When re-extracting, show what changed from the previous extraction to catch regressions. |
| Unit tests — parser | Test paragraph classification and chunk assembly against known inputs. Cover grid detection, multi-column splitting, intro detachment. |
| Unit tests — post-validation | Test instruction stripping, Voxco expression validation, answer text cleanup. |
| Integration tests | End-to-end: sample .docx → JSON → .xlsx. Verify row counts, block structure, question types match expectations. |

### Phase 2: Extraction Robustness

**Goal:** Handle more survey formats reliably with less manual JSON editing.

| Task | Description |
|------|-------------|
| LLM retry with error feedback | On JSON parse failure, retry with the parse error appended to the prompt. |
| Confidence scoring | Flag questions where the LLM response needed heavy correction or where grid answer text looks suspicious. |
| Additional question type support | DateTimeAnswer patterns, open-end TextAnswer detection, compound questions. |
| Improved grid scale detection | Handle non-standard scale patterns (7-point, 10-point, agree/disagree, satisfaction). |
| Multi-survey format support | Test and adapt parser for different .docx formatting conventions beyond the current tab-delimited style. |
| Deterministic fallback rules | When LLM fails, apply rule-based extraction for common simple patterns (yes/no, demographic ranges). |

### Phase 3: Advanced Voxco Features

**Goal:** Generate Excel that covers the full Voxco feature set.

| Task | Description |
|------|-------------|
| SELECTION / SELECTIONVARIABLE rows | Generate explicit rotation/selection rows for randomized answer lists. |
| Complex logic conditions | Support CONDITION sub-nodes with nested AND/OR trees under EXECUTIONCONDITION. |
| Quota integration | Map quota variables and conditions to POSTANSWERACTION rows. |
| Piping / text substitution | Detect and preserve `{QName}` references in question text for response piping. |
| Loop / iteration support | Handle repeated question blocks with variable substitution. |

### Phase 4: Workflow & Tooling

**Goal:** Make the pipeline practical for daily production use.

| Task | Description |
|------|-------------|
| Batch processing | Process multiple .docx files in sequence with aggregate reporting. |
| Structured logging | Replace print statements with proper logging (levels, timestamps, file output). |
| JSON editor UI | Web or TUI interface for reviewing and editing the intermediate JSON before Excel generation. |
| Excel validator | Post-generation check that the .xlsx conforms to Voxco import expectations (required columns, valid types, block ordering). |
| Config file | Move model URL, temperature, max tokens, block structure into a config file instead of hardcoded constants. |

### Phase 5: Performance & Infrastructure

**Goal:** Scale to high-volume production.

| Task | Description |
|------|-------------|
| Parallel LLM requests | Send multiple questions to vLLM concurrently (batch API or async requests). |
| Resume capability | Save extraction progress so a failed run can resume from the last successful question. |
| Model evaluation harness | Test extraction quality across models (Qwen3 variants, other LLMs) with a scored benchmark suite. |
| Caching | Cache LLM responses by question hash to avoid re-extracting unchanged questions. |
| CI pipeline | Automated tests on commit, extraction regression checks on model updates. |

---

## Infrastructure

| Component | Current Setup |
|-----------|---------------|
| **Hardware** | DGX Spark — ARM64, GB10 Blackwell GPU, 128GB unified memory |
| **LLM** | Qwen3-32B-AWQ (4-bit, ~17GB) via vLLM Docker container |
| **Inference speed** | ~12 tokens/second |
| **Runtime** | Python 3.x with Pydantic, openpyxl, python-docx, requests |
| **Full survey extraction** | ~28 questions processed sequentially |

---

## File Inventory

```
survey-pipeline/
├── convert_to_excel.py        # CLI entry point — full pipeline
├── convert_survey.py          # Legacy JSON-only extractor (deprecated)
├── chat.py                    # Interactive Qwen chat client
├── extract_schema.py          # JSON schema extraction utility
├── schemas/
│   └── voxco_excel.py         # Pydantic data model (7 question types)
├── src/
│   ├── docx_parser.py         # Three-stage document parser (~735 lines)
│   ├── llm_extractor.py       # LLM extraction + post-validation (~332 lines)
│   └── excel_generator.py     # Deterministic Excel builder (~580 lines)
├── docs/
│   ├── voxco_excel_format.md  # Voxco Excel format specification
│   └── development_roadmap.md # This document
├── tests/                     # Empty — tests not yet written
├── models/
│   └── Qwen3-32B-AWQ/         # Quantized model weights
└── README.md                  # Quick-start guide
```

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM extracts wrong question type | Medium — caught in JSON review | Post-validation rules, confidence scoring (Phase 2) |
| New survey format breaks parser | High — no output | Multi-format testing, parser hardening (Phase 2) |
| No test suite | High — silent regressions | Unit + integration tests (Phase 1) |
| vLLM server unavailable | Blocks extraction | `--from-json` mode allows Excel generation without LLM |
| Voxco changes import format | Medium — Excel rejected | Format spec documented, validator tool (Phase 4) |
| Grid scale labels lost | Medium — bare "1","2","3" in answers | Post-validation warning, grid-specific prompt notes (already mitigated) |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Questions extracted without manual fix | >90% |
| Grid answer text accuracy | 100% (no bare numeric codes) |
| Interviewer instructions in output | 0 |
| Valid Voxco logic expressions | 100% (invalid → null, flagged for review) |
| Excel import success rate | 100% of generated files accepted by Voxco |
| Extraction time per question | <30 seconds |
