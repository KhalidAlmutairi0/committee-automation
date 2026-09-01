import type { MilestoneKey, TimelineCheck, TimelineInput, TimelineResult } from "./types";

const MILESTONES: Array<{ key: MilestoneKey; label: string }> = [
  { key: "ideaApproval", label: "إقرار الفكرة" },
  { key: "sponsorClose", label: "إغلاق الرعاية" },
  { key: "designsDelivery", label: "تسليم التصاميم" },
  { key: "regOpen", label: "فتح التسجيل" },
  { key: "regClose", label: "إغلاق التسجيل" },
  { key: "acceptanceAnnounce", label: "إعلان المقبولين" },
  { key: "eventStart", label: "بداية الحدث" },
  { key: "eventEnd", label: "نهاية الحدث" },
  { key: "finalReport", label: "التقرير الختامي" }
];

const REQUIRED: Record<TimelineInput["size"], MilestoneKey[]> = {
  "صغير": ["ideaApproval", "regOpen", "regClose", "eventStart", "eventEnd", "finalReport"],
  "متوسط": ["ideaApproval", "sponsorClose", "designsDelivery", "regOpen", "regClose", "eventStart", "eventEnd", "finalReport"],
  "كبير": ["ideaApproval", "sponsorClose", "designsDelivery", "regOpen", "regClose", "eventStart", "eventEnd", "finalReport"],
  "تقني": ["ideaApproval", "finalReport"]
};

const SELECTIVE = new Set(["هاكاثون", "ميني هاكثون", "معسكر تدريبي"]);

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function t1(input: TimelineInput): TimelineCheck {
  const problems: string[] = [];
  let previous: { key: MilestoneKey; label: string; date: string } | undefined;
  for (const milestone of MILESTONES) {
    const date = input.milestones[milestone.key];
    if (!date) continue;
    if (previous) {
      const difference = daysBetween(previous.date, date);
      const sameDayAllowed =
        (previous.key === "eventStart" && milestone.key === "eventEnd") ||
        (previous.key === "regClose" && milestone.key === "eventStart" && !SELECTIVE.has(input.format));
      if (difference < 0 || (difference === 0 && !sameDayAllowed)) {
        problems.push(`${milestone.label} يجب أن يأتي بعد ${previous.label}.`);
      }
    }
    previous = { ...milestone, date };
  }
  return {
    id: "T1", name: "تسلسل التواريخ", blocking: true,
    status: problems.length ? "failed" : "passed",
    message: problems.join(" ") || "كل التواريخ مرتبة ترتيباً صحيحاً."
  };
}

function t2(input: TimelineInput): TimelineCheck {
  const required = [...REQUIRED[input.size]];
  if (SELECTIVE.has(input.format)) required.splice(5, 0, "acceptanceAnnounce");
  const missing = required.filter((key) => !input.milestones[key]);
  return {
    id: "T2", name: "اكتمال المعالم", blocking: true,
    status: missing.length ? "failed" : "passed",
    message: missing.length
      ? `أكملوا: ${missing.map((key) => MILESTONES.find((item) => item.key === key)?.label).join("، ")}.`
      : "كل المعالم المطلوبة مكتملة."
  };
}

function t7(input: TimelineInput): TimelineCheck {
  const acceptance = input.milestones.acceptanceAnnounce;
  if (!acceptance || input.prepActivities.length === 0) {
    return { id: "T7", name: "الأنشطة التمهيدية", blocking: true, status: "passed", message: "لا يوجد تعارض في الأنشطة التمهيدية." };
  }
  const invalid = input.prepActivities.filter((activity) => activity.date && !activity.openToAll && daysBetween(activity.date, acceptance) > 0);
  return {
    id: "T7", name: "الأنشطة التمهيدية", blocking: true,
    status: invalid.length ? "failed" : "passed",
    message: invalid.length
      ? `هذه الأنشطة تسبق إعلان المقبولين وليست مفتوحة للجميع: ${invalid.map((activity) => activity.title).join("، ")}.`
      : "كل الأنشطة بعد القبول أو مفتوحة للجميع."
  };
}

export function checkTimeline(input: TimelineInput): TimelineResult {
  const checks: TimelineCheck[] = [
    t1(input),
    t2(input),
    { id: "T3", name: "المسافات الدنيا", blocking: true, status: "disabled", message: "بانتظار عتبات مستخرجة من مقترحات حقيقية." },
    { id: "T4", name: "تعارض التقويم", blocking: false, status: "disabled", message: "التقويم الأكاديمي غير مربوط بعد." },
    { id: "T5", name: "هامش الخطأ", blocking: false, status: "disabled", message: "هامش الخطأ لم يُعتمد بعد." },
    { id: "T6", name: "اتساق هجري/ميلادي", blocking: true, status: "disabled", message: "مدخلات التاريخ الهجري لم تُنقل إلى نسخة الويب بعد." },
    t7(input)
  ];

  const blockingFailure = checks.some((check) => check.blocking && check.status === "failed");
  const needsWarning = checks.some((check) => check.status === "warning" || (check.blocking && check.status === "disabled"));
  return {
    checks,
    decision: blockingFailure ? "resubmit" : needsWarning ? "approved_with_warnings" : "approved"
  };
}
