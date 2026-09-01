import { z } from "zod";

const normalizedEmail = z.string().trim().toLowerCase().email("أدخل بريداً إلكترونياً صحيحاً.");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جداً.").max(120),
  email: normalizedEmail,
  password: z.string().min(12, "كلمة المرور يجب أن تكون 12 خانة على الأقل.")
    .regex(/[A-Za-z\p{L}]/u, "أضف حرفاً واحداً على الأقل.")
    .regex(/[0-9]/, "أضف رقماً واحداً على الأقل.")
});

export const loginSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(1, "أدخل كلمة المرور.").max(256)
});

export const projectIntakeSchema = z.object({
  name: z.string().trim().min(2).max(180),
  leadName: z.string().trim().min(2).max(120),
  leadPhone: z.string().trim().min(7).max(30),
  deputyName: z.string().trim().max(120).optional().default(""),
  deputyPhone: z.string().trim().max(30).optional().default(""),
  formats: z.array(z.string().trim().min(1)).min(1).max(9),
  otherFormat: z.string().trim().max(180).optional().default(""),
  attendance: z.coerce.number().int().positive().max(100_000),
  budget: z.coerce.number().nonnegative().max(100_000_000),
  duration: z.string().trim().min(1).max(80),
  stakeholders: z.array(z.string().trim().min(1)).max(10),
  resources: z.array(z.string().trim().min(1)).max(10)
});

const acceptedProposalTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain"
]);

export const proposalUploadSchema = z.object({
  text: z.string().max(2_000_000),
  fileSize: z.number().int().nonnegative().max(10 * 1024 * 1024),
  fileType: z.string().max(180)
}).superRefine((value, context) => {
  if (!value.text.trim() && value.fileSize === 0) {
    context.addIssue({ code: "custom", message: "أرفق ملفاً أو الصق نص المقترح." });
  }
  if (value.fileSize > 0 && !acceptedProposalTypes.has(value.fileType)) {
    context.addIssue({ code: "custom", message: "نوع الملف غير مدعوم." });
  }
});

const dateValue = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal(""));

export const timelineSubmissionSchema = z.object({
  projectId: z.string().uuid(),
  milestones: z.record(z.string(), dateValue),
  prepActivities: z.array(z.object({
    title: z.string().trim().min(2).max(180),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    openToAll: z.boolean()
  })).max(100)
});

export const reviewSubmissionSchema = z.object({
  proposalId: z.string().uuid(),
  criteriaJson: z.string().max(100_000),
  leadDecision: z.enum(["approved", "approved_with_changes", "resubmit"]).optional(),
  leadReason: z.string().trim().max(4_000).optional().default("")
});
