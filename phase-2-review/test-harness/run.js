/**
 * مشغّل الاختبارات خارج أبس سكربت.
 *   node phase-2-review/test-harness/run.js
 *
 * يشغّل ست مجموعات على نفس كود الإنتاج بدون تعديل:
 *   1. فحوصات الخط الزمني  — دوال خالصة، بلا شيت ولا بريد
 *   2. تكامل المرحلة ٢أ     — بخدمات أبس سكربت محاكاة
 *   3. توافق المرحلة ١      — يثبت أن ترقيع classifier.gs ما كسر التصنيف
 *   4. تخزين البربوزل       — بوابة الرفع والحفظ والإشعارات
 *   5. تقييم الروبريك       — نداء المودل والتحقق والحواجز
 *   6. مراجعة القائد        — تعديل الدرجات والإرسال مرة واحدة
 *
 * نفس اختبارات المجموعة الأولى تنشغل داخل أبس سكربت من
 * القائمة > المرحلة ٢ > تشغيل اختبارات الفحوصات.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const HERE = __dirname;
const P2   = path.join(HERE, '..');
const P1    = path.join(P2, '..', 'phase-1-intake');
const read2 = f => fs.readFileSync(path.join(P2, f), 'utf8');

const CORE = ['config.gs', 'hijri.gs', 'projects.gs', 'log.gs',
              'timeline_checks.gs', 'timeline_store.gs', 'timeline_decision.gs',
              'proposals.gs', 'rubric.gs', 'figures.gs', 'scoring.gs', 'review.gs',
              'setup.gs'];

function suiteTimeline() {
  const src = ['config.gs', 'hijri.gs', 'timeline_checks.gs', 'tests.gs'].map(read2).join('\n');
  let out = '';
  global.Logger = { log: s => { out += s; } };
  const r = eval(src + '\nrunTimelineTests();');
  console.log(out);
  return r.passed === r.total;
}

// كل ملف حالات ينهي نفسه بـ process.exit، فنشغّله في عملية مستقلة
function child(casesFile, withPhase1) {
  const runner = `
    const fs=require('fs'),path=require('path');
    const F=require(${JSON.stringify(path.join(HERE, 'apps-script-fakes.js'))}); global.__F=F;
    const P2=${JSON.stringify(P2)}, P1=${JSON.stringify(P1)};
    const r2=f=>fs.readFileSync(path.join(P2,f),'utf8');
    const body=fs.readFileSync(${JSON.stringify(path.join(HERE, casesFile))},'utf8').replace(/\\bF\\./g,'__F.');
    const parts=${withPhase1 ? "[fs.readFileSync(path.join(P1,'classifier.gs'),'utf8')]" : "[]"}
      .concat(${JSON.stringify(CORE)}.map(r2)).concat([body]);
    eval(parts.join('\\n'));
  `;
  try { execFileSync(process.execPath, ['-e', runner], { stdio: 'inherit' }); return true; }
  catch (e) { return false; }
}

/** ما يفشل التشغيل — يعرض الفجوة كل مرة لين تتعبّى */
let realCount = 0;
function realProjects() {
  const src = ['config.gs', 'hijri.gs', 'timeline_checks.gs'].map(read2).join('\n');
  const body = fs.readFileSync(path.join(HERE, 'cases-real-projects.js'), 'utf8')
                 .replace('runRealProjects();', 'realCount = runRealProjects().ran;');
  eval(src + '\n' + body);
  return true;
}

const ok = [
  suiteTimeline(),
  child('cases-integration.js', false),
  child('cases-phase1.js', true),
  child('cases-proposals.js', false),
  child('cases-scoring.js', false),
  child('cases-lead-review.js', false),
  realProjects()
];

if (!ok.every(Boolean)) {
  console.log('\n=== فيه مجموعة فاشلة ===\n');
  process.exit(1);
}

console.log(realCount
  ? '\n=== كل المجموعات ناجحة، و' + realCount + ' مشروع حقيقي انمرّر ===\n'
  : '\n=== كل المجموعات ناجحة — fixtures فقط، ما فيه تحقق بمشاريع حقيقية ===\n');
process.exit(0);
