import { calculateReviewDecision, type ReviewDecision, type RubricLevel } from "@/domain/workflow";

export interface ReviewCriterionDefinition {
  id: number;
  title: string;
  weight: number;
  blocking: boolean;
  checklist?: boolean;
}

export interface ReviewCriterion extends ReviewCriterionDefinition {
  level: RubricLevel;
  quote: string;
  fix: string;
}

export const REVIEW_CRITERIA: ReviewCriterionDefinition[] = [
  { id: 1, title: "الملخص التنفيذي", weight: 1, blocking: false },
  { id: 2, title: "الأهداف القابلة للقياس", weight: 3, blocking: true },
  { id: 3, title: "الخط الزمني", weight: 2, blocking: true },
  { id: 4, title: "محتوى البرنامج", weight: 3, blocking: false },
  { id: 5, title: "باقات الرعاة", weight: 3, blocking: true },
  { id: 6, title: "أرقام الأعمال السابقة", weight: 3, blocking: true },
  { id: 7, title: "الهوية وبيانات التواصل", weight: 2, blocking: true },
  { id: 8, title: "الدقة الأساسية", weight: 2, blocking: true, checklist: true }
];

const levels = new Set<RubricLevel>(["weak", "acceptable", "strong", "unassessed"]);

export function emptyReviewCriteria(): ReviewCriterion[] {
  return REVIEW_CRITERIA.map((criterion) => ({
    ...criterion,
    level: "unassessed",
    quote: "",
    fix: criterion.id === 6 ? "المعيار معطّل حتى تعتمد اللجنة ورقة الأرقام المركزية." : ""
  }));
}

export function normalizeReviewCriteria(input: unknown): ReviewCriterion[] {
  if (!Array.isArray(input)) throw new Error("بيانات معايير المراجعة غير صالحة.");
  return REVIEW_CRITERIA.map((definition) => {
    const raw = input.find((item) => item && Number(item.id) === definition.id) as Record<string, unknown> | undefined;
    let level = String(raw?.level ?? "unassessed") as RubricLevel;
    if (!levels.has(level)) level = "unassessed";
    if (definition.checklist && level === "acceptable") level = "unassessed";
    if (definition.id === 6) level = "unassessed";
    return {
      ...definition,
      level,
      quote: definition.id === 6 ? "" : String(raw?.quote ?? "").trim().slice(0, 8_000),
      fix: String(raw?.fix ?? "").trim().slice(0, 8_000)
    };
  });
}

export function assertReviewReady(criteria: ReviewCriterion[]): void {
  for (const criterion of criteria) {
    if (criterion.id === 6) continue;
    if (criterion.level === "unassessed") throw new Error(`المعيار ${criterion.id}: اختر مستوى قبل الإرسال.`);
    if (!criterion.quote) throw new Error(`المعيار ${criterion.id}: أضف اقتباساً من المقترح.`);
    if (criterion.level !== "strong" && !criterion.fix) throw new Error(`المعيار ${criterion.id}: أضف إصلاحاً محدداً.`);
  }
}

const decisionLabels: Record<ReviewDecision, string> = {
  approved: "معتمد",
  approved_with_changes: "معتمد بتعديلات",
  resubmit: "إعادة تقديم"
};

export function reviewOutcome(criteria: ReviewCriterion[]) {
  return calculateReviewDecision(criteria);
}

export function finalDecisionAllowed(criteria: ReviewCriterion[], decision: ReviewDecision): boolean {
  return decision !== "approved" || !criteria.some((criterion) => criterion.blocking && criterion.level === "unassessed");
}

export function buildFeedbackMessage(input: {
  projectName: string;
  decision: ReviewDecision;
  leadReason: string;
  criteria: ReviewCriterion[];
  disabledChecks: string[];
}): { subject: string; text: string } {
  const lines = input.criteria.map((criterion) => {
    const level = { weak: "ضعيف", acceptable: "مقبول", strong: "قوي", unassessed: "غير قابل للتقييم" }[criterion.level];
    return `${criterion.id}. ${criterion.title}: ${level}${criterion.fix ? `\nالإجراء المطلوب: ${criterion.fix}` : ""}`;
  });
  const disabled = input.disabledChecks.length
    ? `\n\nتنبيه: الفحوصات التالية كانت معطّلة ولم تدخل في القرار:\n- ${input.disabledChecks.join("\n- ")}`
    : "";
  return {
    subject: `نتيجة مراجعة مقترح ${input.projectName}`,
    text: `السلام عليكم،\n\nقرار اللجنة لمشروع «${input.projectName}»: ${decisionLabels[input.decision]}.` +
      `${input.leadReason ? `\nسبب قرار القائد: ${input.leadReason}` : ""}\n\nتفاصيل المعايير:\n${lines.join("\n\n")}${disabled}\n\nلجنة إدارة المشاريع`
  };
}
