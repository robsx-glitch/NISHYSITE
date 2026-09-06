# Foresight by URObotics

A pre-operative outcome calculator for men considering robotic radical
prostatectomy (RARP), published at `/foresight/`. Plain JS, no build step,
no framework, no network calls — everything runs in the visitor's browser.

## Status: all 4 models implemented from primary sources

This page was originally built in a sandboxed session whose network
egress policy blocked every source that could confirm exact coefficients
(paywalled journals, NCBI/PMC, Hopkins, Evidencio, ResearchGate). Dr
Puliyath then supplied four primary-source PDFs directly, all now
implemented:

- The Johns Hopkins Brady Urological Institute's own **Partin Tables**
  page (Tosoian et al. 2017 update), with the actual lookup-table cells.
- Evidencio's CE-marked **User Manual for the Briganti Nomogram** v1.0,
  which reproduces the exact logistic-regression coefficient table for
  the **Briganti 2019** model — the manufacturer's own reference
  implementation of the published model.
- Hao et al. 2022 (*Curr Oncol* 29(12):9560-9571), with the full
  multivariate logistic regression behind that paper's **surgical
  margin** nomogram, including a worked example quoted in the paper's
  own text that the implementation reproduces.
- The supplementary tables from Pinkhasov et al. 2022 (*Cancers*
  14(7):1644), with the exact multivariate odds ratios behind that
  paper's **continence** nomogram.

| Model | Tab | Source | Status |
|---|---|---|---|
| Partin Tables (2016 update) | Pathological stage | Tosoian JJ, Chappidi M, Feng Z, et al. *BJU Int.* 2017;119(5):676-683. DOI: [10.1111/bju.13573](https://doi.org/10.1111/bju.13573) | **Implemented** for clinical stage T1c/T2a/T2b/T2c and grade groups 1–4. `unsupported` for T3a/T3b and grade group 5 — not in the supplied source table (its grade-5 column was cut off the PDF page). |
| Briganti 2019 nomogram | Lymph node risk | Gandaglia G, Ploussard G, Valerio M, et al. *Eur Urol.* 2019;75(3):506-514. DOI: [10.1016/j.eururo.2018.10.012](https://doi.org/10.1016/j.eururo.2018.10.012) | **Implemented** — full logistic regression. `TODO_VERIFY`: the source manual doesn't state a recommended probability threshold for offering extended pelvic lymph node dissection, so the UI reports the raw probability only. |
| Pre-operative PSM model | Surgical margin | Hao Y, Zhang Q, Hang J, et al. *Curr Oncol.* 2022;29(12):9560-9571. DOI: [10.3390/curroncol29120751](https://doi.org/10.3390/curroncol29120751) | **Implemented** — full logistic regression, verified against the paper's own worked example. `TODO_VERIFY`: the paper mentions "low/medium/high-risk" groups but never states the numeric cut-offs between them, so the UI reports the raw probability only. |
| Continence recovery tiers | Continence recovery | Pinkhasov RM, Lee T, Huang R, et al. *Cancers.* 2022;14(7):1644. DOI: [10.3390/cancers14071644](https://doi.org/10.3390/cancers14071644) | **Implemented as tiers** — real multivariate ORs, but *not* the paper's own point-based nomogram (see below for why). |

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

### Continence recovery tiers (`estimateContinenceTier`)

Built from the supplementary tables of Pinkhasov et al. 2022, which
report multivariate logistic-regression odds ratios (for *social
continence*, confirmed by cross-checking directionality against the
raw group sizes in the paper's univariate tables) for age, race, BMI,
and pre-op erectile function at 6, 12, and 24 months:

| Timepoint | Age ≥60 vs <60 (OR for continence) | Erectile function firm-enough vs not (OR for continence) |
|---|---|---|
| 6-month | 0.66 (95% CI 0.44–0.99), p=0.04 | 2.02 (95% CI 1.34–3.04), p<.001 |
| 12-month | 0.64 (95% CI 0.32–1.31), p=0.22 | 1.90 (95% CI 0.92–3.91), p=0.08 |
| 24-month | 0.93 (95% CI 0.28–3.05), p=0.90 | 5.71 (95% CI 1.22–26.81), p=0.03 |

Race and BMI were also modelled in the paper but weren't statistically
significant at any timepoint, and race is additionally excluded here
because this tool serves an Indian patient population the study's race
categories don't map onto.

**This is deliberately not the paper's own point-based nomogram**
(Figures S1/S2 in the supplement). Reading a graphical nomogram's exact
per-category point widths and its points-to-risk curve off a rendered
PDF figure — without a stated intercept or point-scaling formula in
text — is exactly the kind of reading-off-a-picture the "never
approximate" rule rules out. Instead, `estimateContinenceTier` counts
how many of the two statistically meaningful adverse factors apply
(age ≥60; erectile function not firm enough) and maps that count to a
tier: 0 → early, 1 → intermediate, 2 → delayed. That mapping is this
tool's own heuristic, not the paper's — which is exactly why the build
spec asked this tab be labelled "risk tiers from published predictors,
not a validated nomogram." The full OR table above ships with every
result so a clinician can see the real numbers behind the tier.

### Positive surgical margin (`predictPositiveSurgicalMargin`)

Built from Hao et al. 2022 (Curr Oncol 29(12):9560-9571), a pre-operative
logistic regression developed by Lasso variable selection then fit on 903
RALP patients (151 PSMs). All 18 coefficients (17 predictor terms +
intercept) are transcribed from the paper's Table 3, verified two ways:
every row's published OR equals `exp(published Estimate)` to 3 decimals,
and the implementation reproduces the paper's own worked example (quoted
in its discussion section) to within 0.5 percentage points — the small
gap is fully explained by the paper publishing its coefficients rounded
to 3 decimals, not a structural error (see the comment in `models.js` and
the test in `models.test.js` for the exact numbers).

Inputs map onto the paper's variables as: age, PSA, biopsy ISUP grade
group (dummy-coded vs. grade group 1), percentage of positive cores
("PPN", derived from cores taken/positive), percentage of tumour across
all cores ("PT" — a distinct metric from percent-positive-cores, a new
field this model needed), maximum MRI lesion diameter (converted mm→cm
to match the paper's units), PI-RADS score (dummy-coded vs. PI-RADS 1-3,
with a "negative" option for no lesion seen — another new field), the
same MRI-stage grouping Briganti 2019 uses (≤T2a / T2b / ≥T2c, derived
from clinical T stage), and MRI lesion location (peripheral / transitional
/ mixed / negative, dummy-coded vs. mixed — a third new field).

`TODO_VERIFY`: the paper's calibration discussion refers to "low-risk",
"medium-risk" and "high-risk" groups but never states the numeric
probability boundaries between them anywhere in the text, so the UI
reports the raw probability only, with no risk-tier label.

## Variable definitions

| Field | Meaning | Where a patient finds it |
|---|---|---|
| Age | Age in years | — |
| PSA | Prostate-specific antigen, ng/mL | Blood test report |
| Clinical T stage | T1c–T3b | Urologist's exam + MRI report |
| Biopsy ISUP grade group | 1–5 | Biopsy pathology report ("Grade Group") — Partin, Briganti and PSM input |
| Cores taken / positive | Counts | Biopsy report — used to derive percent-positive-cores ("PPN") for the PSM model |
| PI-RADS | 1–5, or negative (no lesion seen) | MRI report — PSM model input |
| MRI EPE / SVI | Yes/no | MRI report ("extracapsular extension" / "seminal vesicle invasion") — derives Briganti 2019's "clinical stage at mpMRI" |
| MRI maximum lesion diameter | mm | MRI report — Briganti 2019 and PSM inputs (converted mm→cm for PSM, to match that paper's units) |
| Cores with clinically significant cancer | %, 0–100 | Biopsy report — percentage of cores with grade group ≥2 (not just any-positive); a Briganti 2019 input |
| Total tumour involvement across cores | %, 0–100 | Biopsy report — each core's %-involved by cancer, summed ("PT" in the PSM paper; distinct from percent-positive-cores) |
| MRI lesion location | Peripheral / transitional / mixed / negative | MRI report — PSM model input |
| Prostate volume | mL | MRI or ultrasound report (collected per the original spec; not consumed by any implemented model) |
| Membranous urethral length | mm, optional | MRI report, if measured (collected per the original spec; not consumed by the implemented continence tiering — the source paper's own significant predictors are age and erectile function instead) |
| Planned nerve sparing | bilateral / unilateral / none / undecided | Discussed with surgeon (collected per the original spec; not consumed by the implemented continence tiering) |
| Pre-op erectile function | Firm enough for penetration: yes/no | Discussed with surgeon — a continence-tiering input |

## Known limitations

- Every model here was developed largely in Western (or, for the PSM
  model, a single Chinese-centre) cohort. Indian men often present with
  higher PSA and grade group at diagnosis on average, so calibration in
  an Indian population has not been separately established for any of
  them.
- The Partin Tables implementation covers only the clinical stages and
  grade groups present in the supplied source PDF (see above) — it will
  say "not available for this combination" rather than guess outside that
  range.
- The Briganti 2019 and PSM probabilities are reported without a decision
  threshold (see above for each) — they're raw risk estimates, not
  recommendations.
- The continence tab reports tiers built from two of the source paper's
  predictors, not the paper's own nomogram (see above for why).
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
