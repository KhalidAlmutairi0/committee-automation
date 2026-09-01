"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileUp, LockKeyhole, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/shell";
import { Status } from "@/components/status";
import { usePreviewState } from "@/components/preview-state";
import { proposalHasContent } from "@/domain/workflow";

export default function ProposalPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const { proposalUnlocked } = usePreviewState();

  if (!proposalUnlocked) return (
    <AppShell area="team" title="مقترح الرعاية"><div className="page"><div className="demo-banner"><ShieldAlert size={17} /> هذا مشروع عرض توضيحي.</div><section className="card form-card"><div className="card-body" style={{ textAlign: "center", padding: 48 }}><span className="role-icon" style={{ marginInline: "auto" }}><LockKeyhole size={22} /></span><h2>رفع المقترح مقفل</h2><p style={{ color: "var(--muted)" }}>اجتز فحص الخطة الزمنية أولاً لفتح هذه الخطوة.</p><Link className="button button-primary" href="/team/timeline">الذهاب إلى الخطة الزمنية</Link></div></section></div></AppShell>
  );

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const file = data.get("proposalFile");
    const text = String(data.get("proposalText") || "");
    if (!proposalHasContent({ fileSize: file instanceof File ? file.size : 0, text })) {
      setError("أرفقوا ملفاً أو الصقوا نص المقترح قبل الإرسال.");
      setSubmitted(false);
      return;
    }
    setError("");
    setSubmitted(true);
  }
  return (
    <AppShell area="team" title="مقترح الرعاية">
      <div className="page">
        <div className="demo-banner"><ShieldAlert size={17} /> هذا مشروع عرض توضيحي، وأي استلام هنا محاكاة محلية فقط.</div>
        <div className="page-head"><div><h2>رفع مقترح الرعاية</h2><p><span className="project-code">FTC-26-018</span> · آخر نسخة فقط تدخل المراجعة</p></div><Status tone="green">البوابة مفتوحة</Status></div>
        <div className="notice notice-info form-card" style={{ marginBottom: 18 }}><LockKeyhole size={18} /><div>فُتحت هذه الخطوة بعد اجتياز الخطة الزمنية. لن يصل أي تقييم للفريق قبل اعتماد قائد اللجنة.</div></div>
        <form className="card form-card" onSubmit={submit}>
          <div className="form-section"><h3>نسخة المقترح</h3><p>ارفعوا الملف أو الصقوا النص. في النسخة النهائية سيُحفظ الملف داخل خادم النادي.</p><div className="fields">
            <div className="field full"><label htmlFor="proposalFile">ملف المقترح</label><input id="proposalFile" name="proposalFile" accept=".pdf,.doc,.docx,.txt" type="file" /></div>
            <div className="field full"><label htmlFor="proposalText">أو الصقوا النص هنا</label><textarea id="proposalText" name="proposalText" placeholder="نص مقترح الرعاية…" /></div>
            <div className="field full"><label htmlFor="notes">ملاحظات للجنة (اختياري)</label><input id="notes" /></div>
          </div></div>
          {error && <div aria-live="polite" className="notice notice-warning" style={{ margin: "0 24px" }}>{error}</div>}
          <div className="form-actions"><button className="button button-primary" type="submit"><FileUp size={16} /> إرسال المقترح</button></div>
        </form>
        {submitted && <div aria-live="polite" className="notice notice-info form-card" role="status" style={{ marginTop: 18 }}><CheckCircle2 size={18} /><div><strong>محاكاة: استلمنا النسخة محلياً.</strong><br />لم يُرفع ملف إلى أي خادم، وهذا ليس نتيجة تقييم.</div></div>}
      </div>
    </AppShell>
  );
}
