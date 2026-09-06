/**
 * Plain-Node tests for foresight/models.js. No framework — run with:
 *   node foresight/models.test.js
 *
 * Every model in this build currently returns `{status:'pending'}` because
 * no coefficient/table/cut-off could be independently verified against a
 * primary source in this session (see the comments in models.js and
 * foresight/README.md). These tests therefore check the *contract* each
 * model must honour (shape of the pending response, required metadata)
 * rather than a numeric worked example. Once a model is filled in with
 * verified coefficients, replace its test here with a worked example from
 * the source paper, per the original build spec.
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
{
  const result = predictPathologicalStage({
    psa: 6.2,
    clinicalStage: 'T1c',
    gradeGroup: 2,
  });
  assertPendingShape(result, 'predictPathologicalStage');
  assert.ok(/Tosoian/.test(result.citation), 'citation should reference Tosoian et al.');
  assert.ok(/10\.1111\/bju\.13573/.test(result.citation), 'citation should include the DOI');
}

// --- Lymph node invasion (Briganti 2019) ----------------------------------
{
  const result = predictLymphNodeInvasion({
    psa: 8.5,
    clinicalStage: 'T2b',
    gradeGroup: 3,
    percentPositiveCores: 40,
    mriEPE: false,
    mriSVI: false,
  });
  assertPendingShape(result, 'predictLymphNodeInvasion');
  assert.ok(/Gandaglia/.test(result.citation), 'citation should reference Gandaglia et al.');
  assert.ok(/10\.1016\/j\.eururo\.2018\.10\.012/.test(result.citation), 'citation should include the DOI');
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

// --- Continence recovery tiers ---------------------------------------------
{
  const result = estimateContinenceTier({
    age: 62,
    membranousUrethralLengthMM: 16,
    prostateVolumeML: 40,
    nerveSparing: 'bilateral',
  });
  assertPendingShape(result, 'estimateContinenceTier');
  assert.ok(/CHECK-MUL/.test(result.citation), 'citation should reference the CHECK-MUL study');
}

// --- Every model echoes its input back for debugging ----------------------
{
  const input = { psa: 5 };
  const result = predictPathologicalStage(input);
  assert.deepStrictEqual(result.input, input, 'model should echo the input it was given');
}

console.log('All foresight/models.js contract tests passed.');
