/**
 * المرحلة ٢ — هوية المشروع والربط بسجل المرحلة ١
 *
 * معرّف المشروع يُولَّد لحظة تسليم فورم الاستلام (المرحلة ١) ويوصل الفريق
 * في إيميل الاستلام. الفريق يكتبه في فورم الخطة الزمنية، وعليه يتم الربط.
 *
 * الربط بالاسم وحده ينكسر أول ما تشتغل دفعتان مشروعاً بنفس الاسم،
 * ولهذا المعرّف يُولَّد عند التسليم لا بمسح رجعي.
 */

const INTAKE_COL = {
  timestamp:    1,
  projectName:  2,
  leadName:     3,
  formats:      4,
  headcount:    5,
  budget:       6,
  duration:     7,
  stakeholders: 8,
  signalA:      9,
  signalB:     10,
  status:      11,
  proposedSize: 12,
  approvedSize: 13,
  reasons:     14,
  projectId:   15,   // تضيفه المرحلة ٢
  email:       16    // تضيفه المرحلة ٢
};

const INTAKE_EXTRA_HEADERS = ['معرّف المشروع', 'إيميل الفريق'];

/**
 * تُستدعى من classifier.gs عند تسليم فورم الاستلام.
 * ترجع معرّفاً جديداً بصيغة FTC-26-007.
 */
function nextProjectId() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = intakeSheet_(true);

    const year = String(new Date().getFullYear()).slice(-2);
    const prefix = CONFIG_2.PROJECT_ID_PREFIX + '-' + year + '-';

    // أول تسليم على الإطلاق: المرحلة ١ ما أنشأت السجل بعد
    if (!sheet) return prefix + padLeft_(1, 3);

    ensureIntakeExtraColumns_(sheet);
    const lastRow = sheet.getLastRow();
    let maxSeq = 0;
    if (lastRow > 1) {
      const ids = sheet.getRange(2, INTAKE_COL.projectId, lastRow - 1, 1).getValues();
      ids.forEach(function (row) {
        const id = String(row[0] || '').trim();
        if (id.indexOf(prefix) === 0) {
          const seq = parseInt(id.slice(prefix.length), 10);
          if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
      });
    }

    return prefix + padLeft_(maxSeq + 1, 3);
  } finally {
    lock.releaseLock();
  }
}

function intakeSheet_(createIfMissing) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG_2.SHEETS.INTAKE_LOG);
  if (!sheet && createIfMissing) {
    // المرحلة ١ تنشئه بنفسها عند أول تسليم. لو ما انوجد بعد، ما نسبقها.
    return null;
  }
  return sheet;
}

/**
 * سجل المرحلة ١ الموجود عند العملاء فيه ١٤ عموداً.
 * نضيف العمودين الجديدين مرة وحدة بدون ما نلمس الصفوف القديمة.
 */
function ensureIntakeExtraColumns_(sheet) {
  if (!sheet) return;
  if (sheet.getMaxColumns() < INTAKE_COL.email) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(),
                             INTAKE_COL.email - sheet.getMaxColumns());
  }
  const lastCol = sheet.getLastColumn();
  if (lastCol >= INTAKE_COL.email) return;

  const headers = sheet.getRange(1, 1, 1, Math.max(lastCol, 1)).getValues()[0];
  for (let i = 0; i < INTAKE_EXTRA_HEADERS.length; i++) {
    const col = INTAKE_COL.projectId + i;
    if (headers[col - 1] !== INTAKE_EXTRA_HEADERS[i]) {
      sheet.getRange(1, col).setValue(INTAKE_EXTRA_HEADERS[i]);
    }
  }
}

/**
 * يقرأ صف المشروع من سجل المرحلة ١.
 * يرجع null لو ما لقى المعرّف.
 */
function getProject(projectId) {
  const wanted = String(projectId || '').trim().toUpperCase();
  if (!wanted) return null;

  const sheet = intakeSheet_(false);
  if (!sheet) return null;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const values = sheet.getRange(2, 1, lastRow - 1, INTAKE_COL.email).getValues();

  for (let i = values.length - 1; i >= 0; i--) {
    const row = values[i];
    if (String(row[INTAKE_COL.projectId - 1] || '').trim().toUpperCase() !== wanted) continue;

    const approvedSize = String(row[INTAKE_COL.approvedSize - 1] || '').trim();
    const formatsRaw   = String(row[INTAKE_COL.formats - 1] || '');

    return {
      projectId:    wanted,
      rowNumber:    i + 2,
      projectName:  String(row[INTAKE_COL.projectName - 1] || '').trim(),
      leadName:     String(row[INTAKE_COL.leadName - 1] || '').trim(),
      email:        String(row[INTAKE_COL.email - 1] || '').trim(),
      formats:      formatsRaw.split('+').map(function (f) { return f.trim(); })
                              .filter(function (f) { return f; }),
      approvedSize: approvedSize,
      duration:     String(row[INTAKE_COL.duration - 1] || '').trim(),
      intakeStatus: String(row[INTAKE_COL.status - 1] || '').trim()
    };
  }
  return null;
}

/** هل المشروع فيه قبول انتقائي؟ يحدد إلزامية "إعلان المقبولين" في T2. */
function hasSelectiveAdmission(project) {
  if (!project || !project.formats) return false;
  return project.formats.some(function (f) {
    return CONFIG_2.SELECTIVE_FORMATS.indexOf(f) !== -1;
  });
}

/**
 * يتحقق أن المشروع مؤهل لدخول المرحلة ٢أ.
 * يرجع { ok: bool, reason: string }
 */
function checkEligibleFor2A(project) {
  if (!project) {
    return { ok: false, reason:
      'المعرّف غير موجود في سجل الاستلام. تأكدوا من نسخه كما وصلكم في إيميل الاستلام.' };
  }
  if (!project.approvedSize) {
    return { ok: false, reason:
      'ما تم اعتماد حجم لهذا المشروع بعد. قائد اللجنة لازم يعتمد الحجم قبل رفع الخطة الزمنية.' };
  }
  if (CONFIG_2.STAGE_2A_SIZES.indexOf(project.approvedSize) === -1) {
    return { ok: false, reason:
      'حجم "' + project.approvedSize + '" غير مشمول بمراجعة الخطة الزمنية.' };
  }
  return { ok: true, reason: '' };
}

/**
 * تعبئة رجعية للمشاريع اللي تسلّمت قبل تركيب المرحلة ٢.
 * شغّلها مرة وحدة من القائمة، ثم بلّغ الفرق بمعرّفاتها يدوياً.
 * المشاريع الجديدة تاخذ معرّفها تلقائياً عند التسليم.
 */
function backfillProjectIds() {
  const sheet = intakeSheet_(false);
  if (!sheet) {
    SpreadsheetApp.getUi().alert('ما فيه سجل قرارات بعد.');
    return;
  }
  ensureIntakeExtraColumns_(sheet);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const range  = sheet.getRange(2, INTAKE_COL.projectId, lastRow - 1, 1);
  const ids    = range.getValues();
  const stamps = sheet.getRange(2, INTAKE_COL.timestamp, lastRow - 1, 1).getValues();

  const seqByYear = {};
  ids.forEach(function (row) {
    const id = String(row[0] || '').trim();
    const m  = id.match(/^FTC-(\d{2})-(\d+)$/);
    if (m) {
      const y = m[1], n = parseInt(m[2], 10);
      if (!seqByYear[y] || n > seqByYear[y]) seqByYear[y] = n;
    }
  });

  let filled = 0;
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '').trim()) continue;
    const d = stamps[i][0];
    const y = String((d instanceof Date ? d : new Date()).getFullYear()).slice(-2);
    seqByYear[y] = (seqByYear[y] || 0) + 1;
    ids[i][0] = CONFIG_2.PROJECT_ID_PREFIX + '-' + y + '-' + padLeft_(seqByYear[y], 3);
    filled++;
  }

  range.setValues(ids);
  SpreadsheetApp.getUi().alert('تمت تعبئة ' + filled + ' معرّفاً. بلّغ الفرق بمعرّفاتها.');
}
