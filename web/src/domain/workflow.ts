import type { TimelineDecision } from "./types";

export type ReviewDecision = "approved" | "approved_with_changes" | "resubmit";
export type RubricLevel = "weak" | "acceptable" | "strong" | "unassessed";

export function canUploadProposal(decision: TimelineDecision): boolean {
  return decision === "approved" || decision === "approved_with_warnings";
}

export function canSendFeedback(input: {
  reviewStatus: "draft" | "ready";
  leadDecision: ReviewDecision | null;
}): boolean {
  return input.reviewStatus === "ready" && input.leadDecision !== null;
}

export function calculateReviewDecision(criteria: Array<{
  level: RubricLevel;
  weight: number;
  blocking: boolean;
}>): { total: number; decision: ReviewDecision } {
  const score = { weak: 0, acceptable: 1, strong: 2, unassessed: 0 } satisfies Record<RubricLevel, number>;
  const total = criteria.reduce((sum, criterion) => sum + score[criterion.level] * criterion.weight, 0);
  const blockingWeak = criteria.some((criterion) => criterion.blocking && criterion.level === "weak");
  const blockingUnassessed = criteria.some((criterion) => criterion.blocking && criterion.level === "unassessed");

  if (blockingWeak || total < 22) return { total, decision: "resubmit" };
  if (blockingUnassessed || total < 30) return { total, decision: "approved_with_changes" };
  return { total, decision: "approved" };
}

export function proposalHasContent(input: { fileSize: number; text: string }): boolean {
  return input.fileSize > 0 || input.text.trim().length > 0;
}
