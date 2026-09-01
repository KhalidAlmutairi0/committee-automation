"use server";

import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSession, deleteSession, requireCommittee, requireLead, requireUser } from "@/server/auth/session";
import { database, query, transaction } from "@/server/db";
import { classifyProject } from "@/domain/classification";
import { checkTimeline } from "@/domain/timeline";
import type { Milestones, PrepActivity, ProjectSize } from "@/domain/types";
import { canUploadProposal } from "@/domain/workflow";
import { deliverOutbox, smtpConfigured } from "@/server/email";
import { assertReviewReady, buildFeedbackMessage, emptyReviewCriteria, finalDecisionAllowed, normalizeReviewCriteria, reviewOutcome } from "@/server/review-policy";
import { loginSchema, projectIntakeSchema, proposalUploadSchema, registerSchema, reviewSubmissionSchema, timelineSubmissionSchema } from "@/server/validation";

export type ActionState = { error?: string; success?: string };

function firstError(error: { issues: Array<{message:string}> }): string {
  return error.issues[0]?.message || "تحقق من البيانات وحاول مرة أخرى.";
}

export async function registerAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({ name: formData.get("name"), email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const registrationCode = process.env.TEAM_REGISTRATION_CODE;
  if (!registrationCode || String(formData.get("registrationCode") || "") !== registrationCode) return { error: "رمز تسجيل الفريق غير صحيح أو التسجيل مغلق." };
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  let userId: string;
  try {
    const rows = await query<{id:string}>("INSERT INTO users(email,name,password_hash,role) VALUES($1,$2,$3,'team') RETURNING id", [parsed.data.email, parsed.data.name, passwordHash]);
    userId = rows[0].id;
  } catch (error) {
    if ((error as {code?:string}).code === "23505") return { error: "هذا البريد مسجل مسبقاً." };
    throw error;
  }
  await createSession(userId);
  redirect("/team");
}

export async function loginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",").map((value)=>value.trim()).filter(Boolean);
  const clientAddress = requestHeaders.get("x-real-ip") || forwarded?.at(-1) || "unresolved";
  const key = createHash("sha256").update(`${clientAddress}:${parsed.data.email}`).digest("hex");
  const attempts = await query<{attempts:number;blocked_until:Date|null}>("SELECT attempts,blocked_until FROM login_attempts WHERE key_hash=$1", [key]);
  if (attempts[0]?.blocked_until && new Date(attempts[0].blocked_until) > new Date()) return { error: "محاولات كثيرة. انتظر 15 دقيقة ثم حاول مجدداً." };
  const users = await query<{id:string;password_hash:string;role:string}>("SELECT id,password_hash,role FROM users WHERE email=$1 LIMIT 1", [parsed.data.email]);
  const valid = users[0] ? await bcrypt.compare(parsed.data.password, users[0].password_hash) : false;
  if (!valid) {
    await query(`INSERT INTO login_attempts(key_hash,attempts,window_started_at,blocked_until) VALUES($1,1,now(),NULL)
      ON CONFLICT(key_hash) DO UPDATE SET attempts=CASE WHEN login_attempts.window_started_at < now()-interval '15 minutes' THEN 1 ELSE login_attempts.attempts+1 END,
      window_started_at=CASE WHEN login_attempts.window_started_at < now()-interval '15 minutes' THEN now() ELSE login_attempts.window_started_at END,
      blocked_until=CASE WHEN login_attempts.attempts+1 >= 8 AND login_attempts.window_started_at >= now()-interval '15 minutes' THEN now()+interval '15 minutes' ELSE NULL END`, [key]);
    return { error: "البريد أو كلمة المرور غير صحيحة." };
  }
  await query("DELETE FROM login_attempts WHERE key_hash=$1", [key]);
  await createSession(users[0].id);
  redirect(users[0].role === "team" ? "/team" : "/committee");
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/");
}

export async function createProjectAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (user.role !== "team") return { error: "هذه العملية متاحة للفرق فقط." };
  const formats = formData.getAll("formats").map(String).filter(Boolean);
  const otherFormat = String(formData.get("otherFormat") || "").trim();
  if (otherFormat && !formats.includes(otherFormat)) formats.push(otherFormat);
  const stakeholders = formData.getAll("stakeholders").map(String).filter(Boolean);
  const resources = formData.getAll("resources").map(String).filter(Boolean);
  const parsed = projectIntakeSchema.safeParse({
    name: formData.get("name"), leadName: formData.get("leadName"), leadPhone: formData.get("leadPhone"),
    deputyName: formData.get("deputyName"), deputyPhone: formData.get("deputyPhone"), formats,
    otherFormat, attendance: formData.get("attendance"), budget: formData.get("budget"),
    duration: formData.get("duration"), stakeholders, resources
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const classification = classifyProject({ formats: parsed.data.formats, attendance: parsed.data.attendance, budget: parsed.data.budget, stakeholders: parsed.data.stakeholders });
  const created = await transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [user.id]);
    const counts = await client.query<{count:string}>("SELECT count(*)::text count FROM projects WHERE owner_user_id=$1", [user.id]);
    if (Number(counts.rows[0]?.count || 0) >= 10) return false;
    const sequence = await client.query<{nextval:string}>("SELECT nextval('project_number_seq')");
    const publicId = `FTC-${String(new Date().getFullYear()).slice(-2)}-${String(sequence.rows[0].nextval).padStart(3, "0")}`;
    await client.query(`INSERT INTO projects(public_id,owner_user_id,name,lead_name,lead_phone,deputy_name,deputy_phone,formats,other_format,attendance,budget,duration,stakeholders,resources,proposed_size,approved_size,intake_status,intake_reasons)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`, [publicId,user.id,parsed.data.name,parsed.data.leadName,parsed.data.leadPhone,parsed.data.deputyName,parsed.data.deputyPhone,parsed.data.formats,parsed.data.otherFormat,parsed.data.attendance,parsed.data.budget,parsed.data.duration,parsed.data.stakeholders,parsed.data.resources,classification.proposedSize,classification.needsLeadReview?null:classification.proposedSize,classification.needsLeadReview?"pending_lead":"auto_approved",JSON.stringify(classification.reasons)]);
    return true;
  });
  if (!created) return { error: "وصل الحساب إلى الحد الأعلى: 10 مشاريع." };
  revalidatePath("/team");
  redirect("/team");
}

export async function approveProjectSizeAction(formData: FormData): Promise<void> {
  const lead = await requireLead();
  const projectId = String(formData.get("projectId") || "");
  const size = String(formData.get("size") || "");
  if (!/^[0-9a-f-]{36}$/i.test(projectId) || !["صغير","متوسط","كبير","تقني"].includes(size)) throw new Error("بيانات اعتماد الحجم غير صالحة.");
  const rows = await query<{id:string}>("UPDATE projects SET approved_size=$2,intake_status='lead_approved',updated_at=now() WHERE id=$1 RETURNING id", [projectId,size]);
  if (!rows[0]) throw new Error("المشروع غير موجود.");
  await query("INSERT INTO audit_logs(actor_user_id,project_id,event_type,details) VALUES($1,$2,'project_size_approved',$3)", [lead.id,projectId,JSON.stringify({size})]);
  revalidatePath("/committee");
}

export async function setCommitteeMemberAction(formData: FormData): Promise<void> {
  const lead = await requireLead();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("البريد غير صالح.");
  const rows = await query<{id:string}>("UPDATE users SET role='committee_member',updated_at=now() WHERE email=$1 AND role='team' RETURNING id", [email]);
  if (!rows[0]) throw new Error("سجّل هذا البريد كحساب فريق أولاً، أو أنه عضو لجنة بالفعل.");
  await query("INSERT INTO audit_logs(actor_user_id,event_type,details) VALUES($1,'committee_member_added',$2)", [lead.id,JSON.stringify({email})]);
  revalidatePath("/committee");
}

export async function decideTimelineAction(formData: FormData): Promise<void> {
  const lead = await requireLead();
  const projectId = String(formData.get("projectId") || "");
  const decision = String(formData.get("decision") || "");
  const reason = String(formData.get("reason") || "").trim().slice(0,4000);
  if (!/^[0-9a-f-]{36}$/i.test(projectId) || !["approved","approved_with_warnings","resubmit"].includes(decision)) throw new Error("بيانات قرار الخطة غير صالحة.");
  const plans = await query<{id:string;calculated_decision:string}>("SELECT id,calculated_decision FROM timeline_plans WHERE project_id=$1 ORDER BY created_at DESC LIMIT 1", [projectId]);
  if (!plans[0]) throw new Error("لا توجد خطة لهذا المشروع.");
  if (decision !== plans[0].calculated_decision && !reason) throw new Error("سبب اختلاف قرار القائد إلزامي.");
  await query("UPDATE timeline_plans SET lead_decision=$2,lead_reason=$3 WHERE id=$1", [plans[0].id,decision,reason||null]);
  await query("INSERT INTO audit_logs(actor_user_id,project_id,event_type,details) VALUES($1,$2,'timeline_decided',$3)", [lead.id,projectId,JSON.stringify({decision,reason})]);
  revalidatePath("/committee"); revalidatePath("/team");
}

const milestoneKeys = ["ideaApproval","sponsorClose","designsDelivery","regOpen","regClose","acceptanceAnnounce","eventStart","eventEnd","finalReport"] as const;

export async function submitTimelineAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (user.role !== "team") return { error: "هذه العملية متاحة للفرق فقط." };
  let prepActivities: PrepActivity[];
  try { prepActivities = JSON.parse(String(formData.get("prepActivities") || "[]")); }
  catch { return { error: "بيانات الأنشطة التمهيدية غير صالحة." }; }
  const milestones = Object.fromEntries(milestoneKeys.map((key) => [key, String(formData.get(key) || "")])) as Milestones;
  const parsed = timelineSubmissionSchema.safeParse({ projectId: formData.get("projectId"), milestones, prepActivities });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const projects = await query<{id:string;owner_user_id:string;approved_size:ProjectSize|null;proposed_size:ProjectSize;formats:string[]}>("SELECT id,owner_user_id,approved_size,proposed_size,formats FROM projects WHERE id=$1 AND owner_user_id=$2", [parsed.data.projectId,user.id]);
  const project = projects[0];
  if (!project) return { error: "المشروع غير موجود أو لا تملكه." };
  if (!project.approved_size) return { error: "حجم المشروع ينتظر اعتماد قائد اللجنة." };
  const result = checkTimeline({ size: project.approved_size, format: project.formats[0] || "", milestones, prepActivities: parsed.data.prepActivities });
  await query("INSERT INTO timeline_plans(project_id,submitted_by,milestones,prep_activities,checks,calculated_decision) VALUES($1,$2,$3,$4,$5,$6)", [project.id,user.id,JSON.stringify(milestones),JSON.stringify(parsed.data.prepActivities),JSON.stringify(result.checks),result.decision]);
  revalidatePath("/team"); revalidatePath("/team/timeline");
  return { success: result.decision === "resubmit" ? "حُفظت الخطة وتحتاج إعادة تقديم." : "حُفظت الخطة وفُتحت خطوة المقترح." };
}

export async function submitProposalAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (user.role !== "team") return { error: "هذه العملية متاحة للفرق فقط." };
  const projectId = String(formData.get("projectId") || "");
  const projects = await query<{id:string}>(`SELECT p.id FROM projects p JOIN LATERAL
    (SELECT COALESCE(t.lead_decision,t.calculated_decision) decision FROM timeline_plans t WHERE t.project_id=p.id ORDER BY t.created_at DESC LIMIT 1) latest ON true
    WHERE p.id=$1 AND p.owner_user_id=$2 AND latest.decision IN ('approved','approved_with_warnings')`, [projectId,user.id]);
  if (!projects[0]) return { error: "رفع المقترح مقفل حتى تجتاز الخطة الزمنية." };
  const fileValue = formData.get("proposalFile");
  const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
  const text = String(formData.get("proposalText") || "");
  const parsed = proposalUploadSchema.safeParse({ text, fileSize: file?.size || 0, fileType: file?.type || "" });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const bytes = file ? Buffer.from(await file.arrayBuffer()) : null;
  const limitError = await transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [user.id]);
    const usage = await client.query<{versions:string}>("SELECT count(*)::text versions FROM proposals WHERE project_id=$1", [projectId]);
    if (Number(usage.rows[0]?.versions || 0) >= 5) return "وصل المشروع إلى الحد الأعلى: 5 نسخ مقترح.";
    const accountUsage = await client.query<{bytes:string}>("SELECT COALESCE(sum(pr.file_size),0)::text bytes FROM proposals pr JOIN projects p ON p.id=pr.project_id WHERE p.owner_user_id=$1", [user.id]);
    if (Number(accountUsage.rows[0]?.bytes || 0) + (file?.size || 0) > 25 * 1024 * 1024) return "وصل الحساب إلى حد تخزين الملفات (25 MB).";
    const inserted = await client.query<{id:string}>(`INSERT INTO proposals(project_id,submitted_by,original_name,mime_type,file_size,file_data,pasted_text,notes,status)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,'received') RETURNING id`, [projectId,user.id,file?.name||null,file?.type||null,file?.size||0,bytes,text,String(formData.get("notes")||"").trim().slice(0,4000)]);
    const criteria = emptyReviewCriteria();
    const outcome = reviewOutcome(criteria);
    await client.query("INSERT INTO reviews(proposal_id,criteria,total,calculated_decision,status) VALUES($1,$2,$3,$4,'draft')", [inserted.rows[0].id,JSON.stringify(criteria),outcome.total,outcome.decision]);
    await client.query("INSERT INTO audit_logs(actor_user_id,project_id,event_type,details) VALUES($1,$2,'proposal_submitted',$3)", [user.id,projectId,JSON.stringify({fileName:file?.name||null,fileSize:file?.size||0})]);
    return null;
  });
  if (limitError) return { error: limitError };
  revalidatePath("/team"); revalidatePath("/team/proposal"); revalidatePath("/committee");
  return { success: "استلمنا المقترح وحُفظ داخل المنصة." };
}

export async function saveReviewAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireCommittee();
  const parsed = reviewSubmissionSchema.safeParse({ proposalId: formData.get("proposalId"), criteriaJson: formData.get("criteriaJson"), leadReason: "" });
  if (!parsed.success) return { error: firstError(parsed.error) };
  let criteria;
  try { criteria = normalizeReviewCriteria(JSON.parse(parsed.data.criteriaJson)); }
  catch (error) { return { error: String((error as Error).message) }; }
  const outcome = reviewOutcome(criteria);
  const ready = criteria.every((item) => item.id === 6 || item.level !== "unassessed");
  const saved = await query<{id:string}>("UPDATE reviews SET criteria=$2,total=$3,calculated_decision=$4,status=$5,reviewed_by=$6,updated_at=now() WHERE proposal_id=$1 AND status IN ('draft','ready') RETURNING id", [parsed.data.proposalId,JSON.stringify(criteria),outcome.total,outcome.decision,ready?"ready":"draft",user.id]);
  if (!saved[0]) return { error: "المراجعة غير موجودة أو دخلت مرحلة الإرسال ولا يمكن تعديلها." };
  revalidatePath("/committee"); revalidatePath("/committee/reviews/[id]", "page");
  return { success: ready ? "حُفظت المراجعة وأصبحت جاهزة للقائد." : "حُفظت مسودة المراجعة." };
}

export async function sendReviewAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const lead = await requireLead();
  if (!smtpConfigured()) return { error: "إعدادات SMTP غير مكتملة؛ لم يُرسل أي بريد ولم تتغير الحالة." };
  const parsed = reviewSubmissionSchema.safeParse({ proposalId: formData.get("proposalId"), criteriaJson: formData.get("criteriaJson"), leadDecision: formData.get("leadDecision"), leadReason: formData.get("leadReason") });
  if (!parsed.success || !parsed.data.leadDecision) return { error: parsed.success ? "اختر قرار القائد." : firstError(parsed.error) };
  let criteria;
  try { criteria = normalizeReviewCriteria(JSON.parse(parsed.data.criteriaJson)); assertReviewReady(criteria); }
  catch (error) { return { error: String((error as Error).message) }; }
  const outcome = reviewOutcome(criteria);
  if (!finalDecisionAllowed(criteria, parsed.data.leadDecision)) return { error: "لا يمكن اختيار «معتمد» وفيه معيار حاجب غير قابل للتقييم." };
  if (parsed.data.leadDecision !== outcome.decision && !parsed.data.leadReason) return { error: "اكتب سبب اختلاف قرار القائد عن القرار المحسوب." };
  const context = await query<{review_id:string;status:string;project_id:string;project_name:string;owner_email:string;checks:Array<{id:string;name:string;status:string}>|null}>(`SELECT rv.id review_id,rv.status,pr.project_id,p.name project_name,u.email owner_email,tl.checks
    FROM reviews rv JOIN proposals pr ON pr.id=rv.proposal_id JOIN projects p ON p.id=pr.project_id JOIN users u ON u.id=p.owner_user_id
    LEFT JOIN LATERAL (SELECT checks FROM timeline_plans WHERE project_id=p.id ORDER BY created_at DESC LIMIT 1) tl ON true WHERE rv.proposal_id=$1`, [parsed.data.proposalId]);
  const row = context[0];
  if (!row) return { error: "المراجعة غير موجودة." };
  if (["sending","sent","send_failed"].includes(row.status)) return { error: "هذه المراجعة أُرسلت أو تحتاج تدخلاً يدوياً قبل أي محاولة أخرى." };
  const disabledChecks = (row.checks || []).filter((check) => check.status === "disabled").map((check) => `${check.id} — ${check.name}`);
  const message = buildFeedbackMessage({ projectName: row.project_name, decision: parsed.data.leadDecision, leadReason: parsed.data.leadReason, criteria, disabledChecks });
  const sendLock = await database().connect();
  let deliveryStarted = false;
  try {
    await sendLock.query("SELECT pg_advisory_lock(hashtext($1))", [row.review_id]);
    const outboxId = await transaction(async (client) => {
      const locked = await client.query<{status:string}>("SELECT status FROM reviews WHERE id=$1 FOR UPDATE", [row.review_id]);
      if (!locked.rows[0] || ["sending","sent","send_failed"].includes(locked.rows[0].status)) throw new Error("الإرسال غير متاح لهذه المراجعة.");
      await client.query("UPDATE reviews SET criteria=$2,total=$3,calculated_decision=$4,lead_decision=$5,lead_reason=$6,status='sending',reviewed_by=$7,updated_at=now() WHERE id=$1", [row.review_id,JSON.stringify(criteria),outcome.total,outcome.decision,parsed.data.leadDecision,parsed.data.leadReason,lead.id]);
      await client.query("UPDATE proposals SET status='reviewing' WHERE id=$1", [parsed.data.proposalId]);
      const inserted = await client.query<{id:string}>("INSERT INTO email_outbox(deduplication_key,recipient,subject,text_body,status) VALUES($1,$2,$3,$4,'pending') RETURNING id", [`review:${row.review_id}:${randomUUID()}`,row.owner_email,message.subject,message.text]);
      return inserted.rows[0].id;
    });
    deliveryStarted = true;
    await deliverOutbox(outboxId);
    await transaction(async (client) => {
      await client.query("UPDATE reviews SET status='sent',sent_at=now(),updated_at=now() WHERE id=$1", [row.review_id]);
      await client.query("UPDATE proposals SET status='sent' WHERE id=$1", [parsed.data.proposalId]);
      await client.query("INSERT INTO audit_logs(actor_user_id,project_id,event_type,details) VALUES($1,$2,'feedback_sent',$3)", [lead.id,row.project_id,JSON.stringify({reviewId:row.review_id,decision:parsed.data.leadDecision,disabledChecks})]);
    });
  } catch (error) {
    if (deliveryStarted) {
      await query("UPDATE reviews SET status='send_failed',updated_at=now() WHERE id=$1 AND status='sending'", [row.review_id]);
      await query("UPDATE proposals SET status='send_failed' WHERE id=$1 AND status='reviewing'", [parsed.data.proposalId]);
      return { error: "فشل إرسال البريد. الحالة معلّمة كفشل إرسال ولن يعيد النظام المحاولة تلقائياً." };
    }
    return { error: String((error as Error).message || "الإرسال غير متاح لهذه المراجعة.") };
  } finally {
    await sendLock.query("SELECT pg_advisory_unlock(hashtext($1))", [row.review_id]);
    sendLock.release();
  }
  revalidatePath("/committee"); revalidatePath("/committee/reviews/[id]", "page");
  return { success: "اعتمد القائد المراجعة وأُرسل البريد للفريق." };
}

export async function resetFailedSendAction(formData: FormData): Promise<void> {
  const lead = await requireLead();
  const proposalId = String(formData.get("proposalId") || "");
  if (String(formData.get("confirmNoDelivery") || "") !== "yes") throw new Error("يجب تأكيد مراجعة البريد المرسل أولاً.");
  await transaction(async (client) => {
    const rows = await client.query<{id:string;status:string;project_id:string;updated_at:Date}>("SELECT rv.id,rv.status,rv.updated_at,pr.project_id FROM reviews rv JOIN proposals pr ON pr.id=rv.proposal_id WHERE rv.proposal_id=$1 FOR UPDATE", [proposalId]);
    const review = rows.rows[0];
    if (!review || !["sending","send_failed"].includes(review.status)) throw new Error("هذه المراجعة لا تحتاج إعادة فتح الإرسال.");
    const lock = await client.query<{locked:boolean}>("SELECT pg_try_advisory_xact_lock(hashtext($1)) locked", [review.id]);
    if (!lock.rows[0]?.locked) throw new Error("عملية الإرسال ما زالت تعمل. انتظر حتى تنتهي.");
    if (review.status === "sending" && Date.now() - new Date(review.updated_at).getTime() < 15 * 60_000) throw new Error("انتظر 15 دقيقة قبل استعادة إرسال عالق.");
    await client.query("UPDATE email_outbox SET status='failed',last_error='Reset by committee lead after confirming no delivery' WHERE deduplication_key LIKE $1 AND status IN ('pending','sending')", [`review:${review.id}:%`]);
    await client.query("UPDATE reviews SET status='ready',updated_at=now() WHERE id=$1", [review.id]);
    await client.query("UPDATE proposals SET status='reviewing' WHERE id=$1", [proposalId]);
    await client.query("INSERT INTO audit_logs(actor_user_id,project_id,event_type,details) VALUES($1,$2,'failed_send_reset',$3)", [lead.id,review.project_id,JSON.stringify({reviewId:review.id})]);
  });
  revalidatePath("/committee"); revalidatePath("/committee/reviews/[id]", "page");
}
