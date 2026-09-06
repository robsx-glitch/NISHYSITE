/**
 * Foresight by URObotics — prediction models.
 *
 * Framework-free plain JS. One exported function per model so every
 * coefficient/table can be audited independently.
 *
 * IMPORTANT — read before editing:
 * This file was built in a sandboxed session with no network access to the
 * paywalled journals, NCBI/PMC, Johns Hopkins, Evidencio, or ResearchGate
 * (all blocked by the session's egress policy). That means no coefficient,
 * lookup-table cell, or cut-off below was verified against the actual
 * published source — only the existence, authors, journal and DOI of each
 * paper were confirmed via web search. Per the hard rule in the build spec
 * ("never invent, guess, or approximate a coefficient... leave a clearly
 * marked TODO_VERIFY"), every model below currently returns
 * `{ status: 'pending' }` rather than a computed number. See
 * foresight/README.md for exactly what each model needs and how to fill it
 * in from the primary source.
 */

'use strict';

/**
 * Pathological stage — Partin Tables (2016 update).
 *
 * Tosoian JJ, Chappidi M, Feng Z, et al. "Prediction of pathological stage
 * based on clinical stage, serum prostate-specific antigen, and biopsy
 * Gleason score: Partin Tables in the contemporary era." BJU Int.
 * 2017;119(5):676-683. DOI: 10.1111/bju.13573.
 *
 * The Partin Tables are large lookup tables (PSA range x clinical stage x
 * biopsy grade group -> probability of organ-confined disease,
 * extraprostatic extension, seminal vesicle invasion, and lymph node
 * involvement, each with a 95% CI). The full table has on the order of a
 * few hundred cells and is not reproduced in any source this session could
 * reach. TODO_VERIFY: transcribe the real table (or license/API access to
 * the Johns Hopkins Brady Urological Institute calculator) before enabling
 * this model.
 *
 * @param {{psa:number, clinicalStage:string, gradeGroup:number}} input
 * @returns {{status:'pending', model:string, citation:string, needed:string[]}}
 */
function predictPathologicalStage(input) {
  return {
    status: 'pending',
    model: 'Partin Tables (2016 update, Tosoian et al. 2017)',
    citation:
      'Tosoian JJ, Chappidi M, Feng Z, et al. BJU Int. 2017;119(5):676-683. DOI: 10.1111/bju.13573.',
    needed: [
      'TODO_VERIFY: full lookup table (PSA range x clinical stage x grade group) ' +
        'for organ-confined disease, extraprostatic extension, seminal vesicle ' +
        'invasion and lymph node involvement, transcribed from the published paper.',
    ],
    input,
  };
}

/**
 * Lymph node invasion — Briganti 2019 nomogram (MRI-based).
 *
 * Gandaglia G, Ploussard G, Valerio M, et al. "A Novel Nomogram to Identify
 * Candidates for Extended Pelvic Lymph Node Dissection Among Patients with
 * Clinically Localized Prostate Cancer Diagnosed with Magnetic Resonance
 * Imaging-targeted and Systematic Biopsies." Eur Urol. 2019;75(3):506-514.
 * DOI: 10.1016/j.eururo.2018.10.012.
 *
 * The published model is a logistic regression using PSA, clinical stage,
 * biopsy grade group, percentage of positive cores (or index lesion
 * diameter), and MRI-suspected extracapsular extension. TODO_VERIFY: the
 * exact regression coefficients and the paper's recommended probability
 * threshold for offering extended pelvic lymph node dissection (commonly
 * reported as being in the 7% region in secondary literature, but that
 * number was not independently confirmed against the primary source in
 * this session and must not be trusted until it is).
 *
 * @param {{psa:number, clinicalStage:string, gradeGroup:number, percentPositiveCores:number, mriEPE:boolean, mriSVI:boolean}} input
 * @returns {{status:'pending', model:string, citation:string, needed:string[]}}
 */
function predictLymphNodeInvasion(input) {
  return {
    status: 'pending',
    model: 'Briganti 2019 nomogram (Gandaglia et al. 2019)',
    citation: 'Gandaglia G, Ploussard G, Valerio M, et al. Eur Urol. 2019;75(3):506-514. DOI: 10.1016/j.eururo.2018.10.012.',
    needed: [
      'TODO_VERIFY: published logistic-regression coefficients for PSA, clinical stage, ' +
        'grade group, percent positive cores / index lesion diameter, and MRI EPE/SVI.',
      'TODO_VERIFY: the paper\'s recommended probability threshold for extended pelvic ' +
        'lymph node dissection.',
    ],
    input,
  };
}

/**
 * Positive surgical margin — pre-operative model.
 *
 * No pre-operative positive-surgical-margin model with fully published,
 * independently verifiable coefficients could be confirmed in this
 * session (candidate papers found by search, e.g. a 2024 preoperative
 * MRI-based nomogram in Cancer Imaging, report AUCs and some individual
 * odds ratios but not a complete, ready-to-implement coefficient set that
 * could be verified here). Per the build spec: do not approximate — this
 * stays pending until a complete, cited coefficient set is supplied.
 *
 * TODO_VERIFY: source a peer-reviewed pre-operative PSM model with fully
 * published coefficients (candidates to check first: MSKCC pre-treatment
 * nomogram extensions that report a PSM endpoint; Ohori et al.; the 2024
 * Cancer Imaging preoperative PSM nomogram — Cancer Imaging. 2024;24:99.
 * DOI: 10.1186/s40644-024-00749-w — confirm whether its published
 * supplementary material includes a full coefficient table).
 *
 * @param {object} input
 * @returns {{status:'pending', model:string, needed:string[]}}
 */
function predictPositiveSurgicalMargin(input) {
  return {
    status: 'pending',
    model: 'Pre-operative positive surgical margin model',
    citation: 'No fully published, verified coefficient set identified yet — see README.',
    needed: [
      'TODO_VERIFY: a peer-reviewed pre-operative PSM model with complete published coefficients.',
    ],
    input,
  };
}

/**
 * Continence recovery — risk tiers (not a validated nomogram).
 *
 * Candidate predictors and the studies that reported them (none of these
 * were independently re-verified against primary text in this session —
 * see README for the exact secondary-source confirmation each one has):
 *  - Membranous urethral length (MUL): preoperative MUL > 15 mm associated
 *    with early continence recovery at 3 months. Reported in the CHECK-MUL
 *    study: "Predictors of Early Continence Recovery Following Radical
 *    Prostatectomy, Including Transperineal Ultrasound to Evaluate the
 *    Membranous Urethra Length (CHECK-MUL Study)." Diagnostics (Basel).
 *    2024;14(8):853. DOI: 10.3390/diagnostics14080853.
 *  - Age, BMI and bilateral nerve sparing: reported as independent
 *    predictors of continence in the same CHECK-MUL study and in a
 *    Retzius-sparing RARP cohort (PMC11136784), but no specific numeric
 *    age/BMI cut-off was available to this session — only the qualitative
 *    direction of the association.
 *  - Prostate volume: reported to raise incontinence risk as it increases,
 *    again without a specific published cut-off available here.
 *
 * Because a defensible 3-tier system needs more than one verified
 * boundary per variable, and only the MUL > 15 mm cut-off could be traced
 * to a source, this function stays pending rather than inventing the
 * remaining boundaries. TODO_VERIFY: confirm the MUL cut-off against the
 * primary CHECK-MUL text, and source published cut-offs (not just
 * direction) for age, BMI/prostate volume, and nerve-sparing status before
 * enabling tiering.
 *
 * @param {{age:number, membranousUrethralLengthMM:number, prostateVolumeML:number, nerveSparing:string}} input
 * @returns {{status:'pending', model:string, needed:string[]}}
 */
function estimateContinenceTier(input) {
  return {
    status: 'pending',
    model: 'Continence recovery risk tiers (published predictors, not a validated nomogram)',
    citation:
      'CHECK-MUL Study, Diagnostics (Basel). 2024;14(8):853. DOI: 10.3390/diagnostics14080853; ' +
      'Retzius-sparing RARP continence cohort, PMC11136784.',
    needed: [
      'TODO_VERIFY: confirm MUL > 15 mm early-continence cut-off against the primary CHECK-MUL text.',
      'TODO_VERIFY: published numeric cut-offs (not just direction of association) for age, ' +
        'BMI/prostate volume, and nerve-sparing status.',
    ],
    input,
  };
}

const models = {
  predictPathologicalStage,
  predictLymphNodeInvasion,
  predictPositiveSurgicalMargin,
  estimateContinenceTier,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = models;
}
if (typeof window !== 'undefined') {
  window.ForesightModels = models;
}
