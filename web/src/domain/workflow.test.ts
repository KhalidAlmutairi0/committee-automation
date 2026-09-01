import { describe, expect, it } from "vitest";
import { classifyProject } from "./classification";
import { checkTimeline } from "./timeline";
import { calculateReviewDecision, canUploadProposal, canSendFeedback, proposalHasContent } from "./workflow";

describe("website workflow", () => {
  it("classifies an ordinary workshop as small without committee escalation", () => {
    expect(classifyProject({
      formats: ["ورشة عمل"],
      attendance: 45,
      budget: 4_000,
      stakeholders: ["لا يوجد"]
    })).toEqual({ proposedSize: "صغير", needsLeadReview: false, reasons: [] });
  });

  it("rejects a closed preparatory activity before acceptance", () => {
    const result = checkTimeline({
      size: "متوسط",
      format: "هاكاثون",
      milestones: {
        ideaApproval: "2026-07-01",
        sponsorClose: "2026-07-10",
        designsDelivery: "2026-07-20",
        regOpen: "2026-07-25",
        regClose: "2026-08-20",
        acceptanceAnnounce: "2026-08-28",
        eventStart: "2026-09-03",
        eventEnd: "2026-09-05",
        finalReport: "2026-09-12"
      },
      prepActivities: [{ title: "ورشة المشاركين", date: "2026-07-31", openToAll: false }]
    });

    expect(result.checks.find((check) => check.id === "T7")?.status).toBe("failed");
    expect(result.decision).toBe("resubmit");
  });

  it("allows an open-to-all activity before acceptance", () => {
    const result = checkTimeline({
      size: "متوسط",
      format: "هاكاثون",
      milestones: {
        ideaApproval: "2026-07-01",
        sponsorClose: "2026-07-10",
        designsDelivery: "2026-07-20",
        regOpen: "2026-07-25",
        regClose: "2026-08-20",
        acceptanceAnnounce: "2026-08-28",
        eventStart: "2026-09-03",
        eventEnd: "2026-09-05",
        finalReport: "2026-09-12"
      },
      prepActivities: [{ title: "جلسة تعريفية", date: "2026-07-31", openToAll: true }]
    });

    expect(result.checks.find((check) => check.id === "T7")?.status).toBe("passed");
  });

  it("keeps proposal upload locked until the timeline is accepted", () => {
    expect(canUploadProposal("resubmit")).toBe(false);
    expect(canUploadProposal("approved_with_warnings")).toBe(true);
  });

  it("never sends feedback without an explicit lead decision", () => {
    expect(canSendFeedback({ reviewStatus: "draft", leadDecision: null })).toBe(false);
    expect(canSendFeedback({ reviewStatus: "ready", leadDecision: "approved_with_changes" })).toBe(true);
  });

  it("forces resubmission when a blocking rubric criterion is weak", () => {
    expect(calculateReviewDecision([
      { level: "strong", weight: 12, blocking: false },
      { level: "weak", weight: 1, blocking: true }
    ])).toEqual({ total: 24, decision: "resubmit" });
  });

  it("caps a review with an unassessed blocking criterion at approved with changes", () => {
    expect(calculateReviewDecision([
      { level: "strong", weight: 16, blocking: false },
      { level: "unassessed", weight: 3, blocking: true }
    ])).toEqual({ total: 32, decision: "approved_with_changes" });
  });

  it("requires actual proposal content", () => {
    expect(proposalHasContent({ fileSize: 0, text: "   " })).toBe(false);
    expect(proposalHasContent({ fileSize: 1200, text: "" })).toBe(true);
  });
});
