"use client";

import { useState } from "react";
import { ArrowLeft, Info, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/shell";
import { Status } from "@/components/status";
import { classifyProject } from "@/domain/classification";
import type { ClassificationResult } from "@/domain/types";

const formats = ["ورشة عمل", "جلسة حوارية", "نشاط بسيط", "ميني هاكثون", "هاكاثون", "معسكر تدريبي", "معرض", "مشروع تقني / هاردوير"];

export default function IntakePage() {
  const [result, setResult] = useState<ClassificationResult | null>(null);

  function submit(formData: FormData) {
    setResult(classifyProject({
      formats: [String(formData.get("format"))],
      attendance: Number(formData.get("attendance")),
      budget: Number(formData.get("budget")),
      stakeholders: formData.get("government") ? ["جهة حكومية أو وزارة"] : ["لا يوجد"]
    }));
  }

  return (
    <AppShell area="team" title="طلب مشروع جديد">
      <div className="page">
        <div className="demo-banner"><ShieldAlert size={17} /> نموذج عرض محلي فقط. لا تُرسل الأسماء أو بيانات التواصل إلى أي خادم.</div>
        <div className="page-head"><div><h2>عرّفنا على مشروعكم</h2><p>تُستخدم هذه البيانات لاقتراح حجم المشروع ومساره المناسب.</p></div></div>
        <form className="card form-card" action={submit}>
          <div className="form-section"><h3>بيانات أساسية</h3><p>بيانات التواصل الأساسية للمشروع.</p><div className="fields">
            <div className="field"><label htmlFor="projectName">اسم المشروع</label><input id="projectName" name="projectName" required placeholder="مثال: ملتقى الابتكار" /></div>
            <div className="field"><label htmlFor="leadName">اسم قائد المشروع</label><input id="leadName" name="leadName" required /></div>
            <div className="field"><label htmlFor="email">البريد الجامعي</label><input id="email" name="email" required type="email" /></div>
            <div className="field"><label htmlFor="phone">رقم التواصل</label><input id="phone" name="phone" required inputMode="tel" /></div>
          </div></div>
          <div className="form-section"><h3>نطاق المشروع</h3><p>الأرقام هنا تقديرية وتُراجع لاحقاً.</p><div className="fields">
            <div className="field"><label htmlFor="format">نوع المشروع</label><select id="format" name="format" defaultValue="ورشة عمل">{formats.map((format) => <option key={format}>{format}</option>)}</select></div>
            <div className="field"><label htmlFor="attendance">عدد الحضور المتوقع</label><input id="attendance" name="attendance" min="1" required type="number" defaultValue="45" /></div>
            <div className="field"><label htmlFor="budget">الميزانية التقديرية (ر.س)</label><input id="budget" name="budget" min="0" required type="number" defaultValue="4000" /></div>
            <div className="field"><label>جهة حكومية</label><label className="check-row"><input name="government" type="checkbox" /> يشمل المشروع جهة حكومية أو وزارة</label></div>
          </div></div>
          <div className="form-actions"><button className="button button-primary" type="submit">احسب المسار المقترح <ArrowLeft size={16} /></button></div>
        </form>
        {result && <section aria-live="polite" className="result-panel form-card" role="status">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}><div><small style={{ color: "var(--muted)" }}>{result.needsLeadReview ? "حالة الطلب" : "الحجم المعتمد تلقائياً"}</small><h3 style={{ margin: "4px 0" }}>{result.needsLeadReview ? "بانتظار قرار قائد اللجنة" : result.proposedSize}</h3></div><Status tone={result.needsLeadReview ? "amber" : "green"}>{result.needsLeadReview ? "قيد المراجعة" : "تصنيف تلقائي"}</Status></div>
          {result.reasons.length > 0 && <div className="notice notice-warning" style={{ marginTop: 14 }}><Info size={17} /><div>{result.needsLeadReview ? "تحتاج بيانات الطلب إلى مراجعة قائد اللجنة. لن يظهر حجم غير معتمد للفريق." : result.reasons.join(" ")}</div></div>}
        </section>}
      </div>
    </AppShell>
  );
}
