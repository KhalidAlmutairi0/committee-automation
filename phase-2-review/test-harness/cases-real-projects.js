/**
 * التحقق بمشاريع حقيقية — هذا هو الاختبار الوحيد اللي يقول شيئاً عن العتبات.
 *
 * اختبارات الـfixture الثانية كلها تثبت أن الكود يسوي اللي انكتب ليسويه.
 * ما تثبت أن العتبات صح. اللي يثبت ذلك هو تمرير تواريخ مشاريع سابقة
 * تعرف كيف انتهت.
 *
 * عبّي PAST_PROJECTS تحت. لكل مشروع:
 *
 *   outcome: 'مشى'    — نُفّذ في وقته بلا أزمة
 *            'تعثّر'   — تأخّر أو انضغط، بس صار
 *            'انهار'   — تأجّل أو أُلغي أو خرج عن السيطرة
 *
 * القاعدة اللي يطبّقها هذا الملف:
 *   مشروع outcome له 'تعثّر' أو 'انهار' وطلع "معتمد" → **العتبات غلط، مو المشروع**.
 *
 * هذي نفس البوابة المطبّقة على المرحلة ١: جرّبه على ٣ مشاريع سابقة تعرف حجمها.
 */

const PAST_PROJECTS = [

  // ---------------------------------------------------------------
  // مثال معبّى للتوضيح — احذفه واستبدله بمشاريع حقيقية
  // ---------------------------------------------------------------
  // {
  //   name: 'فنتك',
  //   size: 'كبير',
  //   selectiveAdmission: true,
  //   outcome: 'مشى',
  //   note: 'المرجع. أخذ "قوي" في معيار الخط الزمني بالروبريك.',
  //   dates: {
  //     ideaApproval:       '2025-09-01',
  //     sponsorClose:       '2025-09-25',
  //     designsDelivery:    '2025-10-10',
  //     regOpen:            '2025-10-20',
  //     regClose:           '2025-11-10',
  //     acceptanceAnnounce: '2025-11-15',
  //     eventStart:         '2025-12-01',
  //     eventEnd:           '2025-12-03',
  //     finalReport:        '2025-12-20'
  //   }
  // },

];

// ============================================================

function toDate_(iso) {
  if (!iso) return null;
  const p = String(iso).split('-');
  return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
}

function runRealProjects() {
  if (!PAST_PROJECTS.length) {
    console.log(
      '\n' +
      '╔════════════════════════════════════════════════════════════════════╗\n' +
      '║  ⚠️  ما فيه ولا مشروع حقيقي معبّى.                                  ║\n' +
      '║                                                                    ║\n' +
      '║  كل اللي انفحص لين الحين fixtures: تثبت أن الكود يسوي اللي         ║\n' +
      '║  انكتب ليسويه، وما تثبت أن العتبات صح.                             ║\n' +
      '║                                                                    ║\n' +
      '║  عبّي PAST_PROJECTS في:                                             ║\n' +
      '║  phase-2-review/test-harness/cases-real-projects.js                ║\n' +
      '║                                                                    ║\n' +
      '║  ابدأ بمشروع تعرف أن خطته الزمنية انهارت. لو طلع "معتمد"،          ║\n' +
      '║  فالعتبات غلط مو المشروع.                                          ║\n' +
      '╚════════════════════════════════════════════════════════════════════╝\n');
    return { ran: 0, suspicious: 0 };
  }

  const BAD = ['تعثّر', 'انهار'];
  let suspicious = 0;

  console.log('\n=== تمرير مشاريع حقيقية على الفحوصات ===\n');

  PAST_PROJECTS.forEach(function (proj) {
    const plan = { projectId: proj.name, size: proj.size,
                   selectiveAdmission: !!proj.selectiveAdmission,
                   dates: {}, hijri: proj.hijri || {} };

    CONFIG_2.MILESTONES.forEach(function (m) {
      plan.dates[m.key] = toDate_(proj.dates[m.key]);
    });

    const r = runTimelineChecks(plan, []);
    const approved = r.decision !== 'إعادة تقديم';
    const badEnd   = BAD.indexOf(proj.outcome) !== -1;
    const flag     = badEnd && approved;
    if (flag) suspicious++;

    console.log('  ' + proj.name + '  [' + proj.size + ']');
    console.log('    الواقع  : ' + proj.outcome + (proj.note ? ' — ' + proj.note : ''));
    console.log('    النظام  : ' + r.decision);
    r.checks.forEach(function (c) {
      if (c.result === 'pass') return;
      console.log('      ' + c.code + ' ' + c.name + ': ' + c.result +
                  (c.detail ? ' — ' + c.detail : ''));
    });
    if (flag) {
      console.log('    ⚠️  مشروع ' + proj.outcome + ' وعدّى. العتبات غلط، مو المشروع.');
    }
    if (!badEnd && !approved) {
      console.log('    ⚠️  مشروع مشى وانرفض. العتبات متشددة زيادة.');
    }
    console.log('');
  });

  const dark = Object.keys(CONFIG_2.MIN_GAPS)
    .filter(function (k) { return CONFIG_2.MIN_GAPS[k].value === null; }).length;
  if (dark) {
    console.log('  ملاحظة: T3 معطّل (' + dark + ' عتبة فاضية)، ' +
                'فهذا التمرير ما فحص واقعية المدد أصلاً.\n');
  }

  console.log('  ' + PAST_PROJECTS.length + ' مشروع، ' + suspicious + ' نتيجة مشبوهة\n');
  return { ran: PAST_PROJECTS.length, suspicious: suspicious };
}

runRealProjects();
