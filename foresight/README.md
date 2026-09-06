# Foresight by URObotics

A pre-operative outcome calculator for men considering robotic radical
prostatectomy (RARP), published at `/foresight/`. Plain JS, no build step,
no framework, no network calls — everything runs in the visitor's browser.

## Status: 2 of 4 models implemented from primary sources

This page was originally built in a sandboxed session whose network
egress policy blocked every source that could confirm exact coefficients
(paywalled journals, NCBI/PMC, Hopkins, Evidencio, ResearchGate). Dr
Puliyath then supplied two primary-source PDFs directly, which are now
implemented:

- The Johns Hopkins Brady Urological Institute's own **Partin Tables**
  page (Tosoian et al. 2017 update), with the actual lookup-table cells.
- Evidencio's CE-marked **User Manual for the Briganti Nomogram** v1.0,
  which reproduces the exact logistic-regression coefficient table for
  the **Briganti 2019** model — the manufacturer's own reference
  implementation of the published model.

The other two models still have no primary source supplied, so per the
build's hard rule — *never invent, guess, or approximate a coefficient,
table cell, or cut-off* — they remain `{ status: 'pending', ... }`.

| Model | Tab | Source | Status |
|---|---|---|---|
| Partin Tables (2016 update) | Pathological stage | Tosoian JJ, Chappidi M, Feng Z, et al. *BJU Int.* 2017;119(5):676-683. DOI: [10.1111/bju.13573](https://doi.org/10.1111/bju.13573) | **Implemented** for clinical stage T1c/T2a/T2b/T2c and grade groups 1–4. `unsupported` for T3a/T3b and grade group 5 — not in the supplied source table (its grade-5 column was cut off the PDF page). |
| Briganti 2019 nomogram | Lymph node risk | Gandaglia G, Ploussard G, Valerio M, et al. *Eur Urol.* 2019;75(3):506-514. DOI: [10.1016/j.eururo.2018.10.012](https://doi.org/10.1016/j.eururo.2018.10.012) | **Implemented** — full logistic regression. `TODO_VERIFY`: the source manual doesn't state a recommended probability threshold for offering extended pelvic lymph node dissection, so the UI reports the raw probability only. |
| Pre-operative PSM model | Surgical margin | No complete, independently verified coefficient set identified | `TODO_VERIFY` — candidate source not confirmed complete (see below) |
| Continence recovery tiers | Continence recovery | CHECK-MUL Study, *Diagnostics (Basel).* 2024;14(8):853. DOI: [10.3390/diagnostics14080853](https://doi.org/10.3390/diagnostics14080853); Retzius-sparing RARP cohort (PMC11136784) | `TODO_VERIFY` — only one boundary (MUL > 15mm) has a reported number; the rest is direction-only |

## How the implemented models work

### Partin Tables (`predictPathologicalStage`)

A direct lookup table (`PARTIN_TABLE` in `models.js`), transcribed cell by
cell from the source PDF: 3 clinical-stage rows (T1c, T2a, and T2b/T2c —
the source reports T2b and T2c as one combined row) × 4 PSA bins (0–4.0,
4.1–6.0, 6.1–10.0, >10.0) × 3 grade-group columns (1, 2, and a combined
"3+4=7 or Gleason 8" column, per the source's own column header) → four
outcomes (organ-confined, extraprostatic extension, seminal vesicle
invasion, lymph node involvement), each with its published 95% CI.

Grade group 5 (Gleason 9–10) has a column in the original Partin Tables
that was cut off the page in the supplied PDF (a print of a web table
wider than the page) and isn't available here. Clinical stages T3a/T3b
aren't in this table at all. Both cases return `{status: 'unsupported'}`
with a `reason` explaining why, rather than extrapolating.

### Briganti 2019 (`predictLymphNodeInvasion`)

A full logistic regression, `P = e^(Xβ) / (1 + e^(Xβ))`, with every
coefficient transcribed from Table 2 of the Evidencio user manual:

| Term | Coefficient |
|---|---|
| Intercept | -4.5974 |
| PSA (ng/mL) | 0.0416 |
| Clinical stage at mpMRI: organ-confined | 0 (reference) |
| Clinical stage at mpMRI: extracapsular extension | 1.2214 |
| Clinical stage at mpMRI: seminal vesicle invasion | 1.4672 |
| Maximum lesion diameter at mpMRI (mm) | 0.0311 |
| Biopsy grade group 1 / 2 | 0 (reference) |
| Biopsy grade group 3 | 1.2032 |
| Biopsy grade group 4 / 5 | 1.8063 |
| % cores with clinically significant PCa (grade group ≥2) | 0.0119 |

"Clinical stage at mpMRI" is derived from the MRI EPE/SVI form fields
(SVI takes priority over EPE, since a patient can't be staged as both).
The source manual states the model's output is "a calculated risk of
Lymph Node Involvement as a percentage with one decimal" but does not
itself give a recommended threshold for offering extended pelvic lymph
node dissection — the UI surfaces the raw probability with a note that
the threshold is still `TODO_VERIFY`.

Both models' worked examples in `models.test.js` are transcribed straight
from the source documents (Partin) or hand-computed from the transcribed
coefficients (Briganti) — see the comments there.

## How to fill in a remaining gap

Each function in `models.js` has a doc comment stating exactly what is
missing. To complete one:

1. Get the primary paper (Dr. Puliyath has journal access this session
   did not, or can supply the PDF directly as was done for Partin/Briganti
   above).
2. Replace the function body with the real calculation. Keep the same
   input shape (documented in the JSDoc above each function) so `app.js`
   doesn't need to change.
3. Return `{ status: 'ok', ... }` instead of `{status:'pending', ...}` —
   see `predictPathologicalStage`/`predictLymphNodeInvasion` for the
   pattern, and add a matching `renderOk` to that model's tab definition
   in `app.js`.
4. Move the worked example from the paper into `models.test.js`, replacing
   the current contract-only test for that model.
5. Update the status table above and remove the `TODO_VERIFY` line for
   that model.

### Positive surgical margin: what's missing specifically

Search surfaced several candidate papers but none with a coefficient set
this session could confirm as both *complete* and *pre-operative* (using
only information available before surgery):

- Cancer Imaging. 2024;24:99. DOI: 10.1186/s40644-024-00749-w — a 2024
  pre-operative clinicopathological + MRI nomogram; worth checking first
  since it's specifically pre-operative, but its supplementary coefficient
  table was not reachable here.
- An MRI-based grading system (PMC10593712) reports individual β
  coefficients (e.g. 1.311 for capsule contact length ≥20mm) but appears to
  be a component score rather than a complete probability model — confirm
  before using.
- Classic options to check: Ohori et al., or an MSKCC pre-treatment
  nomogram extension with a PSM endpoint.

## Variable definitions

| Field | Meaning | Where a patient finds it |
|---|---|---|
| Age | Age in years | — |
| PSA | Prostate-specific antigen, ng/mL | Blood test report |
| Clinical T stage | T1c–T3b | Urologist's exam + MRI report |
| Biopsy ISUP grade group | 1–5 | Biopsy pathology report ("Grade Group") |
| Cores taken / positive | Counts | Biopsy report (collected per the original spec; not yet consumed by any implemented model — Briganti 2019 needs the clinically-significant-cores percentage below instead) |
| PI-RADS | 1–5 | MRI report |
| MRI EPE / SVI | Yes/no | MRI report ("extracapsular extension" / "seminal vesicle invasion") — also used to derive Briganti 2019's "clinical stage at mpMRI" |
| MRI maximum lesion diameter | mm | MRI report — Briganti 2019 input |
| Cores with clinically significant cancer | %, 0–100 | Biopsy report — percentage of cores with grade group ≥2 (not just any-positive), a Briganti 2019 input |
| Prostate volume | mL | MRI or ultrasound report |
| Membranous urethral length | mm, optional | MRI report, if measured |
| Planned nerve sparing | bilateral / unilateral / none / undecided | Discussed with surgeon |

## Known limitations

- Two of four models (surgical margin, continence) are still pending real
  coefficients — see the status table above.
- Every model here was developed largely in Western cohorts. Indian men
  often present with higher PSA and grade group at diagnosis on average,
  so calibration in an Indian population has not been separately
  established even for the implemented models.
- The Partin Tables implementation covers only the clinical stages and
  grade groups present in the supplied source PDF (see above) — it will
  say "not available for this combination" rather than guess outside that
  range.
- The Briganti 2019 probability is reported without a decision threshold
  (see above) — it's a raw risk estimate, not a recommendation.
- This is an educational aid, not a diagnostic or treatment-planning tool,
  and does not replace consultation with a urologist.

## Architecture

- `index.html` — page shell, header/lockup, static copy, mounts three
  empty containers (`#foresight-audience`, `#foresight-form`,
  `#foresight-results`) that `app.js` renders into.
- `models.js` — one exported function per model, framework-free, no DOM
  access. Exports via `module.exports` (for the Node test) and
  `window.ForesightModels` (for the browser).
- `app.js` — owns form state/validation and tab rendering; calls into
  `models.js` and never computes a clinical number itself. Each tab in
  its `TABS` array has a `run(values)` function (calls the model) and,
  for implemented models, a `renderOk(result, wrap)` function that draws
  that model's specific result shape.
- `models.test.js` — plain-`assert` Node tests, run with
  `node foresight/models.test.js`.

No `fetch`, no `localStorage`/cookies, no analytics anywhere in this
directory — everything a visitor enters stays in that page's memory and is
discarded on reload.
