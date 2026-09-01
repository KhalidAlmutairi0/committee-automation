import type { ClassificationResult, ProjectClassificationInput } from "./types";

const FORMAT_RULES: Record<string, { baseline: ClassificationResult["proposedSize"]; largeAbove?: number; maxHeadcount?: number }> = {
  "ورشة عمل": { baseline: "صغير" },
  "جلسة حوارية": { baseline: "صغير" },
  "نشاط بسيط": { baseline: "صغير" },
  "ميني هاكثون": { baseline: "متوسط", maxHeadcount: 80 },
  "هاكاثون": { baseline: "متوسط", largeAbove: 150 },
  "معسكر تدريبي": { baseline: "متوسط", largeAbove: 80 },
  "معرض": { baseline: "متوسط", largeAbove: 400 },
  "مشروع تقني / هاردوير": { baseline: "تقني" }
};

function budgetSize(budget: number): ClassificationResult["proposedSize"] {
  if (budget < 15_000) return "صغير";
  if (budget <= 40_000) return "متوسط";
  return "كبير";
}

export function classifyProject(input: ProjectClassificationInput): ClassificationResult {
  const reasons: string[] = [];
  const primary = input.formats[0];
  const rule = FORMAT_RULES[primary];

  if (input.formats.length !== 1) {
    reasons.push(input.formats.length === 0 ? "لم يُحدد نوع المشروع." : "اختير أكثر من نوع للمشروع.");
  }
  if (!Number.isFinite(input.attendance) || input.attendance <= 0) reasons.push("عدد الحضور غير صالح.");
  if (!Number.isFinite(input.budget) || input.budget < 0) reasons.push("الميزانية غير صالحة.");
  if (input.stakeholders.includes("جهة حكومية أو وزارة")) reasons.push("المشروع يشمل جهة حكومية أو وزارة.");
  if (!rule) reasons.push("نوع المشروع يحتاج قرار قائد اللجنة.");

  let proposedSize = rule?.baseline ?? budgetSize(input.budget);
  if (rule?.largeAbove !== undefined && input.attendance > rule.largeAbove) proposedSize = "كبير";
  if (rule?.maxHeadcount !== undefined && input.attendance > rule.maxHeadcount) {
    reasons.push(`عدد المشاركين يتجاوز حد ${rule.maxHeadcount} لهذا النوع.`);
  }

  if (proposedSize !== "تقني") {
    const fromBudget = budgetSize(input.budget);
    if (proposedSize !== fromBudget) {
      reasons.push(`النوع والحضور يقترحان «${proposedSize}»، والميزانية تقترح «${fromBudget}».`);
    }
  }

  return { proposedSize, needsLeadReview: reasons.length > 0, reasons };
}
