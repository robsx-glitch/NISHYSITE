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
      options: ['1', '2', '3', '4', '5', 'negative'],
      optionLabels: { negative: 'Negative (no lesion seen)' },
      help: "From your MRI report, the PI-RADS score (1–5) for the most suspicious area, or 'negative' if no suspicious area was seen.",
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
      name: 'maxLesionDiameterMM',
      label: 'MRI: maximum lesion diameter',
      unit: 'mm',
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
      help: "From your MRI report: the size of the largest suspicious area (the one with the highest PI-RADS score, or the largest if more than one shares it).",
    },
    {
      name: 'percentClinicallySignificantCores',
      label: 'Cores with clinically significant cancer',
      unit: '%',
      type: 'number',
      min: 0,
      max: 100,
      step: 0.1,
      help: "From your biopsy report: the percentage of cores containing grade group 2 or higher disease (not just any cancer).",
    },
    {
      name: 'percentTumorAcrossCores',
      label: 'Total tumour involvement across cores',
      unit: '%',
      type: 'number',
      min: 0,
      max: 100,
      step: 0.1,
      help: "From your biopsy report: each core's percentage involved by cancer, summed (sometimes shown as 'total tumour extent' or '% core involvement'). Distinct from the count of positive cores above.",
    },
    {
      name: 'tumorLocation',
      label: 'MRI: location of the suspicious area',
      type: 'select',
      options: ['peripheral', 'transitional', 'mixed', 'negative'],
      optionLabels: { peripheral: 'Peripheral zone', transitional: 'Transitional zone', mixed: 'Mixed', negative: 'Negative (no lesion seen)' },
      help: 'From your MRI report: which part of the prostate the suspicious area was in.',
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
    {
      name: 'erectileFunctionFirm',
      label: 'Pre-op erectile function firm enough for penetration',
      type: 'yesno',
      help: 'Before any treatment: were erections firm enough for penetration, with or without the help of medication.',
    },
  ];

  // ---------------------------------------------------------------------
  // Per-model definitions — feed the dashboard + detail sections on the
  // "Outcome Calculator" tab. Not tabs themselves any more; see NAV_TABS.
  // ---------------------------------------------------------------------
  var MODELS = [
    {
      id: 'stage',
      label: 'Pathological stage',
      requires: ['psa', 'clinicalStage', 'gradeGroup'],
      run: function (v) {
        return models.predictPathologicalStage({
          psa: Number(v.psa),
          clinicalStage: v.clinicalStage,
          gradeGroup: Number(v.gradeGroup),
        });
      },
      reportDetail: function (result) {
        return [
          { label: 'Organ-confined disease', value: preciseStat(result.organConfined) },
          { label: 'Extraprostatic extension', value: preciseStat(result.extraprostaticExtension) },
          { label: 'Seminal vesicle invasion', value: preciseStat(result.seminalVesicleInvasion) },
          { label: 'Lymph node involvement', value: preciseStat(result.lymphNodeInvolvement) },
        ];
      },
    },
    {
      id: 'lni',
      label: 'Lymph node risk',
      requires: ['psa', 'gradeGroup', 'maxLesionDiameterMM', 'percentClinicallySignificantCores', 'mriEPE', 'mriSVI'],
      run: function (v) {
        return models.predictLymphNodeInvasion({
          psa: Number(v.psa),
          gradeGroup: Number(v.gradeGroup),
          maxLesionDiameterMM: Number(v.maxLesionDiameterMM),
          percentClinicallySignificantCores: Number(v.percentClinicallySignificantCores),
          mriEPE: v.mriEPE === 'yes',
          mriSVI: v.mriSVI === 'yes',
        });
      },
      reportDetail: function (result) {
        return [{ label: 'Lymph node involvement', value: result.probabilityPercent + '%' }];
      },
      reportNotes: function (result) {
        return [humanize(result.thresholdNote)];
      },
    },
    {
      id: 'margin',
      label: 'Surgical margin',
      requires: [
        'age',
        'psa',
        'clinicalStage',
        'gradeGroup',
        'pirads',
        'maxLesionDiameterMM',
        'coresTaken',
        'coresPositive',
        'percentTumorAcrossCores',
        'tumorLocation',
      ],
      run: function (v) {
        return models.predictPositiveSurgicalMargin({
          age: Number(v.age),
          psa: Number(v.psa),
          clinicalStage: v.clinicalStage,
          gradeGroup: Number(v.gradeGroup),
          pirads: v.pirads,
          maxLesionDiameterMM: Number(v.maxLesionDiameterMM),
          coresTaken: Number(v.coresTaken),
          coresPositive: Number(v.coresPositive),
          percentTumorAcrossCores: Number(v.percentTumorAcrossCores),
          tumorLocation: v.tumorLocation,
        });
      },
      reportDetail: function (result) {
        return [{ label: 'Positive surgical margin', value: result.probabilityPercent + '%' }];
      },
    },
    {
      id: 'continence',
      label: 'Continence recovery',
      requires: ['age', 'erectileFunctionFirm'],
      run: function (v) {
        return models.estimateContinenceTier({
          age: Number(v.age),
          erectileFunctionFirm: v.erectileFunctionFirm === 'yes',
        });
      },
      reportDetail: function (result) {
        var tierLabel = { early: 'Early', intermediate: 'Intermediate', delayed: 'Delayed' }[result.tier];
        return [{ label: 'Expected continence recovery', value: tierLabel }];
      },
      reportNotes: function (result) {
        return ['sixMonth', 'twelveMonth', 'twentyFourMonth'].map(function (key) {
          var label = { sixMonth: '6-month', twelveMonth: '12-month', twentyFourMonth: '24-month' }[key];
          var or = result.ors[key];
          return (
            label +
            ' cohort incontinence rate ' +
            result.cohortIncontinencePercent[key] +
            '% — age ≥60 OR(continence) ' +
            or.ageOver60.or +
            ' (95% CI ' +
            or.ageOver60.ci[0] +
            '–' +
            or.ageOver60.ci[1] +
            ', p=' +
            or.ageOver60.p +
            '); erectile function firm-enough OR(continence) ' +
            or.erectileFirm.or +
            ' (95% CI ' +
            or.erectileFirm.ci[0] +
            '–' +
            or.erectileFirm.ci[1] +
            ', p=' +
            or.erectileFirm.p +
            ')'
          );
        });
      },
    },
  ];

  var NAV_TABS = [
    { id: 'calculator', label: 'Outcome Calculator' },
    { id: 'how', label: 'How Foresight Works' },
    { id: 'help', label: 'Need Help Filling This Out?' },
  ];

  var state = {
    values: {},
    errors: {},
    activeTab: NAV_TABS[0].id,
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

  function missingFields(model) {
    return model.requires.filter(function (name) {
      var f = fieldByName(name);
      var v = state.values[name];
      return v === undefined || v === '' || !!validate(f, v);
    });
  }

  // ---------------------------------------------------------------------
  // Form rendering
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
          o.textContent = (field.optionLabels && field.optionLabels[opt]) || opt;
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
        render();
      });

      group.appendChild(input);
      group.appendChild(errorEl);
      form.appendChild(group);
    });
    root.appendChild(form);
  }

  function appendEl(parent, tag, className, text) {
    var el = document.createElement(tag);
    el.className = className;
    el.textContent = text;
    parent.appendChild(el);
    return el;
  }

  // Model-source comments use the "TODO_VERIFY:" prefix as an internal flag
  // for what's been checked; strip it before any such note reaches the UI.
  function humanize(text) {
    if (!text) return text;
    var stripped = text.replace(/^TODO_VERIFY:\s*/, '');
    return stripped.charAt(0).toUpperCase() + stripped.slice(1);
  }

  function roundTo5(pct) {
    return Math.round(pct / 5) * 5;
  }

  function patientLabel(pct) {
    if (pct < 1) return 'Less than 1%';
    if (pct < 5) return 'Less than 5%';
    return roundTo5(pct) + '%';
  }

  function plainOdds(pct) {
    if (pct < 1) return 'Uncommon in men with similar findings';
    if (pct >= 95) return 'Expected in almost all men with similar findings';
    var n = Math.max(2, Math.round(100 / pct));
    return 'About 1 in ' + n + ' men with similar findings';
  }

  function preciseStat(stat) {
    return stat.ci ? stat.value + '% (95% CI ' + stat.ci[0] + '–' + stat.ci[1] + '%)' : stat.value + '%';
  }

  var letterheadRootRef = null;
  var tabsRootRef = null;
  var resultsRootRef = null;

  // Letterhead, tabs, and panels all reflect the same state.activeTab, so
  // a click or a field edit re-renders all three together. Letterhead sits
  // above the tabs, which sit above the "Your details" form.
  function render() {
    renderLetterhead();
    renderTabs();
    renderPanels();
  }

  function renderLetterhead() {
    var root = letterheadRootRef;
    if (!root) return;
    root.innerHTML = '';
    root.appendChild(buildLetterhead());
  }

  function renderTabs() {
    var root = tabsRootRef;
    if (!root) return;
    root.innerHTML = '';

    var tablist = document.createElement('div');
    tablist.className = 'fs-tablist';
    tablist.setAttribute('role', 'tablist');
    tablist.setAttribute('aria-label', 'Foresight');

    NAV_TABS.forEach(function (tab) {
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
        render();
        document.getElementById('fs-tab-' + tab.id).focus();
      });
      btn.addEventListener('keydown', function (e) {
        var idx = NAV_TABS.indexOf(tab);
        var next = null;
        if (e.key === 'ArrowRight') next = NAV_TABS[(idx + 1) % NAV_TABS.length];
        if (e.key === 'ArrowLeft') next = NAV_TABS[(idx - 1 + NAV_TABS.length) % NAV_TABS.length];
        if (next) {
          e.preventDefault();
          state.activeTab = next.id;
          render();
          document.getElementById('fs-tab-' + next.id).focus();
        }
      });
      tablist.appendChild(btn);
    });

    root.appendChild(tablist);
  }

  function renderPanels() {
    var root = resultsRootRef;
    if (!root) return;
    root.innerHTML = '';

    var panels = document.createElement('div');
    panels.className = 'fs-panels';

    NAV_TABS.forEach(function (tab) {
      var panel = document.createElement('div');
      panel.className = 'fs-panel';
      panel.id = 'fs-panel-' + tab.id;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', 'fs-tab-' + tab.id);
      if (tab.id !== state.activeTab) panel.hidden = true;

      if (tab.id === 'calculator') panel.appendChild(buildCalculatorPanel());
      else if (tab.id === 'how') panel.appendChild(buildHowItWorksPanel());
      else if (tab.id === 'help') panel.appendChild(buildHelpPanel());

      panels.appendChild(panel);
    });

    root.appendChild(panels);
  }

  // ---------------------------------------------------------------------
  // Outcome Calculator: dashboard cards + anatomy diagram + full detail
  // ---------------------------------------------------------------------
  function dashCard(label, valueNode, subText, muted) {
    var card = document.createElement('div');
    card.className = 'fs-dash-card';
    appendEl(card, 'div', 'fs-dash-card-label', label);
    var valueEl = document.createElement('div');
    valueEl.className = 'fs-dash-card-value' + (muted ? ' fs-dash-card-value--muted' : '');
    if (typeof valueNode === 'string') valueEl.textContent = valueNode;
    else valueEl.appendChild(valueNode);
    card.appendChild(valueEl);
    if (subText) appendEl(card, 'div', 'fs-dash-card-sub', subText);
    return card;
  }

  // Continuous green-to-red gradient by estimated risk. Not a clinical
  // threshold — just a visual cue, since none of the source papers state one.
  function riskColor(pct) {
    if (pct == null || isNaN(pct)) return '#a7b1c2';
    var p = Math.max(0, Math.min(50, pct));
    var hue = 128 - (p / 50) * 128;
    return 'hsl(' + Math.round(hue) + ',60%,42%)';
  }

  function riskChip(pct) {
    var span = document.createElement('span');
    span.className = 'fs-risk-chip';
    span.style.background = riskColor(pct);
    span.textContent = pct + '%';
    return span;
  }

  function buildDashboard(byId) {
    var wrap = document.createElement('div');
    var grid = document.createElement('div');
    grid.className = 'fs-report-dash';

    var stage = byId.stage;
    if (stage.result && stage.result.status === 'ok') {
      var sr = stage.result;
      var stageCard = dashCard(
        'Organ-confined disease',
        sr.organConfined.value + '%',
        'Extraprostatic extension ' +
          sr.extraprostaticExtension.value +
          '% · Seminal vesicle invasion ' +
          sr.seminalVesicleInvasion.value +
          '% · Node involvement ' +
          sr.lymphNodeInvolvement.value +
          '%'
      );
      appendEl(stageCard, 'div', 'fs-plain-odds', plainOdds(sr.organConfined.value) + ' will have organ-confined disease.');
      grid.appendChild(stageCard);
    } else {
      grid.appendChild(dashCard('Organ-confined disease', '—', stage.missing.length ? 'Not completed' : 'Not available for these details', true));
    }

    var lni = byId.lni;
    if (lni.result && lni.result.status === 'ok') {
      var lniCard = dashCard('Lymph node involvement risk', riskChip(lni.result.probabilityPercent), 'Briganti 2019 nomogram *');
      appendEl(lniCard, 'div', 'fs-plain-odds', plainOdds(lni.result.probabilityPercent) + '.');
      grid.appendChild(lniCard);
    } else {
      grid.appendChild(dashCard('Lymph node involvement risk', '—', lni.missing.length ? 'Not completed' : 'Not available', true));
    }

    var margin = byId.margin;
    if (margin.result && margin.result.status === 'ok') {
      var marginCard = dashCard('Positive surgical margin risk', riskChip(margin.result.probabilityPercent), 'Pre-operative model †');
      appendEl(marginCard, 'div', 'fs-plain-odds', plainOdds(margin.result.probabilityPercent) + '.');
      grid.appendChild(marginCard);
    } else {
      grid.appendChild(dashCard('Positive surgical margin risk', '—', margin.missing.length ? 'Not completed' : 'Not available', true));
    }

    var continence = byId.continence;
    if (continence.result && continence.result.status === 'ok') {
      var c = continence.result.cohortIncontinencePercent;
      var statusLabel = { early: 'Early return predicted', intermediate: 'Intermediate recovery expected', delayed: 'Delayed recovery expected' }[
        continence.result.tier
      ];
      grid.appendChild(
        dashCard(
          'Functional recovery trajectory',
          statusLabel,
          'Cohort average continent: ' + (100 - c.sixMonth) + '% at 6mo · ' + (100 - c.twelveMonth) + '% at 12mo · ' + (100 - c.twentyFourMonth) + '% at 24mo'
        )
      );
    } else {
      grid.appendChild(dashCard('Functional recovery trajectory', '—', continence.missing.length ? 'Not completed' : 'Not available', true));
    }

    wrap.appendChild(grid);
    appendEl(
      wrap,
      'p',
      'fs-report-dash-notes',
      '* No published decision threshold for offering extended pelvic lymph node dissection is stated in the source manual — the raw estimated probability is shown instead. ' +
        '† No published numeric risk-tier cut-offs are stated in the source paper — the raw estimated probability is shown instead.'
    );
    return wrap;
  }

  function nerveStyle(spared) {
    if (spared === true) return { stroke: '#2f8a5b', dash: 'none' };
    if (spared === false) return { stroke: '#a7b1c2', dash: '5,4' };
    return { stroke: '#c7cedb', dash: '2,4' };
  }

  function buildAnatomySvg(capsuleColor, svColor, lnColor, nerveLeftSpared, nerveRightSpared) {
    var nl = nerveStyle(nerveLeftSpared);
    var nr = nerveStyle(nerveRightSpared);
    return (
      '<svg class="fs-anatomy-svg" viewBox="0 0 220 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">' +
      '<ellipse cx="110" cy="30" rx="46" ry="22" fill="#dbe6f5" stroke="#9db3cf" stroke-width="2"/>' +
      '<ellipse cx="80" cy="58" rx="15" ry="9" fill="' + svColor + '" stroke="#5a6b85" stroke-width="1.5"/>' +
      '<ellipse cx="140" cy="58" rx="15" ry="9" fill="' + svColor + '" stroke="#5a6b85" stroke-width="1.5"/>' +
      '<circle cx="30" cy="95" r="5" fill="' + lnColor + '"/><circle cx="26" cy="112" r="5" fill="' + lnColor + '"/><circle cx="32" cy="129" r="5" fill="' + lnColor + '"/>' +
      '<circle cx="190" cy="95" r="5" fill="' + lnColor + '"/><circle cx="194" cy="112" r="5" fill="' + lnColor + '"/><circle cx="188" cy="129" r="5" fill="' + lnColor + '"/>' +
      '<line x1="64" y1="82" x2="58" y2="148" stroke="' + nl.stroke + '" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + nl.dash + '"/>' +
      '<line x1="156" y1="82" x2="162" y2="148" stroke="' + nr.stroke + '" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + nr.dash + '"/>' +
      '<circle cx="110" cy="112" r="44" fill="#ffffff" stroke="' + capsuleColor + '" stroke-width="5"/>' +
      '<line x1="110" y1="96" x2="110" y2="188" stroke="#b7c2d6" stroke-width="3" stroke-dasharray="2,3"/>' +
      '</svg>'
    );
  }

  function buildAnatomy(byId) {
    var stage = byId.stage.result && byId.stage.result.status === 'ok' ? byId.stage.result : null;
    var lni = byId.lni.result && byId.lni.result.status === 'ok' ? byId.lni.result : null;

    var capsulePct = stage ? stage.extraprostaticExtension.value : null;
    var svPct = stage ? stage.seminalVesicleInvasion.value : null;
    var lnPct = lni ? lni.probabilityPercent : stage ? stage.lymphNodeInvolvement.value : null;

    var nerveRaw = state.values.nerveSparing;
    var nerveLeft = null;
    var nerveRight = null;
    var nerveCaption = 'Not yet discussed with your surgeon.';
    if (nerveRaw === 'bilateral') {
      nerveLeft = true;
      nerveRight = true;
      nerveCaption = 'Bilateral nerve-sparing planned.';
    } else if (nerveRaw === 'unilateral') {
      nerveLeft = true;
      nerveRight = false;
      nerveCaption = 'Unilateral nerve-sparing planned (this form does not capture which side).';
    } else if (nerveRaw === 'none') {
      nerveLeft = false;
      nerveRight = false;
      nerveCaption = 'No nerve-sparing planned.';
    } else if (nerveRaw === 'undecided') {
      nerveCaption = 'Nerve-sparing plan not yet decided.';
    }

    var wrap = document.createElement('div');
    wrap.className = 'fs-anatomy';
    wrap.innerHTML = buildAnatomySvg(riskColor(capsulePct), riskColor(svPct), riskColor(lnPct), nerveLeft, nerveRight);

    var legend = document.createElement('div');
    legend.className = 'fs-anatomy-legend';

    function row(color, label, valueText) {
      var r = document.createElement('div');
      r.className = 'fs-anatomy-legend-row';
      var sw = document.createElement('span');
      sw.className = 'fs-anatomy-swatch';
      sw.style.background = color;
      r.appendChild(sw);
      appendEl(r, 'span', '', label + (valueText ? ' — ' + valueText : ''));
      legend.appendChild(r);
    }

    row(riskColor(capsulePct), 'Prostate capsule (extraprostatic extension risk)', capsulePct != null ? capsulePct + '%' : 'complete the required fields above');
    row(riskColor(svPct), 'Seminal vesicles (invasion risk)', svPct != null ? svPct + '%' : 'complete the required fields above');
    row(
      riskColor(lnPct),
      'Pelvic lymph nodes (involvement risk)',
      lnPct != null ? lnPct + '%' + (lni ? ' (Briganti 2019)' : stage ? ' (Partin Tables)' : '') : 'complete the required fields above'
    );
    row(nerveLeft === true || nerveRight === true ? '#2f8a5b' : '#a7b1c2', 'Neurovascular bundles', nerveCaption);

    appendEl(legend, 'p', 'fs-anatomy-caption', 'Schematic only, not to scale. Colour shifts from green toward red as the corresponding estimated risk increases.');

    wrap.appendChild(legend);
    return wrap;
  }

  function buildDisclaimer() {
    var box = document.createElement('div');
    box.className = 'fs-disclaimer';
    appendEl(box, 'p', 'fs-disclaimer-head', 'Disclaimer: use under qualified medical supervision only');
    var body = document.createElement('div');
    body.className = 'fs-disclaimer-body';
    appendEl(
      body,
      'p',
      '',
      'This report is an educational, statistical risk-modelling tool intended solely for pre-operative planning and shared clinical discussion. It must be ' +
        'interpreted strictly under the direct supervision of a qualified urologist, uro-oncologist, or licensed medical specialist. The developers, clinicians ' +
        'and authors of Foresight and URObotics assume no legal liability or responsibility for clinical decisions, operative modifications, or patient ' +
        'outcomes resulting from this tool. Calculated probabilities are statistical estimates derived from historical cohorts (Partin Tables, Briganti ' +
        'nomogram, Hao model, Pinkhasov predictors) — derived largely in Western (or, for the surgical margin model, a single Chinese-centre) cohorts whose ' +
        'demographics differ from an Indian patient population — and do not represent diagnostic certainty or guaranteed surgical outcomes. Final ' +
        'intraoperative strategies remain entirely the responsibility of the attending surgeon.'
    );
    appendEl(
      body,
      'p',
      '',
      'The lymph-node and surgical-margin figures above are raw estimated probabilities: neither source publishes a decision threshold for extended ' +
        'lymph node dissection nor numeric cut-offs for its risk groups, so none is imposed here.'
    );
    appendEl(body, 'p', '', 'Data privacy: all computations run client-side in your local browser session; no patient data is stored or transmitted.');
    appendEl(body, 'p', 'fs-disclaimer-citations', 'Tosoian et al. 2017; Gandaglia et al. 2019; Hao et al. 2022; Pinkhasov et al. 2022.');
    box.appendChild(body);
    return box;
  }

  // Shared letterhead: logo + title stay visible on every tab; the
  // clinician/patient-inputs metadata bar only shows on the Outcome
  // Calculator tab, since it's meaningless on the static How/Help tabs.
  // This single header serves both the on-screen page and the printed
  // report (print CSS below just re-sizes it).
  function buildLetterhead() {
    var wrap = document.createElement('div');
    wrap.className = 'fs-letterhead';
    var mark = document.createElement('img');
    mark.src = '../images/foresight-logo.png';
    mark.alt = 'Foresight by URObotics';
    mark.className = 'fs-letterhead-logo';
    wrap.appendChild(mark);
    appendEl(wrap, 'h2', 'fs-letterhead-title', 'Foresight Clarity Report');

    if (state.activeTab === 'calculator') {
      var meta = document.createElement('div');
      meta.className = 'fs-letterhead-meta';
      appendEl(
        meta,
        'div',
        'fs-letterhead-clinician',
        'Clinician: Dr. Nisanth Puliyath, Uro-Oncologist & Robotic Surgeon'
      );
      var badges = document.createElement('div');
      badges.className = 'fs-letterhead-badges';
      [
        ['Age', state.values.age],
        ['PSA', state.values.psa ? state.values.psa + ' ng/mL' : null],
        ['Stage', state.values.clinicalStage],
        ['Grade group', state.values.gradeGroup],
      ].forEach(function (pair) {
        appendEl(badges, 'span', 'fs-badge', pair[0] + ' ' + (pair[1] || '—'));
      });
      meta.appendChild(badges);
      wrap.appendChild(meta);
    }

    return wrap;
  }

  function buildCalculatorPanel() {
    var wrap = document.createElement('div');
    wrap.className = 'fs-report';

    var printBtn = document.createElement('button');
    printBtn.type = 'button';
    printBtn.className = 'btn btn-primary no-print';
    printBtn.textContent = 'Download / print report (PDF)';
    printBtn.addEventListener('click', function () {
      window.print();
    });
    wrap.appendChild(printBtn);
    appendEl(wrap, 'p', 'fs-report-hint no-print', 'Opens your browser’s print dialog — choose “Save as PDF” as the destination to download it.');

    var doc = document.createElement('div');
    doc.className = 'fs-report-doc';

    var byId = {};
    MODELS.forEach(function (model) {
      var missing = missingFields(model);
      byId[model.id] = { missing: missing, result: missing.length ? null : model.run(state.values) };
    });

    doc.appendChild(buildDashboard(byId));
    doc.appendChild(buildAnatomy(byId));

    MODELS.forEach(function (model) {
      var section = document.createElement('div');
      section.className = 'fs-report-section';
      appendEl(section, 'h3', 'fs-report-heading', model.label);

      var missing = byId[model.id].missing;
      if (missing.length) {
        appendEl(
          section,
          'p',
          'fs-report-empty',
          'Not completed — fill in: ' +
            missing
              .map(function (n) {
                var f = fieldByName(n);
                return f ? f.label : n;
              })
              .join(', ')
        );
        doc.appendChild(section);
        return;
      }

      var result = byId[model.id].result;
      if (result.status === 'ok') {
        var list = document.createElement('div');
        list.className = 'fs-report-lines';
        model.reportDetail(result).forEach(function (line) {
          var row = document.createElement('div');
          row.className = 'fs-report-line';
          appendEl(row, 'span', 'fs-report-line-label', line.label);
          appendEl(row, 'span', 'fs-report-line-value', line.value);
          list.appendChild(row);
        });
        section.appendChild(list);
        if (result.note) appendEl(section, 'p', 'fs-report-note', humanize(result.note));
        if (model.reportNotes) {
          model.reportNotes(result).forEach(function (text) {
            appendEl(section, 'p', 'fs-report-note', text);
          });
        }
        appendEl(section, 'p', 'fs-report-source', result.model + ' — ' + result.citation);
      } else {
        appendEl(
          section,
          'p',
          'fs-report-empty',
          result.status === 'unsupported'
            ? 'Not available for this combination of details — not covered by the published data this tool uses.'
            : 'Not yet available.'
        );
      }
      doc.appendChild(section);
    });

    doc.appendChild(buildDisclaimer());

    var footer = document.createElement('div');
    footer.className = 'fs-report-footer';
    footer.innerHTML =
      '<b>Dr. Nisanth Puliyath</b> &middot; Urology &middot; Robotic Uro-Oncology &middot; Kerala, India<br>' +
      'drnishyurology@gmail.com &middot; Foresight is a tool by URObotics. No data entered on this page is stored or transmitted; all calculations run in your browser.';
    doc.appendChild(footer);

    wrap.appendChild(doc);
    return wrap;
  }

  // ---------------------------------------------------------------------
  // How Foresight Works — static, no patient data
  // ---------------------------------------------------------------------
  function buildHowItWorksPanel() {
    var wrap = document.createElement('div');

    var def = document.createElement('div');
    def.className = 'fs-static-section';
    appendEl(def, 'h3', 'fs-static-heading', 'What Foresight is');
    appendEl(
      def,
      'p',
      '',
      'Foresight is a pre-operative statistical outcome-prediction engine. It applies published, peer-reviewed prediction models to the details in your ' +
        'biopsy and MRI report to estimate post-operative risks. It is strictly a statistical calculator — not a 3D anatomical model or a surgical ' +
        'simulation, and nothing it shows is a rendering of your own anatomy.'
    );
    wrap.appendChild(def);

    var targets = document.createElement('div');
    targets.className = 'fs-static-section';
    appendEl(targets, 'h3', 'fs-static-heading', 'Four things it estimates');
    var ol = document.createElement('ol');
    ol.className = 'fs-static-list';
    [
      'Final pathological stage — organ-confined disease vs. extraprostatic extension (EPE) or seminal vesicle invasion (SVI)',
      'Lymph node involvement (LNI) risk',
      'Positive surgical margin (PSM) probability',
      'Post-operative continence recovery trajectory',
    ].forEach(function (t) {
      appendEl(ol, 'li', '', t);
    });
    targets.appendChild(ol);
    wrap.appendChild(targets);

    var process = document.createElement('div');
    process.className = 'fs-static-section';
    appendEl(process, 'h3', 'fs-static-heading', 'How it works, in three steps');
    var steps = document.createElement('div');
    steps.className = 'fs-steps';
    [
      ['Patient-specific input', 'Your pre-op PSA, multiparametric MRI findings, and biopsy grade group.'],
      [
        'Multi-model synthesis',
        'Simultaneous calculation using validated, published nomograms — the Partin Tables, the Briganti nomogram, the Hao positive-margin model, and ' +
          'Pinkhasov’s continence-recovery predictors.',
      ],
      [
        'Pre-op decision support',
        'Objective data to help you and your surgical team discuss nerve-sparing margins, the case for lymphadenectomy, and realistic recovery expectations.',
      ],
    ].forEach(function (pair, i) {
      var step = document.createElement('div');
      step.className = 'fs-step';
      var num = document.createElement('div');
      num.className = 'fs-step-num';
      num.textContent = String(i + 1);
      step.appendChild(num);
      var body = document.createElement('div');
      body.className = 'fs-step-body';
      var b = document.createElement('b');
      b.textContent = pair[0];
      body.appendChild(b);
      var p = document.createElement('p');
      p.style.margin = '0';
      p.textContent = pair[1];
      body.appendChild(p);
      step.appendChild(body);
      steps.appendChild(step);
    });
    process.appendChild(steps);
    wrap.appendChild(process);

    return wrap;
  }

  // ---------------------------------------------------------------------
  // Need Help Filling This Out? — static, mailto action
  // ---------------------------------------------------------------------
  function buildHelpPanel() {
    var wrap = document.createElement('div');

    var intro = document.createElement('div');
    intro.className = 'fs-static-section';
    appendEl(intro, 'h3', 'fs-static-heading', 'Need help filling this out?');
    appendEl(
      intro,
      'p',
      'fs-help-position',
      'Terms like Gleason score / grade group, PI-RADS, and TNM staging can be hard to make sense of from a printed pathology or radiology report — ' +
        'especially while you and your family are still absorbing a new diagnosis.'
    );
    appendEl(
      intro,
      'p',
      'fs-help-position',
      'If you’d rather not work through it alone, send your reports directly to Dr. Nisanth Puliyath, and he will personally review them with you.'
    );
    wrap.appendChild(intro);

    var checklist = document.createElement('div');
    checklist.className = 'fs-static-section';
    appendEl(checklist, 'h3', 'fs-static-heading', 'What to send');
    var ul = document.createElement('ul');
    ul.className = 'fs-help-checklist';
    ['Multiparametric MRI (mpMRI) report', 'Prostate biopsy pathology report', 'Recent serum PSA laboratory results'].forEach(function (t) {
      appendEl(ul, 'li', '', t);
    });
    checklist.appendChild(ul);
    wrap.appendChild(checklist);

    var action = document.createElement('div');
    action.className = 'fs-static-section';
    var mailBtn = document.createElement('a');
    mailBtn.className = 'btn btn-primary';
    var subject = 'Foresight Clinical Data Review - [Patient Name]';
    mailBtn.href = 'mailto:drnishyurology@gmail.com?subject=' + encodeURIComponent(subject);
    mailBtn.textContent = 'Email your reports to Dr Nisanth';
    action.appendChild(mailBtn);
    appendEl(
      action,
      'p',
      'fs-help-confidential',
      'Your records are reviewed directly by Dr. Nisanth Puliyath, under strict physician-patient medical confidentiality.'
    );
    wrap.appendChild(action);

    return wrap;
  }

  function init() {
    var letterheadRoot = document.getElementById('foresight-letterhead');
    var tabsRoot = document.getElementById('foresight-tabs');
    var formRoot = document.getElementById('foresight-form');
    var resultsRoot = document.getElementById('foresight-results');
    if (!letterheadRoot || !tabsRoot || !formRoot || !resultsRoot) return;
    letterheadRootRef = letterheadRoot;
    tabsRootRef = tabsRoot;
    resultsRootRef = resultsRoot;
    renderForm(formRoot);
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
