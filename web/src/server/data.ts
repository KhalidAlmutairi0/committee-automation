import "server-only";
import { query } from "@/server/db";
import type { SessionUser } from "@/server/auth/session";
import type { ReviewCriterion } from "@/server/review-policy";
import type { TimelineCheck } from "@/domain/types";

export interface ProjectRow {
  id: string; public_id: string; owner_user_id: string; owner_name: string; owner_email: string;
  name: string; lead_name: string; lead_phone: string; deputy_name: string; deputy_phone: string;
  formats: string[]; other_format: string; attendance: number; budget: string; duration: string;
  stakeholders: string[]; resources: string[]; proposed_size: "صغير"|"متوسط"|"كبير"|"تقني";
  approved_size: "صغير"|"متوسط"|"كبير"|"تقني"|null; intake_status: string; intake_reasons: string[];
  timeline_decision: "approved"|"approved_with_warnings"|"resubmit"|null;
  timeline_checks: TimelineCheck[]|null; proposal_id: string|null; proposal_status: string|null;
  review_id: string|null; review_status: string|null; created_at: Date;
}

const PROJECT_SELECT = `SELECT p.*, u.name owner_name, u.email owner_email,
  COALESCE(tl.lead_decision,tl.calculated_decision) timeline_decision, tl.checks timeline_checks,
  pr.id proposal_id, pr.status proposal_status, rv.id review_id, rv.status review_status
  FROM projects p JOIN users u ON u.id=p.owner_user_id
  LEFT JOIN LATERAL (SELECT * FROM timeline_plans WHERE project_id=p.id ORDER BY created_at DESC LIMIT 1) tl ON true
  LEFT JOIN LATERAL (SELECT * FROM proposals WHERE project_id=p.id ORDER BY created_at DESC LIMIT 1) pr ON true
  LEFT JOIN reviews rv ON rv.proposal_id=pr.id`;

export async function teamProjects(userId: string): Promise<ProjectRow[]> {
  return query<ProjectRow>(`${PROJECT_SELECT} WHERE p.owner_user_id=$1 ORDER BY p.created_at DESC`, [userId]);
}

export async function committeeProjects(): Promise<ProjectRow[]> {
  return query<ProjectRow>(`${PROJECT_SELECT} ORDER BY p.created_at DESC`, []);
}

export async function projectForViewer(projectId: string, viewer: SessionUser): Promise<ProjectRow | null> {
  const suffix = viewer.role === "team" ? " AND p.owner_user_id=$2" : "";
  const rows = await query<ProjectRow>(`${PROJECT_SELECT} WHERE (p.id::text=$1 OR p.public_id=$1)${suffix} LIMIT 1`, viewer.role === "team" ? [projectId, viewer.id] : [projectId]);
  return rows[0] ?? null;
}

export interface ReviewRow {
  id: string; proposal_id: string; criteria: ReviewCriterion[]; total: number;
  calculated_decision: "approved"|"approved_with_changes"|"resubmit";
  lead_decision: "approved"|"approved_with_changes"|"resubmit"|null;
  lead_reason: string|null; status: "draft"|"ready"|"sending"|"sent"|"send_failed";
  original_name: string|null; pasted_text: string; notes: string; project_id: string;
  project_name: string; public_id: string; owner_email: string; owner_name: string;
  timeline_checks: TimelineCheck[]|null;
}

export async function reviewForViewer(id: string, viewer: SessionUser): Promise<ReviewRow | null> {
  if (viewer.role === "team") return null;
  const rows = await query<ReviewRow>(`SELECT rv.*, pr.original_name, pr.pasted_text, pr.notes, pr.project_id,
    p.name project_name, p.public_id, u.email owner_email, u.name owner_name, tl.checks timeline_checks
    FROM reviews rv JOIN proposals pr ON pr.id=rv.proposal_id JOIN projects p ON p.id=pr.project_id
    JOIN users u ON u.id=p.owner_user_id
    LEFT JOIN LATERAL (SELECT checks FROM timeline_plans WHERE project_id=p.id ORDER BY created_at DESC LIMIT 1) tl ON true
    WHERE rv.id::text=$1 OR p.public_id=$1 LIMIT 1`, [id]);
  return rows[0] ?? null;
}
