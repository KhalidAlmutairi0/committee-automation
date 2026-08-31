/**
 * تحويل هجري / ميلادي — لفحص T6
 *
 * أبس سكربت ما فيه تقويم أم القرى جاهز. الترتيب:
 *   1. Intl مع أم القرى إذا كانت البيئة تدعمها
 *   2. الحساب الجدولي (الخوارزمية الكويتية) كبديل
 *
 * المقارنة تمرّ الطرفين على نفس الدالة، فالفرق المنهجي بين
 * أم القرى والجدولي ينلغي، واللي يبقى هو التضارب الحقيقي في تاريخ الفريق.
 *
 * التسامح ±يوم واحد مقصود: أم القرى والرؤية الشرعية يختلفان بيوم فعلاً،
 * والرفض على يوم ينتج فشلاً كاذباً على وثائق صحيحة.
 */

/**
 * حشو بأصفار. ساكنة هنا لأن hijri.gs أوطأ ملف في السلسلة،
 * وكل من fmtDate و formatHijri و nextProjectId يعتمد عليها.
 */
function padLeft_(n, width) {
  let s = String(n);
  while (s.length < width) s = '0' + s;
  return s;
}

function normalizeDigits_(s) {
  return String(s || '')
    .replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 0x0660); })
    .replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 0x06F0); });
}

/**
 * يقرأ تاريخاً هجرياً مكتوباً بأي صيغة شائعة:
 *   1447/09/15   ١٤٤٧-٩-١٥   15/9/1447   ١٥ ٩ ١٤٤٧
 * يرجع { y, m, d } أو null لو ما قدر يقرأه بثقة.
 */
function parseHijriString(raw) {
  const parts = normalizeDigits_(raw).split(/[^0-9]+/).filter(function (p) { return p !== ''; });
  if (parts.length !== 3) return null;

  const n = parts.map(function (p) { return parseInt(p, 10); });
  let y, m, d;

  if (parts[0].length === 4) {
    y = n[0]; m = n[1]; d = n[2];
  } else if (parts[2].length === 4) {
    d = n[0]; m = n[1]; y = n[2];
  } else {
    return null;   // ما فيه سنة من أربع خانات، الترتيب ملتبس فما نخمّن
  }

  if (y < 1300 || y > 1600) return null;
  if (m < 1 || m > 12)      return null;
  if (d < 1 || d > 30)      return null;

  return { y: y, m: m, d: d };
}

function gregorianToJdn_(y, m, d) {
  const a  = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4)
         - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

/** هجري ← رقم اليوم اليولياني، بالحساب الجدولي */
function hijriToJdn_(y, m, d) {
  return Math.floor((11 * y + 3) / 30) + 354 * y + 30 * m
       - Math.floor((m - 1) / 2) + d + 1948440 - 385;
}

/** رقم اليوم اليولياني ← هجري، بالحساب الجدولي */
function jdnToHijri_(jdn) {
  let l = jdn - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719)
          + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50)
        - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const m = Math.floor((24 * l) / 709);
  const d = l - Math.floor((709 * m) / 24);
  const y = 30 * n + j - 30;
  return { y: y, m: m, d: d };
}

/**
 * التاريخ الهجري المقابل لتاريخ ميلادي.
 * يرجع { y, m, d, source } — source إما 'umalqura' أو 'tabular'.
 */
function gregorianToHijri(date) {
  try {
    const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC'
    });
    const parts = {};
    fmt.formatToParts(date).forEach(function (p) { parts[p.type] = p.value; });

    const y = parseInt(normalizeDigits_(parts.year), 10);
    const m = parseInt(normalizeDigits_(parts.month), 10);
    const d = parseInt(normalizeDigits_(parts.day), 10);

    // فحص عقل: لو رجّعت سنة ميلادية فالتقويم ما انطبق
    if (y > 1300 && y < 1600 && m >= 1 && m <= 12 && d >= 1 && d <= 30) {
      return { y: y, m: m, d: d, source: 'umalqura' };
    }
  } catch (err) {
    // البيئة ما تدعم امتداد التقويم — ننزل للجدولي
  }

  const h = jdnToHijri_(gregorianToJdn_(
    date.getFullYear(), date.getMonth() + 1, date.getDate()));
  h.source = 'tabular';
  return h;
}

/**
 * الفرق بالأيام بين تاريخ هجري كتبه الفريق والتاريخ الميلادي المقابل له.
 * موجب = الهجري متقدّم. يرجع null لو الهجري غير مقروء.
 */
function hijriGregorianDayDiff(hijriRaw, gregorianDate) {
  const stated = parseHijriString(hijriRaw);
  if (!stated) return null;

  const reference = gregorianToHijri(gregorianDate);

  return hijriToJdn_(stated.y, stated.m, stated.d)
       - hijriToJdn_(reference.y, reference.m, reference.d);
}

function formatHijri(h) {
  return h.y + '/' + padLeft_(h.m, 2) + '/' + padLeft_(h.d, 2) + 'هـ';
}
