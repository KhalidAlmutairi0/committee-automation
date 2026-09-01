export type ProjectSize = "صغير" | "متوسط" | "كبير" | "تقني";
export type TimelineDecision = "approved" | "approved_with_warnings" | "resubmit";
export type CheckStatus = "passed" | "failed" | "disabled" | "warning";

export interface ProjectClassificationInput {
  formats: string[];
  attendance: number;
  budget: number;
  stakeholders: string[];
}

export interface ClassificationResult {
  proposedSize: ProjectSize;
  needsLeadReview: boolean;
  reasons: string[];
}

export type MilestoneKey =
  | "ideaApproval"
  | "sponsorClose"
  | "designsDelivery"
  | "regOpen"
  | "regClose"
  | "acceptanceAnnounce"
  | "eventStart"
  | "eventEnd"
  | "finalReport";

export type Milestones = Partial<Record<MilestoneKey, string>>;

export interface PrepActivity {
  title: string;
  date: string;
  openToAll: boolean;
}

export interface TimelineInput {
  size: ProjectSize;
  format: string;
  milestones: Milestones;
  prepActivities: PrepActivity[];
}

export interface TimelineCheck {
  id: `T${number}`;
  name: string;
  status: CheckStatus;
  blocking: boolean;
  message: string;
}

export interface TimelineResult {
  decision: TimelineDecision;
  checks: TimelineCheck[];
}
