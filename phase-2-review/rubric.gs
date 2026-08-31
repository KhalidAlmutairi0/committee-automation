/**
 * روبريك مراجعة بروفايل الرعاية — منقول كما هو من
 * 2_روبريك_مراجعة_البروفايل.md
 *
 * ٨ معايير، أوزانها ١+٣+٢+٣+٣+٣+٢+٢ = ١٩، والدرجة ٠/١/٢، فالمجموع ٣٨.
 * لا تُعدَّل الأوزان ولا العتبات من هنا. هذا نقل، مو إعادة كتابة.
 */

const RUBRIC_LEVEL = {
  WEAK:  { key: 'ضعيف',  score: 0 },
  OK:    { key: 'مقبول', score: 1 },
  STRONG:{ key: 'قوي',   score: 2 }
};

const NOT_ASSESSABLE = 'غير قابل للتقييم';

const RUBRIC = {

  maxTotal: 38,

  thresholds: {
    approved:    30,   // ٣٠ فأكثر وما فيه ⛔ ضعيف
    conditional: 22    // ٢٢ إلى ٢٩
  },

  decisions: {
    APPROVED:    'معتمد',
    CONDITIONAL: 'معتمد بتعديلات',
    RESUBMIT:    'إعادة تقديم'
  },

  criteria: [
    {
      id: 1, key: 'summary', name: 'الملخص التنفيذي',
      weight: 1, blocking: false,
      weak:   'وصف عام بدون أرقام. القارئ يخلص الفقرة وما يعرف حجم الفعالية.',
      ok:     'يذكر الشكل والمجال والمكان.',
      strong: 'فقرة وحدة تجاوب: وش، وين، متى، كم مشارك، كم المدة.'
    },
    {
      id: 2, key: 'objectives', name: 'الأهداف القابلة للقياس',
      weight: 3, blocking: true,
      weak:   'أهداف بلا أرقام (سد الفجوة، إلهام الطلاب، تعزيز المجتمع).',
      ok:     'بعض الأهداف تحمل أرقام.',
      strong: '٣ إلى ٦ أهداف، كل واحد يحمل رقم، والأرقام نتائج مو مقاعد.',
      note:   'عدد المقاعد ليس نتيجة. "تمكين ٢٨ طالب" لا يُحتسب هدفاً رقمياً.'
    },
    {
      id: 3, key: 'timeline', name: 'الخط الزمني',
      weight: 2, blocking: true,
      weak:   'تواريخ الفعالية فقط، أو بدون سنة.',
      ok:     'تواريخ الفعالية + فتح التسجيل.',
      strong: 'فتح التسجيل، رسائل القبول، بداية ونهاية الفعالية، والسنة واضحة.',
      note:   'أي تسلسل غير منطقي (ورشة قبل رسائل القبول) لازم يكون مشروحاً في الوثيقة.'
    },
    {
      id: 4, key: 'program', name: 'محتوى البرنامج',
      weight: 3, blocking: false,
      weak:   'ما فيه أجندة. الوثيقة تقول ٦ أيام وما تقول وش يصير فيها.',
      ok:     'عناوين عامة للأيام أو الأقسام.',
      strong: 'يوم بيوم أو قسم بقسم، بمواضيع مسماة، وقوس واضح من البداية للنهاية.'
    },
    {
      id: 5, key: 'packages', name: 'باقات الرعاة',
      weight: 3, blocking: true,
      weak:   'باقات بدون أسعار، أو مزايا متطابقة بين الباقات، أو شي ضروري للتنفيذ مربوط بباقة.',
      ok:     'أسعار واضحة ومزايا متمايزة.',
      strong: 'ما سبق + عدد متاح من كل باقة + ولا مزية تشغيلية جوهرية مربوطة بباقة.',
      autoWeak: 'أي شي ضروري لقيام الفعالية (المكان، المعدات، المتحدث الرئيسي) ' +
                'مربوط بباقة معينة بدون بديل مكتوب = ضعيف تلقائياً.'
    },
    {
      id: 6, key: 'pastFigures', name: 'أرقام الأعمال السابقة',
      weight: 3, blocking: true, requiresFigures: true,
      weak:   'أرقام تخالف ورقة الأرقام المركزية.',
      ok:     'الأرقام مطابقة.',
      strong: 'مطابقة، ومختارة بما يناسب الجهة المستهدفة.',
      autoWeak: 'أي رقم يخالف الورقة المركزية = ضعيف تلقائياً.'
    },
    {
      id: 7, key: 'identity', name: 'الهوية المؤسسية وبيانات التواصل',
      weight: 2, blocking: true,
      weak:   'إيميلات وجوالات شخصية، أو بدون هوية الجامعة/العمادة.',
      ok:     'إيميل نادي + هوية النادي.',
      strong: 'إيميل نادي + هوية النادي + عمادة شؤون الطلاب + جوال واحد مسؤول.'
    },
    {
      id: 8, key: 'accuracy', name: 'الدقة الأساسية',
      weight: 2, blocking: true,
      /**
       * قائمة فحص، مو سلّم ثلاثي. الروبريك يقول "أي بند يسقط = الوثيقة ترجع"،
       * فما فيه مستوى "مقبول" هنا: الكل ناجح = قوي، وأي سقوط = ضعيف.
       */
      checklist: [
        'اسم النادي مكتوب صح في كل مكان، عربي وإنجليزي',
        'السنة موجودة على الوثيقة',
        'التاريخ الهجري يطابق الميلادي',
        'ما فيه صفحات مكررة',
        'ما فيه مربعات فاضية أو نص مقطوع في التصميم',
        'أسماء الجهات والرعاة مكتوبة صح'
      ],
      knownTrap: 'الاسم الصحيح Future Technology Club. ' +
                 '"Feature Technology Club" خطأ خرج فعلاً على غلاف بروفايل ' +
                 'ذهب لجهات حكومية.'
    }
  ]
};

function rubricCriterion(key) {
  const c = RUBRIC.criteria.filter(function (x) { return x.key === key; })[0];
  if (!c) throw new Error('معيار غير معرّف: ' + key);
  return c;
}

/** معيار القائمة (٨) ثنائي: قوي أو ضعيف فقط. بقية المعايير ثلاثية. */
function rubricLevelAllowed_(criterion, level) {
  if (level === NOT_ASSESSABLE) return true;
  if (criterion.checklist) return level === RUBRIC_LEVEL.WEAK.key ||
                                  level === RUBRIC_LEVEL.STRONG.key;
  return level === RUBRIC_LEVEL.WEAK.key || level === RUBRIC_LEVEL.OK.key ||
         level === RUBRIC_LEVEL.STRONG.key;
}

/** فحص سلامة: مجموع (الوزن × ٢) لازم يساوي ٣٨ */
function rubricSelfCheck() {
  const sum = RUBRIC.criteria.reduce(function (a, c) { return a + c.weight * 2; }, 0);
  if (sum !== RUBRIC.maxTotal) {
    throw new Error('أوزان الروبريك تعطي ' + sum + ' والمفروض ' + RUBRIC.maxTotal);
  }
  return true;
}
