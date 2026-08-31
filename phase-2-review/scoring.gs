/**
 * المرحلة ٢ب — الخطوة ٦: تقييم البربوزل على الروبريك
 *
 * المودل يقترح درجات. **الكود هو اللي يحكم.**
 *
 * كل درجة تمر على تحقق برمجي قبل ما تُحتسب:
 *   - الاقتباس لازم يكون موجوداً حرفياً في نص البربوزل. المودل يقدر
 *     يهلوس اقتباساً، والكود يقدر يتأكد، فيتأكد. اقتباس ما ينوجد =
 *     الدرجة تسقط إلى "غير قابل للتقييم".
 *   - معيار حاجب على "ضعيف" يرفض البربوزل مهما كان المجموع.
 *   - المعيار السادس ينعطّل لو ورقة الأرقام فاضية، وما يُخمَّن.
 *
 * ما فيه في هذا الملف أي مسار يرسل شيئاً للفريق. المخرج مسودة للقائد.
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// ============================================================
// البرومبت
// ============================================================

function levelsBlock_(c) {
  if (c.checklist) {
    return 'قائمة فحص، مو سلّم ثلاثي. البنود:\n' +
           c.checklist.map(function (x) { return '      - ' + x; }).join('\n') +
           '\n    كل البنود سليمة = "قوي". أي بند ساقط = "ضعيف". ما فيه "مقبول" هنا.' +
           (c.knownTrap ? '\n    تنبيه: ' + c.knownTrap : '');
  }
  let s = '    ضعيف: ' + c.weak + '\n    مقبول: ' + c.ok + '\n    قوي: ' + c.strong;
  if (c.note)     s += '\n    ملاحظة: ' + c.note;
  if (c.autoWeak) s += '\n    ⛔ ' + c.autoWeak;
  return s;
}

function buildScoringSystemPrompt(figures) {
  const criteriaText = RUBRIC.criteria.map(function (c) {
    if (c.requiresFigures && !figures.available) {
      return '[' + c.id + '] ' + c.name + ' — **معطّل في هذه المراجعة**.\n' +
             '    ورقة الأرقام المركزية غير متاحة، فما فيه مرجع تُقارن به الأرقام.\n' +
             '    أعطِ "غير قابل للتقييم" وسبباً يقول إن الورقة غير متاحة.\n' +
             '    لا تخترع أرقاماً ولا تحكم على صحتها من معرفتك.';
    }
    return '[' + c.id + '] ' + c.name +
           ' — الوزن ' + c.weight + (c.blocking ? ' — ⛔ معيار حاجب' : '') + '\n' +
           levelsBlock_(c);
  }).join('\n\n');

  let prompt =
'أنت مراجع في لجنة إدارة المشاريع بنادي تقنية المستقبل، جامعة الملك سعود.\n' +
'مهمتك تقييم بروفايل رعاية على روبريك ثابت.\n\n' +

'## قواعد ملزمة\n\n' +

'١. **كل درجة لازم يرافقها اقتباس حرفي من البربوزل.** انسخ النص كما هو،\n' +
'   حرفاً بحرف، بدون تلخيص ولا إعادة صياغة ولا تصحيح إملائي. الاقتباس\n' +
'   بيُطابَق برمجياً مع نص الوثيقة، واقتباس ما ينوجد يسقّط الدرجة.\n' +
'   ما لقيت اقتباساً يبرر الدرجة؟ أعطِ "غير قابل للتقييم".\n\n' +

'٢. **لو ما أنت متأكد، أعطِ "غير قابل للتقييم" مع السبب.** لا تخمّن.\n' +
'   التخمين أسوأ من الامتناع، لأن اللجنة بتبني عليه قراراً.\n\n' +

'٣. **المعيار هو الروبريك، مو أي وثيقة سابقة.**\n' +
'   لا تعامل بروفايل فنتك ولا قِوام كنموذج يُحتذى. ولا وحدة منهما تعدي\n' +
'   هذا الروبريك. الاستثناء الوحيد: فنتك أخذ "قوي" في معيار الخط الزمني\n' +
'   [٣] فقط، فينفع مثالاً على مستوى "قوي" في ذلك المعيار وحده.\n' +
'   فنتك ضعيف في محتوى البرنامج والباقات والهوية والدقة. لا تقلّده فيها.\n\n' +

'٤. **لا تكافئ النية ولا الطموح.** الروبريك يقيس ما هو مكتوب في الوثيقة،\n' +
'   مو ما ينوي الفريق عمله.\n\n' +

'## الروبريك\n\n' + criteriaText + '\n\n' +

'## المستويات\n\n' +
'ضعيف = ٠، مقبول = ١، قوي = ٢. الدرجة النهائية = المستوى × وزن المعيار.\n\n' +

'لكل معيار أعطِ: المستوى، الاقتباس الحرفي، إصلاحاً واحداً محدداً وقابلاً\n' +
'للتنفيذ، وسبباً مختصراً. الإصلاح يكون أمراً ينفّذه الفريق، مو ملاحظة عامة.\n\n' +

'أرسل النتيجة عبر الأداة submit_rubric_scores، معياراً معياراً، بترتيب الأرقام.';

  if (figures.available) {
    prompt += '\n\n## ورقة الأرقام المركزية (مرجع المعيار ٦)\n\n' +
      'هذي هي الأرقام المعتمدة. أي رقم في البربوزل يخالفها = ضعيف تلقائياً.\n\n' +
      figuresAsText(figures);
  }

  return prompt;
}

function scoringToolSchema_() {
  return {
    name: 'submit_rubric_scores',
    description: 'يرسل درجة كل معيار في الروبريك مع اقتباسه المبرِّر.',
    strict: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['criteria'],
      properties: {
        criteria: {
          type: 'array',
          description: 'ثمانية عناصر، بترتيب معرّفات المعايير ١ إلى ٨.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'level', 'quote', 'fix', 'reason'],
            properties: {
              id:     { type: 'integer', description: 'رقم المعيار ١ إلى ٨' },
              level:  { type: 'string',
                        enum: ['ضعيف', 'مقبول', 'قوي', 'غير قابل للتقييم'] },
              quote:  { type: 'string',
                        description: 'اقتباس حرفي من البربوزل. فاضي فقط مع "غير قابل للتقييم".' },
              fix:    { type: 'string', description: 'إصلاح واحد محدد وقابل للتنفيذ' },
              reason: { type: 'string', description: 'سبب مختصر للدرجة' }
            }
          }
        }
      }
    }
  };
}

// ============================================================
// نداء الـAPI
// ============================================================

function anthropicKey_() {
  const key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!key) {
    throw new Error('ANTHROPIC_API_KEY غير معرّف. ' +
      'Project Settings > Script Properties، وأضف المفتاح هناك. لا تكتبه في الكود.');
  }
  return key;
}

/**
 * نداء واحد مع تراجع أسّي على ٤٢٩ و٥xx.
 * المفتاح في Script Properties، ما ينكتب في الكود ولا في الشيت.
 */
function callAnthropic_(payload) {
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': anthropicKey_(),
      'anthropic-version': ANTHROPIC_VERSION,
      'anthropic-beta': 'server-side-fallback-2026-07-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  let lastError = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) Utilities.sleep(Math.pow(2, attempt) * 1000);

    const res  = UrlFetchApp.fetch(ANTHROPIC_URL, options);
    const code = res.getResponseCode();
    const body = res.getContentText();

    if (code === 200) return JSON.parse(body);

    lastError = 'HTTP ' + code + ': ' + body.slice(0, 400);
    if (code !== 429 && code < 500) break;   // ٤٠٠ ما ينصلح بالإعادة
  }
  throw new Error('فشل نداء Anthropic بعد المحاولات. ' + lastError);
}

function scoringRequestPayload_(proposalName, proposalSize, text, figures) {
  return {
    model: CONFIG_2.ANTHROPIC_MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: CONFIG_2.SCORING_EFFORT },
    fallbacks: 'default',
    system: buildScoringSystemPrompt(figures),
    tools: [scoringToolSchema_()],
    tool_choice: { type: 'tool', name: 'submit_rubric_scores' },
    messages: [{
      role: 'user',
      content: 'قيّم هذا البربوزل على الروبريك.\n\n' +
               'اسم المشروع: ' + proposalName + '\n' +
               'الحجم المعتمد: ' + proposalSize + '\n\n' +
               '=== نص البربوزل ===\n' + text
    }]
  };
}

function scoringItemsFromResponse_(response, text, figures) {
  if (response.stop_reason === 'refusal') {
    throw new Error('المودل امتنع عن الرد على هذا البربوزل. ' +
      'راجعه يدوياً. ' + JSON.stringify(response.stop_details || {}));
  }

  const toolUse = (response.content || []).filter(function (block) {
    return block.type === 'tool_use' && block.name === 'submit_rubric_scores';
  })[0];

  if (!toolUse) {
    throw new Error('المودل ما أرسل الدرجات عبر الأداة. stop_reason: ' +
                    response.stop_reason);
  }
  return validateScoring(toolUse.input.criteria, text, figures);
}

// ============================================================
// التحقق — هنا الكود يحكم على مخرج المودل
// ============================================================

/** يوحّد النص قبل مطابقة الاقتباس: مسافات، تطويل، وأشكال الألف والياء */
function normalizeForQuote_(s) {
  return String(s || '')
    .replace(/ـ/g, '')                    // تطويل
    .replace(/[ً-ْ]/g, '')           // تشكيل
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[""'']/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function quoteIsVerbatim_(quote, proposalText) {
  const q = normalizeForQuote_(quote);
  if (q.length < 10) return false;             // اقتباس أقصر من هذا ما يبرر شيئاً
  return normalizeForQuote_(proposalText).indexOf(q) !== -1;
}

/**
 * يحوّل مخرج المودل إلى بنود مُتحقَّق منها.
 * كل بند: { criterion, level, score, quote, fix, reason, assessed, rejectedQuote }
 */
function validateScoring(modelCriteria, proposalText, figures) {
  const byId = {};
  (modelCriteria || []).forEach(function (c) { byId[c.id] = c; });

  return RUBRIC.criteria.map(function (crit) {
    const raw = byId[crit.id] || {};
    const item = {
      criterion: crit,
      level:  String(raw.level  || '').trim(),
      quote:  String(raw.quote  || '').trim(),
      fix:    String(raw.fix    || '').trim(),
      reason: String(raw.reason || '').trim(),
      score: null, assessed: false, rejectedQuote: false, disabled: false
    };

    // المعيار السادس معطّل بلا ورقة أرقام — ما ينحسب مهما قال المودل
    if (crit.requiresFigures && !figures.available) {
      item.level    = NOT_ASSESSABLE;
      item.disabled = true;
      item.reason   = figures.reason;
      item.fix      = 'عبّي ورقة الأرقام المركزية، ثم أعد التقييم.';
      return item;
    }

    if (!raw.id || item.level === NOT_ASSESSABLE || !item.level) {
      item.level = NOT_ASSESSABLE;
      if (!item.reason) item.reason = 'المودل ما أعطى تقييماً لهذا المعيار.';
      return item;
    }

    if (!rubricLevelAllowed_(crit, item.level)) {
      item.level = NOT_ASSESSABLE;
      item.reason = 'المستوى غير صالح لهذا المعيار.';
      return item;
    }

    // القاعدة ١: بلا اقتباس حرفي، الدرجة ما تُحتسب
    if (!quoteIsVerbatim_(item.quote, proposalText)) {
      item.rejectedQuote = true;
      item.reason = 'الاقتباس المرفق ما انوجد حرفياً في البربوزل، فالدرجة ما احتُسبت. ' +
                    (item.reason ? 'سبب المودل: ' + item.reason : '');
      item.level = NOT_ASSESSABLE;
      return item;
    }

    const levelScore = { 'ضعيف': 0, 'مقبول': 1, 'قوي': 2 };
    if (levelScore[item.level] === undefined) {
      item.level = NOT_ASSESSABLE;
      item.reason = 'مستوى غير معروف من المودل.';
      return item;
    }

    item.score    = levelScore[item.level] * crit.weight;
    item.assessed = true;
    return item;
  });
}

// ============================================================
// القرار
// ============================================================

/**
 * القرار من الروبريك حرفياً، مع سقف واحد مضاف:
 *
 * ما دام معيار **حاجب** غير مُقيَّم (معطّل، أو اقتباسه سقط، أو المودل
 * امتنع) فالنتيجة ما تقدر تكون "معتمد". نفس قاعدة T3 في المرحلة ٢أ:
 * معيار حاجب ما انفحص لا يُعامل معاملة الناجح.
 */
function computeRubricDecision(items) {
  const blockingWeak = items.filter(function (i) {
    return i.criterion.blocking && i.assessed && i.level === 'ضعيف';
  });

  const blockingUnassessed = items.filter(function (i) {
    return i.criterion.blocking && !i.assessed;
  });

  const unassessed = items.filter(function (i) { return !i.assessed; });

  const total = items.reduce(function (a, i) {
    return a + (i.assessed ? i.score : 0);
  }, 0);

  const effectiveMax = items.reduce(function (a, i) {
    return a + (i.assessed ? i.criterion.weight * 2 : 0);
  }, 0);

  let decision;
  if (blockingWeak.length) {
    decision = RUBRIC.decisions.RESUBMIT;
  } else if (total >= RUBRIC.thresholds.approved) {
    decision = RUBRIC.decisions.APPROVED;
  } else if (total >= RUBRIC.thresholds.conditional) {
    decision = RUBRIC.decisions.CONDITIONAL;
  } else {
    decision = RUBRIC.decisions.RESUBMIT;
  }

  // السقف: معيار حاجب ما انفحص يمنع "معتمد"
  let capped = false;
  if (decision === RUBRIC.decisions.APPROVED && blockingUnassessed.length) {
    decision = RUBRIC.decisions.CONDITIONAL;
    capped = true;
  }

  return {
    total: total,
    effectiveMax: effectiveMax,
    maxTotal: RUBRIC.maxTotal,
    decision: decision,
    capped: capped,
    blockingWeak: blockingWeak.map(function (i) { return i.criterion; }),
    blockingUnassessed: blockingUnassessed.map(function (i) { return i.criterion; }),
    unassessedCount: unassessed.length
  };
}

// ============================================================
// التشغيل
// ============================================================

/**
 * يقيّم آخر بربوزل للمشروع ويرسل المسودة **لقائد اللجنة فقط**.
 * ما فيه في هذي الدالة ولا في اللي تناديها أي نداء يرسل للفريق.
 */
function scoreProposal(projectId) {
  rubricSelfCheck();

  const proposal = latestProposalFor(projectId);
  if (!proposal) throw new Error('ما فيه بربوزل مرفوع لهذا المشروع.');
  if (proposal.state !== PROPOSAL_STATE.RECEIVED &&
      proposal.state !== PROPOSAL_STATE.SCORED) {
    throw new Error('حالة البربوزل "' + proposal.state + '" ما تسمح بإعادة التقييم.');
  }

  const text    = readProposalText(proposal.textFileId);
  const figures = loadCentralFigures();

  const warning = figuresWarning(figures);
  if (warning) Logger.log('⚠️ ' + warning);

  const response = callAnthropic_(
    scoringRequestPayload_(proposal.name, proposal.size, text, figures));
  const items    = scoringItemsFromResponse_(response, text, figures);
  const outcome  = computeRubricDecision(items);

  // إعادة التقييم محاولة مراجعة مستقلة. إبقاء نفس المعرّف كان يضيف ثمانية
  // صفوف أخرى إلى نفس المراجعة ويجعل شاشة القائد ملتبسة.
  if (proposal.state === PROPOSAL_STATE.SCORED) {
    proposal.reviewId = nextReviewId(proposal.projectId, '2B');
    const proposalSheet = proposalsSheet();
    proposalSheet.getRange(proposal.rowNumber, proposalCol('reviewId')).setValue(proposal.reviewId);
    proposalSheet.getRange(proposal.rowNumber, proposalCol('lead')).setValue('');
    proposalSheet.getRange(proposal.rowNumber, proposalCol('leadReason')).setValue('');
  }

  saveScoring_(proposal, items, outcome, figures, response);
  emailLeadScoringDraft_(proposal, items, outcome, figures);

  return { items: items, outcome: outcome, figures: figures };
}

function saveScoring_(proposal, items, outcome, figures, response) {
  const sheet = proposalsSheet();
  sheet.getRange(proposal.rowNumber, proposalCol('state')).setValue(PROPOSAL_STATE.SCORED);
  sheet.getRange(proposal.rowNumber, proposalCol('score')).setValue(outcome.total);
  sheet.getRange(proposal.rowNumber, proposalCol('computed')).setValue(outcome.decision);

  logReview({
    reviewId:         proposal.reviewId,
    projectId:        proposal.projectId,
    projectName:      proposal.name,
    stage:            '2ب',
    size:             proposal.size,
    score:            outcome.total,
    maxScore:         outcome.effectiveMax,
    computedDecision: outcome.decision,
    blockingFailed:   outcome.blockingWeak.length,
    warnings:         outcome.capped ? 1 : 0,
    disabled:         outcome.unassessedCount,
    items: items.map(function (i) {
      return {
        code:     'معيار ' + i.criterion.id,
        name:     i.criterion.name,
        blocking: i.criterion.blocking,
        result:   i.level,
        score:    i.assessed ? i.score : null,
        detail:   i.reason,
        quote:    i.quote,
        fix:      i.fix
      };
    })
  });
}

// ============================================================
// مسودة القائد — مخرج الخطوة ٦ وبداية مسار المراجعة
//
// الفريق ما يستلم شيئاً من هنا. التعديل والإرسال محصوران في review.gs
// ولا يبدأان إلا باختيار القائد قراره النهائي في الشيت.
// ============================================================

const LEVEL_STYLE = {
  'قوي':              { bg: '#ecfdf3', fg: '#1a7f37' },
  'مقبول':            { bg: '#fffaeb', fg: '#b54708' },
  'ضعيف':             { bg: '#fef3f2', fg: '#b42318' },
  'غير قابل للتقييم': { bg: '#f2f4f7', fg: '#667085' }
};

function scoreCardHtml_(items) {
  let html = '<table dir="rtl" style="border-collapse:collapse;width:100%;font-size:13px">' +
    '<tr style="background:#f2f4f7">' +
    ['المعيار', 'الوزن', 'المستوى', 'الدرجة', 'الاقتباس', 'الإصلاح المقترح']
      .map(function (h) {
        return '<th style="padding:8px;border:1px solid #d0d5dd;text-align:right">' + h + '</th>';
      }).join('') + '</tr>';

  items.forEach(function (i) {
    const st = LEVEL_STYLE[i.level] || LEVEL_STYLE['غير قابل للتقييم'];
    html += '<tr>' +
      '<td style="padding:8px;border:1px solid #d0d5dd">' +
        i.criterion.id + '. ' + i.criterion.name +
        (i.criterion.blocking ? ' <b style="color:#b42318">⛔</b>' : '') + '</td>' +
      '<td style="padding:8px;border:1px solid #d0d5dd;text-align:center">' +
        i.criterion.weight + '</td>' +
      '<td style="padding:8px;border:1px solid #d0d5dd;background:' + st.bg +
        ';color:' + st.fg + ';font-weight:bold;white-space:nowrap">' + i.level + '</td>' +
      '<td style="padding:8px;border:1px solid #d0d5dd;text-align:center">' +
        (i.assessed ? i.score + ' / ' + (i.criterion.weight * 2) : '—') + '</td>' +
      '<td style="padding:8px;border:1px solid #d0d5dd;font-style:italic">' +
        (i.quote ? '«' + i.quote + '»' : '—') +
        (i.rejectedQuote
          ? '<br><b style="color:#b42318">اقتباس غير موجود في الوثيقة — الدرجة أُسقطت</b>'
          : '') + '</td>' +
      '<td style="padding:8px;border:1px solid #d0d5dd">' + (i.fix || '—') +
        (i.reason ? '<br><span style="color:#475467;font-size:12px">' + i.reason + '</span>' : '') +
      '</td></tr>';
  });

  return html + '</table>';
}

function emailLeadScoringDraft_(proposal, items, outcome, figures) {
  const banner = {
    'معتمد':          { bg: '#ecfdf3', fg: '#1a7f37' },
    'معتمد بتعديلات': { bg: '#fffaeb', fg: '#b54708' },
    'إعادة تقديم':    { bg: '#fef3f2', fg: '#b42318' }
  }[outcome.decision];

  let body =
    '<p><b>مسودة تقييم — ' + proposal.name + '</b> (' + proposal.projectId + ')</p>' +

    '<p style="background:#eff8ff;border-right:4px solid #175cd3;padding:12px;border-radius:6px">' +
    '<b>هذي مسودة، ما وصلت الفريق.</b> راجعها وعدّل أي درجة قبل الإرسال.' +
    '</p>' +

    '<p style="background:' + banner.bg + ';color:' + banner.fg +
    ';padding:14px;border-radius:8px;font-size:18px;font-weight:bold;margin:16px 0">' +
    outcome.decision + ' — ' + outcome.total + ' من ' + outcome.effectiveMax +
    (outcome.effectiveMax !== outcome.maxTotal
      ? ' <span style="font-size:13px;font-weight:normal">(الروبريك الكامل ' +
        outcome.maxTotal + '، ونقص لأن معايير ما انفحصت)</span>' : '') +
    '</p>';

  if (outcome.blockingWeak.length) {
    body += '<p style="background:#fef3f2;padding:12px;border-radius:6px">' +
      '<b>⛔ رفض حاجب.</b> معيار حاجب أو أكثر جاء "ضعيف": ' +
      outcome.blockingWeak.map(function (c) { return c.id + '. ' + c.name; }).join('، ') +
      '. الروبريك يرفض الوثيقة بغض النظر عن المجموع.</p>';
  }

  if (outcome.capped) {
    body += '<p style="background:#fffaeb;padding:12px;border-radius:6px">' +
      '<b>سقف مطبّق.</b> المجموع يكفي لـ"معتمد"، لكن معياراً حاجباً ما انفحص: ' +
      outcome.blockingUnassessed.map(function (c) { return c.id + '. ' + c.name; }).join('، ') +
      '. معيار حاجب ما انفحص لا يُعامل معاملة الناجح، فالنتيجة نزلت ' +
      'إلى "معتمد بتعديلات". نفس قاعدة T3 في المرحلة ٢أ.</p>';
  }

  const fw = figuresWarning(figures);
  if (fw) {
    body += '<p style="background:#fffaeb;border-right:4px solid #b54708;padding:12px;' +
            'border-radius:6px"><b>⚠️ ' + fw + '</b></p>';
  }

  body += scoreCardHtml_(items);

  const rejected = items.filter(function (i) { return i.rejectedQuote; });
  if (rejected.length) {
    body += '<p style="background:#fef3f2;padding:12px;border-radius:6px">' +
      '<b>' + rejected.length + ' درجة أُسقطت</b> لأن اقتباسها ما انوجد حرفياً في ' +
      'البربوزل. المودل يقدر يهلوس اقتباساً، والكود يطابقه بالنص الفعلي ' +
      'ويسقّط اللي ما ينطابق. راجع هذي المعايير يدوياً.</p>';
  }

  body += '<hr><p><b>طريقة المراجعة والإرسال:</b></p>' +
          '<ol>' +
          '<li>افتح شيت "' + CONFIG_2.SHEETS.CRITERION_LOG + '". اترك "نتيجة القائد" ' +
          'فاضية لاعتماد درجة المودل، أو اختر مستوى آخر لتعديلها. الدرجة تُحسب تلقائياً.</li>' +
          '<li>لو عدّلت اقتباساً أو إصلاحاً، عدّل خليته قبل الإرسال. كل درجة نهائية تحتاج ' +
          'اقتباساً حرفياً موجوداً في البربوزل.</li>' +
          '<li>افتح شيت "' + CONFIG_2.SHEETS.PROPOSALS + '". اكتب "سبب قرار القائد" ' +
          'إذا تغيّر القرار، ثم اختر "قرار القائد". <b>اختيار القرار يرسل للفريق فوراً.</b></li>' +
          '</ol>' +
          '<p><a href="' + SpreadsheetApp.getActiveSpreadsheet().getUrl() + '">افتح شاشة المراجعة</a></p>' +
          '<p>' + CONFIG_2.COMMITTEE_NAME + '</p>';

  MailApp.sendEmail({
    to: CONFIG_2.LEAD_EMAIL,
    subject: '[مسودة تقييم] ' + proposal.name + ' — ' + outcome.decision +
             ' (' + outcome.total + '/' + outcome.effectiveMax + ')',
    htmlBody: wrapRtl_(body)
  });
}

/** من القائمة: يقيّم آخر بربوزل مستلم لم يُقيَّم بعد */
function scoreLatestProposal() {
  const ui = SpreadsheetApp.getUi();
  const sheet = proposalsSheet();
  const last  = sheet.getLastRow();
  if (last < 2) { ui.alert('ما فيه بربوزلات مرفوعة.'); return; }

  const rows = sheet.getRange(2, 1, last - 1, proposalWidth_()).getValues();
  for (let i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i][proposalCol('state') - 1]) !== PROPOSAL_STATE.RECEIVED) continue;
    const pid = String(rows[i][proposalCol('projectId') - 1]);
    const r = scoreProposal(pid);
    ui.alert('تم تقييم ' + pid + '\n\n' +
             r.outcome.decision + ' — ' + r.outcome.total + ' من ' + r.outcome.effectiveMax +
             '\n\nالمسودة راحت لقائد اللجنة. الفريق ما استلم شيئاً.');
    return;
  }
  ui.alert('ما فيه بربوزل مستلم بانتظار التقييم.');
}
