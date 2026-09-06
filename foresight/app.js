/**
 * Foresight by URObotics — form state, validation, and tab rendering.
 *
 * Everything here runs client-side only: no fetch calls, no analytics, no
 * localStorage/cookies. All computation happens in the browser and nothing
 * entered on this page is transmitted anywhere.
 */
'use strict';

(function () {
  var models = window.ForesightModels;

  // ---------------------------------------------------------------------
  // Field definitions
  // ---------------------------------------------------------------------
  var FIELDS = [
    {
      name: 'age',
      label: 'Age',
      unit: 'years',
      type: 'number',
      min: 35,
      max: 90,
      step: 1,
      help: 'Your age in years.',
    },
    {
      name: 'psa',
      label: 'PSA',
      unit: 'ng/mL',
      type: 'number',
      min: 0.1,
      max: 100,
      step: 0.1,
      help: 'From your most recent PSA blood test report.',
    },
    {
      name: 'clinicalStage',
      label: 'Clinical T stage',
      type: 'select',
      options: ['T1c', 'T2a', 'T2b', 'T2c', 'T3a', 'T3b'],
      help: "Reported by your urologist after the digital rectal exam and MRI, e.g. 'cT2a'.",
    },
    {
      name: 'gradeGroup',
      label: 'Biopsy ISUP grade group',
      type: 'select',
      options: ['1', '2', '3', '4', '5'],
      help:
        "From your biopsy pathology report, listed as 'Grade Group', or derived from your " +
        'Gleason score (3+3=1, 3+4=2, 4+3=3, 8=4, 9–10=5).',
    },
    {
      name: 'coresTaken',
      label: 'Cores taken',
      unit: 'count',
      type: 'number',
      min: 1,
      max: 30,
      step: 1,
      help: 'From your biopsy report: total number of tissue samples (cores) taken.',
    },
    {
      name: 'coresPositive',
      label: 'Cores positive',
      unit: 'count',
      type: 'number',
      min: 0,
      max: 30,
      step: 1,
      help: 'From your biopsy report: how many of those cores contained cancer.',
    },
    {
      name: 'pirads',
      label: 'MRI PI-RADS score',
      type: 'select',
      options: ['1', '2', '3', '4', '5'],
      help: 'From your MRI report, the PI-RADS score (1–5) for the most suspicious area.',
    },
    {
      name: 'mriEPE',
      label: 'MRI: suspected extracapsular extension',
      type: 'yesno',
      help: "From your MRI report: 'extracapsular extension' or 'ECE' suspected, yes/no.",
    },
    {
      name: 'mriSVI',
      label: 'MRI: suspected seminal vesicle invasion',
      type: 'yesno',
      help: "From your MRI report: 'seminal vesicle invasion' suspected, yes/no.",
    },
    {
      name: 'prostateVolume',
      label: 'Prostate volume',
      unit: 'mL',
      type: 'number',
      min: 10,
      max: 200,
      step: 1,
      help: "From your MRI or ultrasound report, sometimes called 'prostate size'.",
    },
    {
      name: 'membranousUrethralLength',
      label: 'Membranous urethral length',
      unit: 'mm',
      type: 'number',
      min: 0,
      max: 25,
      step: 0.5,
      optional: true,
      help: 'From your MRI report, if measured. Leave blank if it was not reported.',
    },
    {
      name: 'nerveSparing',
      label: 'Planned nerve sparing',
      type: 'select',
      options: ['bilateral', 'unilateral', 'none', 'undecided'],
      help: 'Discussed with your surgeon: how much nerve tissue next to the prostate is planned to be preserved.',
    },
  ];

  var TABS = [
    {
      id: 'stage',
      label: 'Pathological stage',
      requires: ['psa', 'clinicalStage', 'gradeGroup'],
      run: function (v) {
        return models.predictPathologicalStage({
          psa: v.psa,
          clinicalStage: v.clinicalStage,
          gradeGroup: Number(v.gradeGroup),
        });
      },
    },
    {
      id: 'lni',
      label: 'Lymph node risk',
      requires: ['psa', 'clinicalStage', 'gradeGroup', 'coresTaken', 'coresPositive', 'mriEPE', 'mriSVI'],
      run: function (v) {
        return models.predictLymphNodeInvasion({
          psa: v.psa,
          clinicalStage: v.clinicalStage,
          gradeGroup: Number(v.gradeGroup),
          percentPositiveCores: (Number(v.coresPositive) / Number(v.coresTaken)) * 100,
          mriEPE: v.mriEPE === 'yes',
          mriSVI: v.mriSVI === 'yes',
        });
      },
    },
    {
      id: 'margin',
      label: 'Surgical margin',
      requires: ['psa', 'clinicalStage', 'gradeGroup', 'pirads'],
      run: function (v) {
        return models.predictPositiveSurgicalMargin({
          psa: v.psa,
          clinicalStage: v.clinicalStage,
          gradeGroup: Number(v.gradeGroup),
          pirads: Number(v.pirads),
        });
      },
    },
    {
      id: 'continence',
      label: 'Continence recovery',
      requires: ['age', 'prostateVolume', 'nerveSparing'],
      run: function (v) {
        return models.estimateContinenceTier({
          age: Number(v.age),
          membranousUrethralLengthMM:
            v.membranousUrethralLength === '' || v.membranousUrethralLength == null
              ? null
              : Number(v.membranousUrethralLength),
          prostateVolumeML: Number(v.prostateVolume),
          nerveSparing: v.nerveSparing,
        });
      },
    },
  ];

  var state = {
    values: {},
    errors: {},
    activeTab: TABS[0].id,
    audience: 'patient',
  };

  function fieldByName(name) {
    for (var i = 0; i < FIELDS.length; i++) {
      if (FIELDS[i].name === name) return FIELDS[i];
    }
    return null;
  }

  function validate(field, rawValue) {
    if (field.optional && (rawValue === '' || rawValue == null)) return null;
    if (rawValue === '' || rawValue == null) return 'Required.';
    if (field.type === 'number') {
      var n = Number(rawValue);
      if (Number.isNaN(n)) return 'Enter a number.';
      if (field.min != null && n < field.min) return 'Must be at least ' + field.min + '.';
      if (field.max != null && n > field.max) return 'Must be at most ' + field.max + '.';
    }
    if (field.name === 'coresPositive') {
      var taken = Number(state.values.coresTaken);
      var pos = Number(rawValue);
      if (!Number.isNaN(taken) && pos > taken) return 'Cannot exceed cores taken.';
    }
    return null;
  }

  function isTabReady(tab) {
    return tab.requires.every(function (name) {
      var f = fieldByName(name);
      var v = state.values[name];
      return v !== undefined && v !== '' && !validate(f, v);
    });
  }

  function missingFields(tab) {
    return tab.requires.filter(function (name) {
      var f = fieldByName(name);
      var v = state.values[name];
      return v === undefined || v === '' || !!validate(f, v);
    });
  }

  // ---------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------
  function renderForm(root) {
    var form = document.createElement('div');
    form.className = 'fs-form';
    FIELDS.forEach(function (field) {
      var group = document.createElement('div');
      group.className = 'fs-field';

      var labelRow = document.createElement('div');
      labelRow.className = 'fs-label-row';
      var label = document.createElement('label');
      label.setAttribute('for', 'fs-' + field.name);
      label.textContent = field.label + (field.unit ? ' (' + field.unit + ')' : '') + (field.optional ? ' – optional' : '');
      labelRow.appendChild(label);

      var tip = document.createElement('button');
      tip.type = 'button';
      tip.className = 'fs-tip';
      tip.setAttribute('aria-label', 'Where to find this value');
      tip.textContent = '?';
      var tipText = document.createElement('span');
      tipText.className = 'fs-tip-text';
      tipText.textContent = field.help;
      tipText.id = 'fs-tip-' + field.name;
      tip.setAttribute('aria-describedby', tipText.id);
      tip.addEventListener('click', function () {
        tipText.classList.toggle('fs-tip-text--open');
      });
      labelRow.appendChild(tip);
      group.appendChild(labelRow);
      group.appendChild(tipText);

      var input;
      if (field.type === 'select') {
        input = document.createElement('select');
        input.id = 'fs-' + field.name;
        var placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select…';
        input.appendChild(placeholder);
        field.options.forEach(function (opt) {
          var o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          input.appendChild(o);
        });
      } else if (field.type === 'yesno') {
        input = document.createElement('select');
        input.id = 'fs-' + field.name;
        [
          ['', 'Select…'],
          ['no', 'No'],
          ['yes', 'Yes'],
        ].forEach(function (pair) {
          var o = document.createElement('option');
          o.value = pair[0];
          o.textContent = pair[1];
          input.appendChild(o);
        });
      } else {
        input = document.createElement('input');
        input.type = 'number';
        input.id = 'fs-' + field.name;
        input.inputMode = 'decimal';
        if (field.min != null) input.min = String(field.min);
        if (field.max != null) input.max = String(field.max);
        if (field.step != null) input.step = String(field.step);
      }
      input.setAttribute('aria-describedby', tipText.id);

      var errorEl = document.createElement('p');
      errorEl.className = 'fs-error';
      errorEl.id = 'fs-error-' + field.name;
      errorEl.setAttribute('role', 'alert');
      input.setAttribute('aria-invalid', 'false');

      input.addEventListener('input', function () {
        state.values[field.name] = input.value;
        var err = validate(field, input.value);
        state.errors[field.name] = err;
        errorEl.textContent = err || '';
        input.setAttribute('aria-invalid', err ? 'true' : 'false');
        renderResults(resultsRootRef);
      });

      group.appendChild(input);
      group.appendChild(errorEl);
      form.appendChild(group);
    });
    root.appendChild(form);
  }

  function formatPending(tab, result, missing) {
    var wrap = document.createElement('div');
    wrap.className = 'fs-result';

    if (missing.length) {
      var need = document.createElement('p');
      need.className = 'fs-need';
      need.textContent =
        'Fill in: ' +
        missing
          .map(function (n) {
            var f = fieldByName(n);
            return f ? f.label : n;
          })
          .join(', ');
      wrap.appendChild(need);
      return wrap;
    }

    var status = document.createElement('p');
    status.className = 'fs-status fs-status--pending';
    status.textContent = 'Not yet available.';
    wrap.appendChild(status);

    var interp = document.createElement('p');
    interp.className = 'fs-interp';
    interp.textContent =
      state.audience === 'patient'
        ? 'This estimate is not published in a form we can safely calculate yet, so it is left blank rather than guessed.'
        : 'Pending: model coefficients/table values could not be verified against the primary source in this build and are not implemented.';
    wrap.appendChild(interp);

    var modelLine = document.createElement('p');
    modelLine.className = 'fs-model';
    modelLine.textContent = 'Model: ' + result.model;
    wrap.appendChild(modelLine);

    if (state.audience === 'clinician' && result.needed) {
      var ul = document.createElement('ul');
      ul.className = 'fs-needed-list';
      result.needed.forEach(function (item) {
        var li = document.createElement('li');
        li.textContent = item;
        ul.appendChild(li);
      });
      wrap.appendChild(ul);
    }

    var citation = document.createElement('p');
    citation.className = 'fs-citation';
    citation.textContent = result.citation;
    wrap.appendChild(citation);

    var validity = document.createElement('p');
    validity.className = 'fs-validity';
    validity.textContent =
      'External validity: models like this are derived largely in Western cohorts. Indian men often present ' +
      'with higher PSA and grade group at diagnosis, on average, than the cohorts these models were built on.';
    wrap.appendChild(validity);

    return wrap;
  }

  var resultsRootRef = null;

  function renderResults(root) {
    if (!root) return;
    root.innerHTML = '';

    var tablist = document.createElement('div');
    tablist.className = 'fs-tablist';
    tablist.setAttribute('role', 'tablist');
    tablist.setAttribute('aria-label', 'Foresight results');

    var panels = document.createElement('div');
    panels.className = 'fs-panels';

    TABS.forEach(function (tab, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fs-tab';
      btn.id = 'fs-tab-' + tab.id;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-controls', 'fs-panel-' + tab.id);
      btn.setAttribute('aria-selected', tab.id === state.activeTab ? 'true' : 'false');
      btn.tabIndex = tab.id === state.activeTab ? 0 : -1;
      btn.textContent = tab.label;
      btn.addEventListener('click', function () {
        state.activeTab = tab.id;
        renderResults(root);
        document.getElementById('fs-tab-' + tab.id).focus();
      });
      btn.addEventListener('keydown', function (e) {
        var idx = TABS.indexOf(tab);
        var next = null;
        if (e.key === 'ArrowRight') next = TABS[(idx + 1) % TABS.length];
        if (e.key === 'ArrowLeft') next = TABS[(idx - 1 + TABS.length) % TABS.length];
        if (next) {
          e.preventDefault();
          state.activeTab = next.id;
          renderResults(root);
          document.getElementById('fs-tab-' + next.id).focus();
        }
      });
      tablist.appendChild(btn);

      var panel = document.createElement('div');
      panel.className = 'fs-panel';
      panel.id = 'fs-panel-' + tab.id;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', 'fs-tab-' + tab.id);
      if (tab.id !== state.activeTab) panel.hidden = true;

      var missing = missingFields(tab);
      var result = missing.length ? null : tab.run(state.values);
      panel.appendChild(formatPending(tab, result, missing));
      panels.appendChild(panel);
    });

    root.appendChild(tablist);
    root.appendChild(panels);
  }

  function renderAudienceToggle(root) {
    var wrap = document.createElement('div');
    wrap.className = 'fs-audience';
    ['patient', 'clinician'].forEach(function (mode) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fs-audience-btn' + (state.audience === mode ? ' fs-audience-btn--active' : '');
      btn.setAttribute('aria-pressed', state.audience === mode ? 'true' : 'false');
      btn.textContent = mode === 'patient' ? 'Patient view' : 'Clinician view';
      btn.addEventListener('click', function () {
        state.audience = mode;
        renderAudienceToggle(root);
        renderResults(resultsRootRef);
      });
      wrap.appendChild(btn);
    });
    root.innerHTML = '';
    root.appendChild(wrap);
  }

  function init() {
    var formRoot = document.getElementById('foresight-form');
    var resultsRoot = document.getElementById('foresight-results');
    var audienceRoot = document.getElementById('foresight-audience');
    if (!formRoot || !resultsRoot) return;
    resultsRootRef = resultsRoot;
    renderAudienceToggle(audienceRoot);
    renderForm(formRoot);
    renderResults(resultsRoot);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
