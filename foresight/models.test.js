/**
 * Plain-Node tests for foresight/models.js. No framework — run with:
 *   node foresight/models.test.js
 *
 * predictPathologicalStage and predictLymphNodeInvasion are implemented
 * from primary-source PDFs Dr Puliyath supplied directly (the Johns
 * Hopkins Partin Tables page, and Evidencio's Briganti Nomogram user
 * manual) — see the citation comments in models.js. Their tests below
 * check worked examples transcribed straight from those documents.
 *
 * predictPositiveSurgicalMargin and estimateContinenceTier still have no
 * primary source supplied, so they remain `{status:'pending'}`; their
 * tests check that pending-response contract instead of a numeric result.
 */

'use strict';

const assert = require('assert');
const {
  predictPathologicalStage,
  predictLymphNodeInvasion,
  predictPositiveSurgicalMargin,
  estimateContinenceTier,
} = require('./models.js');

function assertPendingShape(result, name) {
  assert.strictEqual(result.status, 'pending', `${name} should be pending until verified`);
  assert.strictEqual(typeof result.model, 'string', `${name} must name its model`);
  assert.ok(result.model.length > 0, `${name} model name should not be empty`);
  assert.ok(Array.isArray(result.needed), `${name} must list what is missing`);
  assert.ok(result.needed.length > 0, `${name} needed[] should not be empty`);
  assert.ok(
    result.needed.every((item) => item.includes('TODO_VERIFY')),
    `${name} every needed[] entry should be flagged TODO_VERIFY`
  );
}

// --- Pathological stage (Partin Tables) -----------------------------------
// Worked example transcribed directly from the Johns Hopkins Brady
// Urological Institute Partin Tables PDF: T1c, PSA 0-4.0, Gleason score 6
// (grade group 1) -> OC 92 (90-93), ECE 8 (6-9), SV 1 (0-1), LN 0 (0-0).
{
  const result = predictPathologicalStage({ psa: 3.0, clinicalStage: 'T1c', gradeGroup: 1 });
  assert.strictEqual(result.status, 'ok');
  assert.ok(/Tosoian/.test(result.citation), 'citation should reference Tosoian et al.');
  assert.ok(/10\.1111\/bju\.13573/.test(result.citation), 'citation should include the DOI');
  assert.deepStrictEqual(result.organConfined, { value: 92, ci: [90, 93] });
  assert.deepStrictEqual(result.extraprostaticExtension, { value: 8, ci: [6, 9] });
  assert.deepStrictEqual(result.seminalVesicleInvasion, { value: 1, ci: [0, 1] });
  assert.deepStrictEqual(result.lymphNodeInvolvement, { value: 0, ci: [0, 0] });
}

// A second worked example from the same table: T2b/c, PSA >10.0, grade
// group 2 (Gleason 3+4=7) -> OC 23 (17-29), ECE 46 (37-55), SV 12 (7-20),
// LN 18 (9-30). Checks both the T2b/c combined row and a different PSA bin.
{
  const result = predictPathologicalStage({ psa: 15, clinicalStage: 'T2b', gradeGroup: 2 });
  assert.strictEqual(result.status, 'ok');
  assert.deepStrictEqual(result.organConfined, { value: 23, ci: [17, 29] });
  assert.deepStrictEqual(result.extraprostaticExtension, { value: 46, ci: [37, 55] });
  assert.deepStrictEqual(result.seminalVesicleInvasion, { value: 12, ci: [7, 20] });
  assert.deepStrictEqual(result.lymphNodeInvolvement, { value: 18, ci: [9, 30] });
}

// Coverage limits of the supplied source table: T3a and grade group 5 are
// not in it, and must say so rather than guess.
{
  const stageResult = predictPathologicalStage({ psa: 5, clinicalStage: 'T3a', gradeGroup: 1 });
  assert.strictEqual(stageResult.status, 'unsupported');
  const gradeResult = predictPathologicalStage({ psa: 5, clinicalStage: 'T1c', gradeGroup: 5 });
  assert.strictEqual(gradeResult.status, 'unsupported');
}

// --- Lymph node invasion (Briganti 2019) ----------------------------------
// Worked example computed from the coefficients transcribed from
// Evidencio's Briganti Nomogram user manual (Table 2, "Briganti 2019
// Nomogram" column): intercept -4.5974, PSA coefficient 0.0416, organ
// confined = 0, max lesion diameter coefficient 0.0311, grade group 3
// coefficient 1.2032, %-clinically-significant-cores coefficient 0.0119.
// For PSA=8, organ-confined, 15mm lesion, grade group 3, 40% clinically
// significant cores:
//   Xb = -4.5974 + 0.0416*8 + 0 + 0.0311*15 + 1.2032 + 0.0119*40 = -2.1189
//   P = e^Xb / (1+e^Xb) = 0.10727... -> 10.7%
{
  const result = predictLymphNodeInvasion({
    psa: 8,
    gradeGroup: 3,
    maxLesionDiameterMM: 15,
    percentClinicallySignificantCores: 40,
    mriEPE: false,
    mriSVI: false,
  });
  assert.strictEqual(result.status, 'ok');
  assert.ok(/Gandaglia/.test(result.citation), 'citation should reference Gandaglia et al.');
  assert.ok(/10\.1016\/j\.eururo\.2018\.10\.012/.test(result.citation), 'citation should include the DOI');
  const xBeta = -4.5974 + 0.0416 * 8 + 0 + 0.0311 * 15 + 1.2032 + 0.0119 * 40;
  const expected = Math.round((Math.exp(xBeta) / (1 + Math.exp(xBeta))) * 1000) / 10;
  assert.strictEqual(result.probabilityPercent, expected);
  assert.strictEqual(result.probabilityPercent, 10.7);
}

// Seminal vesicle invasion should outrank extracapsular extension when
// both are flagged (a patient cannot be staged as both at once).
{
  const result = predictLymphNodeInvasion({
    psa: 8,
    gradeGroup: 1,
    maxLesionDiameterMM: 10,
    percentClinicallySignificantCores: 20,
    mriEPE: true,
    mriSVI: true,
  });
  const withSviOnly = predictLymphNodeInvasion({
    psa: 8,
    gradeGroup: 1,
    maxLesionDiameterMM: 10,
    percentClinicallySignificantCores: 20,
    mriEPE: false,
    mriSVI: true,
  });
  assert.strictEqual(result.probabilityPercent, withSviOnly.probabilityPercent);
}

// --- Positive surgical margin ---------------------------------------------
{
  const result = predictPositiveSurgicalMargin({
    psa: 7.1,
    clinicalStage: 'T2a',
    gradeGroup: 2,
  });
  assertPendingShape(result, 'predictPositiveSurgicalMargin');
}

// --- Continence recovery tiers -----------------------------------------
// Built from the multivariate ORs in Pinkhasov et al. 2022 (Cancers
// 14(7):1644), supplementary Tables S4-S6. Not a worked example from the
// paper's own nomogram (see the comment in models.js for why), but the
// ORs embedded in the result are transcribed verbatim from those tables.
{
  const result = estimateContinenceTier({ age: 55, erectileFunctionFirm: true });
  assert.strictEqual(result.status, 'ok');
  assert.ok(/Pinkhasov/.test(result.citation), 'citation should reference Pinkhasov et al.');
  assert.ok(/10\.3390\/cancers14071644/.test(result.citation), 'citation should include the DOI');
  assert.strictEqual(result.tier, 'early');
  assert.strictEqual(result.adverseFactors, 0);
  assert.deepStrictEqual(result.ors.sixMonth.ageOver60, { or: 0.66, ci: [0.44, 0.99], p: '0.04' });
  assert.deepStrictEqual(result.ors.sixMonth.erectileFirm, { or: 2.02, ci: [1.34, 3.04], p: '<.001' });
  assert.deepStrictEqual(result.ors.twentyFourMonth.erectileFirm, { or: 5.71, ci: [1.22, 26.81], p: '0.03' });
}
{
  const result = estimateContinenceTier({ age: 65, erectileFunctionFirm: false });
  assert.strictEqual(result.tier, 'delayed');
  assert.strictEqual(result.adverseFactors, 2);
}
{
  const result = estimateContinenceTier({ age: 65, erectileFunctionFirm: true });
  assert.strictEqual(result.tier, 'intermediate');
  assert.strictEqual(result.adverseFactors, 1);
}

console.log('All foresight/models.js tests passed.');
