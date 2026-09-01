import { describe, expect, it } from "vitest";
import { buildFeedbackMessage, finalDecisionAllowed, normalizeReviewCriteria, REVIEW_CRITERIA } from "./review-policy";

describe("production review policy", () => {
  it("keeps central figures disabled and rejects incomplete assessed criteria", () => {
    const input = REVIEW_CRITERIA.map((criterion) => ({
      id: criterion.id,
      level: criterion.id === 6 ? "strong" : "weak",
      quote: criterion.id === 6 ? "invented" : "اقتباس",
      fix: "إصلاح محدد"
    }));
    const normalized = normalizeReviewCriteria(input);
    expect(normalized.find((item) => item.id === 6)).toMatchObject({ level: "unassessed", quote: "" });
  });

  it("names every disabled timeline check in the team feedback", () => {
    const message = buildFeedbackMessage({
      projectName: "مشروع اختبار",
      decision: "approved_with_changes",
      leadReason: "يلزم تعديل بسيط",
      criteria: REVIEW_CRITERIA.map((criterion) => ({ ...criterion, level: "unassessed" as const, quote: "", fix: "بانتظار المراجعة" })),
      disabledChecks: ["T3 — المسافات الدنيا", "T6 — اتساق هجري/ميلادي"]
    });
    expect(message.text).toContain("T3 — المسافات الدنيا");
    expect(message.text).toContain("T6 — اتساق هجري/ميلادي");
    expect(message.subject).toContain("مشروع اختبار");
  });

  it("does not allow full approval while a blocking criterion is disabled", () => {
    const criteria = normalizeReviewCriteria(REVIEW_CRITERIA.map((criterion) => ({
      id: criterion.id, level: "strong", quote: "اقتباس موثق", fix: ""
    })));
    expect(finalDecisionAllowed(criteria, "approved")).toBe(false);
    expect(finalDecisionAllowed(criteria, "approved_with_changes")).toBe(true);
  });
});
