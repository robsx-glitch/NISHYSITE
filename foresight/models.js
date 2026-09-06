/**
 * Foresight by URObotics — prediction models.
 *
 * Framework-free plain JS. One exported function per model so every
 * coefficient/table can be audited independently.
 *
 * IMPORTANT — read before editing:
 * This session's network egress policy blocks every paywalled journal,
 * NCBI/PMC, Johns Hopkins, Evidencio and ResearchGate, so no coefficient
 * could originally be verified — only citations, via web search. Dr
 * Puliyath then supplied two primary-source PDFs directly:
 *  - The Johns Hopkins Brady Urological Institute's own Partin Tables page
 *    (Tosoian et al. 2017 update), with the actual lookup-table cells.
 *  - Evidencio's CE-marked "User Manual for the Briganti Nomogram" v1.0,
 *    which reproduces the exact logistic-regression coefficient table
 *    (Table 2) for the Briganti 2019 model, used by the manufacturer's own
 *    certified calculator.
 * `predictPathologicalStage` and `predictLymphNodeInvasion` below are
 * implemented from those two documents (coefficients transcribed and
 * cross-checked against exact x/y text-layout positions in the source
 * PDF, not just reading order, since the Briganti table interleaves four
 * model versions column-by-column). Every cell/coefficient used is
 * commented with where in the source it came from. Anything the source
 * didn't cover (Gleason grade group 5 in the Partin table; clinical stage
 * T3a/T3b; the paper's recommended ePLND probability threshold) is left
 * as `status: 'unsupported'`, not guessed.
 *
 * `predictPositiveSurgicalMargin` and `estimateContinenceTier` still have
 * no primary source supplied, so per the hard rule ("never invent, guess,
 * or approximate a coefficient... leave a clearly marked TODO_VERIFY")
 * they remain `{ status: 'pending' }`. See foresight/README.md.
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
 * Data transcribed directly from the Johns Hopkins Brady Urological
 * Institute's own Partin Tables page (PDF supplied by Dr Puliyath,
 * 06/09/2026), based on 4459 men treated with radical prostatectomy and
 * pelvic lymphadenectomy at Johns Hopkins, Jan 2010–Oct 2015. Values are
 * percentages of patients with the given PSA range, clinical stage and
 * biopsy grade group who had: organ-confined disease (OC), extraprostatic
 * extension (ECE), seminal vesicle invasion (SV), or lymph node
 * involvement (LN). ci is the published 95% confidence interval.
 *
 * Coverage limits of the source table as supplied:
 *  - Clinical stage: only T1c, T2a and T2b/T2c (T2b and T2c are reported
 *    as one combined row in this source) are covered. T3a/T3b are not in
 *    this table at all.
 *  - Grade group: columns for grade group 1, 2, and a combined "3+4=7 or
 *    Gleason score 8" column (covering grade groups 3 and 4 jointly, per
 *    the source table's own column header) are present. A grade group 5
 *    (Gleason 9–10) column exists in the original table but was cut off
 *    the page in the supplied PDF and is not available here.
 */
var PARTIN_TABLE = {
  T1c: {
    '0-4.0': {
      GG1: { OC: [92, 90, 93], ECE: [8, 6, 9], SV: [1, 0, 1], LN: [0, 0, 0] },
      GG2: { OC: [77, 74, 80], ECE: [20, 17, 23], SV: [2, 1, 3], LN: [1, 0, 1] },
      'GG3-4': { OC: [67, 62, 72], ECE: [24, 21, 28], SV: [7, 4, 10], LN: [2, 1, 4] },
    },
    '4.1-6.0': {
      GG1: { OC: [90, 89, 92], ECE: [9, 7, 10], SV: [1, 0, 1], LN: [0, 0, 0] },
      GG2: { OC: [74, 71, 77], ECE: [23, 20, 26], SV: [2, 1, 3], LN: [1, 0, 1] },
      'GG3-4': { OC: [64, 60, 68], ECE: [28, 24, 31], SV: [6, 4, 9], LN: [2, 1, 4] },
    },
    '6.1-10.0': {
      GG1: { OC: [87, 85, 89], ECE: [12, 10, 14], SV: [1, 1, 2], LN: [0, 0, 1] },
      GG2: { OC: [67, 63, 71], ECE: [28, 24, 31], SV: [4, 2, 6], LN: [1, 0, 2] },
      'GG3-4': { OC: [53, 49, 58], ECE: [32, 27, 36], SV: [11, 8, 15], LN: [4, 2, 6] },
    },
    '>10.0': {
      GG1: { OC: [80, 75, 84], ECE: [17, 13, 20], SV: [3, 1, 4], LN: [1, 0, 2] },
      GG2: { OC: [52, 46, 58], ECE: [34, 29, 40], SV: [8, 5, 12], LN: [5, 3, 8] },
      'GG3-4': { OC: [35, 30, 41], ECE: [33, 27, 39], SV: [20, 14, 27], LN: [11, 7, 17] },
    },
  },
  T2a: {
    '0-4.0': {
      GG1: { OC: [88, 86, 91], ECE: [11, 9, 13], SV: [1, 0, 1], LN: [0, 0, 0] },
      GG2: { OC: [70, 65, 74], ECE: [27, 22, 31], SV: [2, 1, 4], LN: [1, 0, 2] },
      'GG3-4': { OC: [58, 53, 64], ECE: [31, 26, 36], SV: [7, 4, 11], LN: [3, 1, 6] },
    },
    '4.1-6.0': {
      GG1: { OC: [87, 83, 89], ECE: [12, 10, 15], SV: [1, 0, 1], LN: [0, 0, 0] },
      GG2: { OC: [66, 62, 71], ECE: [30, 25, 35], SV: [2, 1, 4], LN: [1, 0, 2] },
      'GG3-4': { OC: [55, 50, 61], ECE: [35, 30, 40], SV: [7, 4, 10], LN: [3, 1, 5] },
    },
    '6.1-10.0': {
      GG1: { OC: [82, 78, 86], ECE: [16, 13, 20], SV: [1, 1, 2], LN: [0, 0, 1] },
      GG2: { OC: [58, 52, 64], ECE: [36, 30, 42], SV: [4, 2, 6], LN: [2, 1, 3] },
      'GG3-4': { OC: [45, 39, 51], ECE: [39, 33, 45], SV: [11, 7, 16], LN: [4, 2, 8] },
    },
    '>10.0': {
      GG1: { OC: [73, 67, 79], ECE: [22, 17, 28], SV: [3, 1, 6], LN: [1, 0, 3] },
      GG2: { OC: [43, 36, 50], ECE: [42, 35, 49], SV: [9, 5, 13], LN: [6, 2, 11] },
      'GG3-4': { OC: [28, 22, 35], ECE: [39, 31, 47], SV: [20, 12, 28], LN: [13, 6, 21] },
    },
  },
  'T2b/c': {
    '0-4.0': {
      GG1: { OC: [79, 73, 83], ECE: [19, 15, 25], SV: [1, 1, 2], LN: [1, 0, 2] },
      GG2: { OC: [52, 44, 58], ECE: [40, 32, 47], SV: [5, 3, 7], LN: [4, 2, 7] },
      'GG3-4': { OC: [37, 30, 44], ECE: [40, 33, 48], SV: [12, 7, 18], LN: [10, 5, 16] },
    },
    '4.1-6.0': {
      GG1: { OC: [76, 69, 81], ECE: [22, 17, 28], SV: [1, 1, 2], LN: [0, 0, 2] },
      GG2: { OC: [48, 41, 55], ECE: [44, 37, 51], SV: [4, 2, 7], LN: [4, 2, 7] },
      'GG3-4': { OC: [35, 28, 42], ECE: [44, 37, 52], SV: [11, 7, 17], LN: [9, 5, 15] },
    },
    '6.1-10.0': {
      GG1: { OC: [69, 61, 75], ECE: [27, 21, 34], SV: [3, 1, 5], LN: [1, 0, 4] },
      GG2: { OC: [38, 31, 45], ECE: [48, 40, 56], SV: [7, 4, 12], LN: [6, 3, 12] },
      'GG3-4': { OC: [25, 19, 31], ECE: [44, 36, 51], SV: [17, 11, 24], LN: [14, 8, 22] },
    },
    '>10.0': {
      GG1: { OC: [54, 45, 63], ECE: [34, 26, 42], SV: [6, 3, 10], LN: [5, 1, 14] },
      GG2: { OC: [23, 17, 29], ECE: [46, 37, 55], SV: [12, 7, 20], LN: [18, 9, 30] },
      'GG3-4': { OC: [12, 8, 16], ECE: [33, 25, 43], SV: [22, 14, 32], LN: [32, 21, 44] },
    },
  },
};

var PARTIN_CITATION =
  'Tosoian JJ, Chappidi M, Feng Z, et al. BJU Int. 2017;119(5):676-683. DOI: 10.1111/bju.13573 ' +
  '(data per the Johns Hopkins Brady Urological Institute Partin Tables page).';

function partinPsaBin(psa) {
  if (psa <= 4.0) return '0-4.0';
  if (psa <= 6.0) return '4.1-6.0';
  if (psa <= 10.0) return '6.1-10.0';
  return '>10.0';
}

function partinStageKey(clinicalStage) {
  if (clinicalStage === 'T1c') return 'T1c';
  if (clinicalStage === 'T2a') return 'T2a';
  if (clinicalStage === 'T2b' || clinicalStage === 'T2c') return 'T2b/c';
  return null;
}

function partinGradeKey(gradeGroup) {
  if (gradeGroup === 1) return 'GG1';
  if (gradeGroup === 2) return 'GG2';
  if (gradeGroup === 3 || gradeGroup === 4) return 'GG3-4';
  return null;
}

/**
 * @param {{psa:number, clinicalStage:string, gradeGroup:number}} input
 * @returns object with status 'ok' (computed) or 'unsupported' (input combination
 *   not covered by the source table as supplied).
 */
function predictPathologicalStage(input) {
  var stageKey = partinStageKey(input.clinicalStage);
  var gradeKey = partinGradeKey(input.gradeGroup);
  var model = 'Partin Tables (2016 update, Tosoian et al. 2017)';

  if (!stageKey) {
    return {
      status: 'unsupported',
      model: model,
      citation: PARTIN_CITATION,
      reason:
        'The supplied Partin Tables source covers only clinical stages T1c, T2a and T2b/T2c. ' +
        'Stage ' + input.clinicalStage + ' is not in this table.',
      input: input,
    };
  }
  if (!gradeKey) {
    return {
      status: 'unsupported',
      model: model,
      citation: PARTIN_CITATION,
      reason:
        'TODO_VERIFY: the grade group 5 (Gleason 9-10) column of the source table was cut off ' +
        'the supplied PDF page and is not available. Grade groups 1-4 are supported.',
      input: input,
    };
  }

  var psaBin = partinPsaBin(input.psa);
  var cell = PARTIN_TABLE[stageKey][psaBin][gradeKey];
  var note =
    gradeKey === 'GG3-4'
      ? 'Grade groups 3 and 4 are reported as one combined column ("4+3=7 or Gleason score 8") in this source table.'
      : stageKey === 'T2b/c' && input.clinicalStage === 'T2c'
        ? 'T2b and T2c are reported as one combined row in this source table.'
        : null;

  return {
    status: 'ok',
    model: model,
    citation: PARTIN_CITATION,
    psaBin: psaBin,
    organConfined: { value: cell.OC[0], ci: [cell.OC[1], cell.OC[2]] },
    extraprostaticExtension: { value: cell.ECE[0], ci: [cell.ECE[1], cell.ECE[2]] },
    seminalVesicleInvasion: { value: cell.SV[0], ci: [cell.SV[1], cell.SV[2]] },
    lymphNodeInvolvement: { value: cell.LN[0], ci: [cell.LN[1], cell.LN[2]] },
    note: note,
    input: input,
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
 * Coefficients transcribed from Evidencio's CE-marked "User Manual for the
 * Briganti Nomogram" v1.0 (April 2026), Table 2, "Briganti 2019 Nomogram"
 * column (PDF supplied by Dr Puliyath, 06/09/2026) — this is the
 * manufacturer's own reference implementation of the published model.
 * Verified against exact text x/y positions in the source PDF (the table
 * interleaves four Briganti model versions column-by-column, so reading
 * order alone is not reliable).
 *
 * Logistic regression: P = e^(Xβ) / (1 + e^(Xβ)), where
 *   Xβ = intercept
 *      + 0.0416 * PSA (ng/mL)
 *      + clinicalStageAtMpMri: organ-confined = 0 (reference),
 *          extracapsular extension = 1.2214, seminal vesicle invasion = 1.4672
 *      + 0.0311 * maximum lesion diameter at mpMRI (mm)
 *      + biopsyGradeGroup: 1 = 0 (reference), 2 = 0, 3 = 1.2032, 4 = 1.8063, 5 = 1.8063
 *      + 0.0119 * percentage of cores with clinically significant PCa
 *          (grade group >= 2) at systematic biopsy
 *   intercept = -4.5974
 *
 * "Clinical stage at mpMRI" here is the model's own MRI-based staging
 * variable (organ-confined / extracapsular extension / seminal vesicle
 * invasion), not the clinical T-stage used by the Partin Tables — it is
 * derived from the MRI EPE/SVI inputs (SVI takes priority over EPE, since
 * a patient cannot be in both categories).
 *
 * TODO_VERIFY: the source manual states the model's output as "a
 * calculated risk of Lymph Node Involvement as a percentage with one
 * decimal" but does not itself state a recommended probability threshold
 * for offering extended pelvic lymph node dissection — that figure (often
 * cited elsewhere as being in the single-digit percent range) was not
 * found in this document and must not be guessed.
 *
 * @param {{psa:number, gradeGroup:number, maxLesionDiameterMM:number, percentClinicallySignificantCores:number, mriEPE:boolean, mriSVI:boolean}} input
 * @returns object with status 'ok' (computed) or 'unsupported'.
 */
var BRIGANTI_2019_CITATION =
  'Gandaglia G, Ploussard G, Valerio M, et al. Eur Urol. 2019;75(3):506-514. DOI: 10.1016/j.eururo.2018.10.012 ' +
  '(coefficients per Evidencio User Manual for the Briganti Nomogram v1.0, Table 2).';

var BRIGANTI_2019 = {
  intercept: -4.5974,
  psa: 0.0416,
  stage: { organConfined: 0, extracapsularExtension: 1.2214, seminalVesicleInvasion: 1.4672 },
  maxLesionDiameterMM: 0.0311,
  gradeGroup: { 1: 0, 2: 0, 3: 1.2032, 4: 1.8063, 5: 1.8063 },
  percentClinicallySignificantCores: 0.0119,
};

function predictLymphNodeInvasion(input) {
  var model = 'Briganti 2019 nomogram (Gandaglia et al. 2019)';
  var gg = input.gradeGroup;
  if (!(gg >= 1 && gg <= 5)) {
    return {
      status: 'unsupported',
      model: model,
      citation: BRIGANTI_2019_CITATION,
      reason: 'Grade group must be 1-5.',
      input: input,
    };
  }

  var stageCoef = input.mriSVI
    ? BRIGANTI_2019.stage.seminalVesicleInvasion
    : input.mriEPE
      ? BRIGANTI_2019.stage.extracapsularExtension
      : BRIGANTI_2019.stage.organConfined;

  var xBeta =
    BRIGANTI_2019.intercept +
    BRIGANTI_2019.psa * input.psa +
    stageCoef +
    BRIGANTI_2019.maxLesionDiameterMM * input.maxLesionDiameterMM +
    BRIGANTI_2019.gradeGroup[gg] +
    BRIGANTI_2019.percentClinicallySignificantCores * input.percentClinicallySignificantCores;

  var odds = Math.exp(xBeta);
  var probability = odds / (1 + odds);

  return {
    status: 'ok',
    model: model,
    citation: BRIGANTI_2019_CITATION,
    probabilityPercent: Math.round(probability * 1000) / 10,
    thresholdNote:
      'TODO_VERIFY: the source manual does not state a recommended probability threshold for ' +
      'offering extended pelvic lymph node dissection.',
    input: input,
  };
}

/**
 * Positive surgical margin — pre-operative model.
 *
 * Hao Y, Zhang Q, Hang J, Xu L, Zhang S, Guo H. "Development of a
 * Prediction Model for Positive Surgical Margin in Robot-Assisted
 * Laparoscopic Radical Prostatectomy." Curr Oncol. 2022 Dec
 * 6;29(12):9560-9571. DOI: 10.3390/curroncol29120751. PMCID: PMC9776736.
 *
 * All 18 coefficients (17 predictor terms + intercept) below are
 * transcribed from the paper's Table 3, cross-checked two ways: (1) every
 * row's published OR equals exp(published Estimate) to 3 decimals, and
 * (2) the paper's own worked example ("a patient was 70 years old, the
 * ratio of positive needles was 0.5, the histological grade was 3, and
 * the total tumor ratio was 30. The longest diameter of the suspicious
 * nodule was 1.53, the suspicious nodule score was 4, the PSA was 7.55,
 * the location of the suspicious nodule was a transitional zone, and the
 * clinical stages were 2c and above ... a PSM probability of 0.276")
 * reproduces to 0.271 using the formula below — the ~0.005 gap is
 * consistent with the paper's coefficients being published rounded to 3
 * decimals, not a structural mismatch (see models.test.js).
 *
 * Xβ = intercept
 *    + 0.020 * age (years)
 *    + 0.696 * PPN (fraction of biopsy cores positive, 0-1)
 *    + ISUP: 1 = 0 (reference), 2 = 0.260, 3 = 0.630, 4 = 0.846, 5 = 1.243
 *    + 0.017 * PT (percent of biopsy tumor involvement, 0-100 — the sum
 *        of each core's %-tumor, per the paper's definition; distinct
 *        from PPN)
 *    + 0.076 * D (maximal MRI lesion diameter, cm)
 *    + PI-RADS: 1-3 = 0 (reference), 4 = 0.349, 5 = 0.699, negative (no
 *        lesion seen) = -1.358
 *    + 0.026 * PSA (ng/mL)
 *    + T-MRI stage group: <=T2a = 0 (reference), T2b = 0.070,
 *        >=T2c (includes T3a/T3b) = 0.235
 *    + tumor location: mixed = 0 (reference), peripheral = -0.360,
 *        transitional = 0.430, negative (no lesion seen) = 1.357
 *   intercept = -5.203
 *   P = e^(Xβ) / (1 + e^(Xβ))
 *
 * TODO_VERIFY: the paper's calibration discussion mentions "low-risk",
 * "medium-risk" and "high-risk" groups but does not state the numeric
 * probability cut-offs between them anywhere in the text — the UI
 * surfaces the raw probability only, no risk-tier threshold.
 *
 * @param {{age:number, psa:number, gradeGroup:number, clinicalStage:string, maxLesionDiameterMM:number, pirads:string, coresTaken:number, coresPositive:number, percentTumorAcrossCores:number, tumorLocation:string}} input
 * @returns object with status 'ok'.
 */
var PSM_CITATION =
  'Hao Y, Zhang Q, Hang J, Xu L, Zhang S, Guo H. Curr Oncol. 2022;29(12):9560-9571. ' +
  'DOI: 10.3390/curroncol29120751 (Table 3 coefficients).';

var PSM_MODEL = {
  intercept: -5.203,
  age: 0.02,
  ppn: 0.696,
  isup: { 1: 0, 2: 0.26, 3: 0.63, 4: 0.846, 5: 1.243 },
  pt: 0.017,
  diameterCm: 0.076,
  pirads: { low: 0, 4: 0.349, 5: 0.699, negative: -1.358 },
  psa: 0.026,
  tMriGroup: { 1: 0, 2: 0.07, 3: 0.235 },
  tumorLocation: { mixed: 0, peripheral: -0.36, transitional: 0.43, negative: 1.357 },
};

function tMriGroupFromClinicalStage(clinicalStage) {
  if (clinicalStage === 'T1c' || clinicalStage === 'T2a') return 1;
  if (clinicalStage === 'T2b') return 2;
  return 3; // T2c, T3a, T3b: paper defines group 3 as ">= T2c"
}

function predictPositiveSurgicalMargin(input) {
  var model = 'Pre-operative positive surgical margin model (Hao et al. 2022)';
  var gg = input.gradeGroup;
  if (!(gg >= 1 && gg <= 5)) {
    return { status: 'unsupported', model: model, citation: PSM_CITATION, reason: 'Grade group must be 1-5.', input: input };
  }
  var piradsKey = input.pirads === 'negative' ? 'negative' : Number(input.pirads) >= 4 ? String(input.pirads) : 'low';
  var tlKey = PSM_MODEL.tumorLocation.hasOwnProperty(input.tumorLocation) ? input.tumorLocation : null;
  if (!tlKey) {
    return { status: 'unsupported', model: model, citation: PSM_CITATION, reason: 'Unrecognized tumor location.', input: input };
  }

  var ppn = input.coresTaken > 0 ? input.coresPositive / input.coresTaken : 0;
  var diameterCm = input.maxLesionDiameterMM / 10;
  var tMriGroup = tMriGroupFromClinicalStage(input.clinicalStage);

  var xBeta =
    PSM_MODEL.intercept +
    PSM_MODEL.age * input.age +
    PSM_MODEL.ppn * ppn +
    PSM_MODEL.isup[gg] +
    PSM_MODEL.pt * input.percentTumorAcrossCores +
    PSM_MODEL.diameterCm * diameterCm +
    PSM_MODEL.pirads[piradsKey] +
    PSM_MODEL.psa * input.psa +
    PSM_MODEL.tMriGroup[tMriGroup] +
    PSM_MODEL.tumorLocation[tlKey];

  var odds = Math.exp(xBeta);
  var probability = odds / (1 + odds);

  return {
    status: 'ok',
    model: model,
    citation: PSM_CITATION,
    probabilityPercent: Math.round(probability * 1000) / 10,
    note: 'TODO_VERIFY: the source paper does not state numeric cut-offs for its "low/medium/high-risk" groups.',
    input: input,
  };
}

/**
 * Continence recovery — risk tiers (not a validated nomogram).
 *
 * Pinkhasov RM, Lee T, Huang R, et al. "Prediction of Incontinence after
 * Robot-Assisted Radical Prostatectomy: Development and Validation of a
 * 24-Month Incontinence Nomogram." Cancers. 2022;14(7):1644. DOI:
 * 10.3390/cancers14071644. (Supplementary PDF supplied by Dr Puliyath,
 * 06/09/2026: Tables S1-S3 give univariate incontinence-vs-continence
 * rates at 6/12/24 months for 680 men after RARP; Tables S4-S6 give
 * multivariate logistic-regression odds ratios — for social CONTINENCE,
 * not incontinence, confirmed by cross-checking directionality against
 * the raw group sizes in S1-S3 — for age, race, BMI and pre-op erectile
 * function at each timepoint; Figures S1-S2 are the paper's own 6- and
 * 12-month point-based nomograms.)
 *
 * This function is NOT the paper's own nomogram (Figures S1/S2): reading
 * a graphical points-based nomogram's exact per-category point widths
 * and its points-to-risk curve off a rendered PDF figure, without a
 * stated intercept or point-scaling formula in text, is exactly the kind
 * of reading-off-a-picture the "never approximate" rule rules out. What
 * IS exact, published text in the supplementary tables are the
 * multivariate odds ratios below, transcribed directly:
 *
 *              Age >=60 vs <60 (OR for continence)   Pre-op erectile function firm-enough vs not (OR for continence)
 *   6-month:   0.66 (95% CI 0.44-0.99), p=0.04        2.02 (95% CI 1.34-3.04), p<.001
 *   12-month:  0.64 (95% CI 0.32-1.31), p=0.22        1.90 (95% CI 0.92-3.91), p=0.08
 *   24-month:  0.93 (95% CI 0.28-3.05), p=0.90        5.71 (95% CI 1.22-26.81), p=0.03
 *
 * Race (Black vs White, Other vs White) and BMI (>=30 vs <30) were also
 * modelled but did not reach statistical significance at any timepoint in
 * the multivariate analysis (all p>=0.20 for race; p=0.61/0.37/0.05 for
 * BMI) — deliberately excluded from the tiering below, along with race
 * for the additional reason that this tool serves an Indian patient
 * population very different from the study's cohort, where the study's
 * race categories don't transfer and a small, wide-CI subgroup effect
 * from a US cohort is not something to act on here.
 *
 * Because the paper does not publish an intercept, this function cannot
 * compute an exact probability. Instead it counts how many of the two
 * statistically-meaningful adverse factors (age >=60; erectile function
 * not firm enough for penetration) apply, and maps that count to a tier
 * (0 -> early, 1 -> intermediate, 2 -> delayed). That 0/1/2 -> tier
 * mapping is this tool's own simple heuristic, not the paper's — which
 * is exactly why the spec asked this tab be labelled "risk tiers from
 * published predictors, not a validated nomogram."
 *
 * @param {{age:number, erectileFunctionFirm:boolean}} input
 * @returns object with status 'ok'.
 */
var CONTINENCE_CITATION =
  'Pinkhasov RM, Lee T, Huang R, et al. Cancers. 2022;14(7):1644. DOI: 10.3390/cancers14071644 ' +
  '(multivariate odds ratios per the paper\'s supplementary Tables S4-S6).';

var CONTINENCE_ORS = {
  sixMonth: { ageOver60: { or: 0.66, ci: [0.44, 0.99], p: '0.04' }, erectileFirm: { or: 2.02, ci: [1.34, 3.04], p: '<.001' } },
  twelveMonth: { ageOver60: { or: 0.64, ci: [0.32, 1.31], p: '0.22' }, erectileFirm: { or: 1.9, ci: [0.92, 3.91], p: '0.08' } },
  twentyFourMonth: { ageOver60: { or: 0.93, ci: [0.28, 3.05], p: '0.90' }, erectileFirm: { or: 5.71, ci: [1.22, 26.81], p: '0.03' } },
};

// Overall cohort incontinence rate at each timepoint (Tables S1-S3, "Number of patients" row).
var CONTINENCE_COHORT_INCONTINENCE_PERCENT = { sixMonth: 26, twelveMonth: 7, twentyFourMonth: 2 };

function estimateContinenceTier(input) {
  var adverse = 0;
  if (input.age >= 60) adverse += 1;
  if (!input.erectileFunctionFirm) adverse += 1;
  var tier = adverse === 0 ? 'early' : adverse === 1 ? 'intermediate' : 'delayed';

  return {
    status: 'ok',
    model: 'Continence recovery risk tiers (built from Pinkhasov et al. 2022 predictors — not the paper\'s own nomogram)',
    citation: CONTINENCE_CITATION,
    tier: tier,
    adverseFactors: adverse,
    ors: CONTINENCE_ORS,
    cohortIncontinencePercent: CONTINENCE_COHORT_INCONTINENCE_PERCENT,
    note:
      "Tier boundaries (0/1/2 adverse factors -> early/intermediate/delayed) are this tool's own heuristic " +
      'built from the two statistically significant multivariate predictors in the cited paper (age, ' +
      "pre-op erectile function) — not the paper's own point-based nomogram, whose exact intercept and " +
      'point-scaling could not be read reliably from the published figure.',
    input: input,
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
