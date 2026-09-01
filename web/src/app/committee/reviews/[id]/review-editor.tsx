"use client";

import { useMemo, useState } from "react";
import { BotOff, CheckCircle2, Send, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/shell";
import { Status } from "@/components/status";
import { calculateReviewDecision, canSendFeedback, type ReviewDecision, type RubricLevel } from "@/domain/workflow";

type Level = RubricLevel;
const labels: Record<Level, string> = { weak: "ضعيف", acceptable: "مقبول", strong: "قوي", unassessed: "غير قابل للتقييم" };
const decisionLabels: Record<ReviewDecision, string> = { approved: "معتمد", approved_with_changes: "معتمد بتعديلات", resubmit: "إعادة تقديم" };
const initial = [
  { id: 1, title: "الملخص التنفيذي", weight: 1, blocking: false, level: "strong" as Level, quote: "فعالية تقنية تجمع 120 طالباً على مدى ثلاثة أيام في جامعة الملك سعود.", fix: "" },
  { id: 2, title: "الأهداف القابلة للقياس", weight: 3, blocking: true, level: "acceptable" as Level, quote: "تأهيل 80 مشاركاً وتطوير نماذج أولية قابلة للعرض.", fix: "حوّل بقية الأهداف إلى نتائج رقمية قابلة للقياس." },
  { id: 3, title: "الخط الزمني", weight: 2, blocking: true, level: "strong" as Level, quote: "يفتح التسجيل في 25 يوليو وتعلن النتائج في 28 أغسطس 2026.", fix: "" },
  { id: 4, title: "محتوى البرنامج", weight: 3, blocking: false, level: "acceptable" as Level, quote: "اليوم الأول: تعريف وتكوين الفرق. اليوم الثاني: تطوير الحلول.", fix: "سمّ موضوعات الجلسات واربطها بمخرجات كل يوم." },
  { id: 5, title: "باقات الرعاة", weight: 3, blocking: true, level: "acceptable" as Level, quote: "الباقة الذهبية 40,000 ريال والفضية 20,000 ريال.", fix: "حدد عدد الباقات المتاحة من كل فئة." },
  { id: 6, title: "أرقام الأعمال السابقة", weight: 3, blocking: true, level: "unassessed" as Level, quote: "", fix: "بانتظار قرار اللجنة وتعبئة مرجع الأرقام المركزية." },
  { id: 7, title: "الهوية وبيانات التواصل", weight: 2, blocking: true, level: "strong" as Level, quote: "نادي تقنية المستقبل — عمادة شؤون الطلاب — جامعة الملك سعود.", fix: "" },
  { id: 8, title: "الدقة الأساسية", weight: 2, blocking: true, level: "strong" as Level, quote: "Future Technology Club · 2026", fix: "" }
];

export default function ReviewEditor({ projectId }: { projectId: string }) {
  const [criteria, setCriteria] = useState(initial);
  const [decision, setDecision] = useState<ReviewDecision>("approved_with_changes");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [sent, setSent] = useState(false);
  const calculated = useMemo(() => calculateReviewDecision(criteria), [criteria]);
  const overrideNeedsReason = decision !== calculated.decision;
  const sendAllowed = confirmed && (!overrideNeedsReason || reason.trim().length > 0) &&
    canSendFeedback({ reviewStatus: "ready", leadDecision: decision });

  function updateLevel(id: number, level: Level) {
    setCriteria((items) => items.map((item) => item.id === id ? { ...item, level } : item));
  }

  return (
    <AppShell area="committee" title="مراجعة المقترح">
      <div className="page">
        <div className="demo-banner"><ShieldAlert size={17} /> هذه درجات ونصوص عرض توضيحية فقط، وليست ناتج تقييم حقيقي.</div>
        <div className="page-head"><div><h2>ملتقى الابتكار الطلابي</h2><p><span className="project-code">{projectId}</span> · فريق نبض · النسخة الثانية</p></div><Status tone="amber">مسودة للقائد</Status></div>
        <div className="notice notice-warning" style={{ marginBottom: 18 }}><BotOff size={19} /><div><strong>محرك التقييم غير متصل.</strong><br />هذه الشاشة تعرض شكل المراجعة فقط. لن تُرسل أي نتيجة من النسخة المحلية.</div></div>
        <div className="grid-2 review-layout">
          <section className="rubric-list">
            {criteria.map((criterion) => <article className="rubric-item" key={criterion.id}>
              <div className="rubric-top"><div><div className="rubric-title"><h4>{criterion.id}. {criterion.title} {criterion.blocking && "⛔"}</h4><span className="weight">الوزن {criterion.weight}</span></div>{criterion.quote ? <p className="quote">«{criterion.quote}»</p> : <p>لا يوجد اقتباس لأن المعيار معطّل.</p>}{criterion.fix && <p><strong>الإصلاح:</strong> {criterion.fix}</p>}</div>
              <div className="field"><label htmlFor={`level-${criterion.id}`}>نتيجة القائد</label><select id={`level-${criterion.id}`} disabled={criterion.id === 6} value={criterion.level} onChange={(event) => updateLevel(criterion.id, event.target.value as Level)}>{Object.entries(labels).filter(([level]) => criterion.id !== 8 || level !== "acceptable").map(([level, label]) => <option value={level} key={level}>{label}</option>)}</select></div></div>
            </article>)}
          </section>
          <aside className="card review-summary"><div className="card-header"><h3>القرار النهائي</h3></div><div className="card-body">
            <span style={{ color: "var(--muted)", fontSize: 12 }}>المجموع الحالي</span><div className="score">{calculated.total}<small> / 38</small></div>
            <p style={{ margin: "2px 0 0", fontSize: 12 }}>القرار المحسوب: <strong>{decisionLabels[calculated.decision]}</strong></p>
            <div className="divider" />
            <div className="field"><label htmlFor="decision">قرار القائد</label><select id="decision" value={decision} onChange={(event) => setDecision(event.target.value as ReviewDecision)}><option value="approved">معتمد</option><option value="approved_with_changes">معتمد بتعديلات</option><option value="resubmit">إعادة تقديم</option></select></div>
            <div className="field" style={{ marginTop: 14 }}><label htmlFor="reason">سبب قرار القائد {overrideNeedsReason && "(إلزامي)"}</label><textarea aria-required={overrideNeedsReason} id="reason" onChange={(event) => setReason(event.target.value)} style={{ minHeight: 88 }} value={reason} placeholder="إلزامي إذا تغيّر القرار المحسوب" /></div>
            {overrideNeedsReason && !reason.trim() && <p className="field-error" role="status">اكتب سبب اختلاف القرار قبل الإرسال.</p>}
            <label className="check-row" style={{ margin: "17px 0" }}><input checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} type="checkbox" /> راجعت الدرجات والنص الذي سيصل للفريق</label>
            <button className="button button-primary" disabled={!sendAllowed} onClick={() => setSent(true)} style={{ width: "100%" }}><Send size={16} /> اعتماد وإرسال</button>
            <p style={{ color: "var(--muted)", fontSize: 11, lineHeight: 1.7, marginBottom: 0 }}>في المنتج التشغيلي، الإرسال متاح لقائد اللجنة فقط ويُسجل مرة واحدة.</p>
          </div></aside>
        </div>
        {sent && <div aria-live="polite" className="toast" role="status"><CheckCircle2 size={17} style={{ verticalAlign: "middle", marginLeft: 8 }} />محاكاة فقط: لم يُرسل بريد حقيقي.</div>}
      </div>
    </AppShell>
  );
}
