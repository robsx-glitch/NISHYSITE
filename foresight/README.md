# Foresight by URObotics

A pre-operative outcome calculator for men considering robotic radical
prostatectomy (RARP), published at `/foresight/`. Plain JS, no build step,
no framework, no network calls — everything runs in the visitor's browser.

## ⚠️ Current status: all four models are pending verified data

This page was built in a sandboxed session whose network egress policy
blocked every source that could confirm exact coefficients: paywalled
journal pages, `ncbi.nlm.nih.gov`/PMC, `hopkinsmedicine.org`,
`evidencio.com`, and `researchgate.net` were all unreachable (confirmed via
the session's own proxy status endpoint as an organization-level egress
policy, not a transient failure). Web search confirmed that each paper
below exists, with its correct authors/journal/year/DOI, but could not
surface the actual table cells or regression coefficients in reproducible
form.

Per the build's hard rule — *never invent, guess, or approximate a
coefficient, table cell, or cut-off* — every model in `models.js` currently
returns `{ status: 'pending', ... }` instead of a number. The full UI
(form, validation, tooltips, tabs, patient/clinician toggle) is complete
and working; only the actual maths is missing, clearly marked
`TODO_VERIFY` in code and listed per-model below.

| Model | Tab | Source | Status |
|---|---|---|---|
| Partin Tables (2016 update) | Pathological stage | Tosoian JJ, Chappidi M, Feng Z, et al. *BJU Int.* 2017;119(5):676-683. DOI: [10.1111/bju.13573](https://doi.org/10.1111/bju.13573) | `TODO_VERIFY` — full lookup table not transcribed |
| Briganti 2019 nomogram | Lymph node risk | Gandaglia G, Ploussard G, Valerio M, et al. *Eur Urol.* 2019;75(3):506-514. DOI: [10.1016/j.eururo.2018.10.012](https://doi.org/10.1016/j.eururo.2018.10.012) | `TODO_VERIFY` — coefficients and ePLND threshold not confirmed |
| Pre-operative PSM model | Surgical margin | No complete, independently verified coefficient set identified | `TODO_VERIFY` — candidate source not confirmed complete (see below) |
| Continence recovery tiers | Continence recovery | CHECK-MUL Study, *Diagnostics (Basel).* 2024;14(8):853. DOI: [10.3390/diagnostics14080853](https://doi.org/10.3390/diagnostics14080853); Retzius-sparing RARP cohort (PMC11136784) | `TODO_VERIFY` — only one boundary (MUL > 15mm) has a reported number; the rest is direction-only |

## How to fill in a gap

Each function in `models.js` has a doc comment stating exactly what is
missing. To complete one:

1. Get the primary paper (Dr. Puliyath has journal access this session did
   not).
2. Replace the function body with the real calculation. Keep the same
   input shape (documented in the JSDoc above each function) so `app.js`
   doesn't need to change.
3. Return a result object instead of `{status:'pending', ...}` — e.g.
   `{ status: 'ok', pointEstimate: 0.42, model, citation }` (the shape is
   up to whoever fills it in, but `app.js`'s `formatPending()` will need a
   matching branch for the "ok" case — currently it only renders pending
   states, on purpose, so nothing computed can leak out unverified).
4. Move the worked example from the paper into `models.test.js`, replacing
   the current contract-only test for that model, per the original build
   spec ("checks each model against at least one worked example from its
   source paper").
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
| Cores taken / positive | Counts | Biopsy report |
| PI-RADS | 1–5 | MRI report |
| MRI EPE / SVI | Yes/no | MRI report ("extracapsular extension" / "seminal vesicle invasion") |
| Prostate volume | mL | MRI or ultrasound report |
| Membranous urethral length | mm, optional | MRI report, if measured |
| Planned nerve sparing | bilateral / unilateral / none / undecided | Discussed with surgeon |

## Known limitations

- All four models are pending real coefficients (see table above) — the
  page currently shows "Not yet available" on every tab once its required
  fields are filled in, by design.
- Every model listed was developed largely in Western cohorts. Indian men
  often present with higher PSA and grade group at diagnosis on average,
  so even once verified coefficients are in place, calibration in an
  Indian population has not been separately established.
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
  `models.js` and never computes a clinical number itself.
- `models.test.js` — plain-`assert` Node tests, run with
  `node foresight/models.test.js`.

No `fetch`, no `localStorage`/cookies, no analytics anywhere in this
directory — everything a visitor enters stays in that page's memory and is
discarded on reload.
