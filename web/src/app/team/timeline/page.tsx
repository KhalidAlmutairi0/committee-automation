"use client";

import { useState } from "react";
import { CalendarCheck, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/shell";
import { Status } from "@/components/status";
import { usePreviewState } from "@/components/preview-state";
import { checkTimeline } from "@/domain/timeline";
import type { PrepActivity, TimelineResult } from "@/domain/types";

const milestones = [
  ["ideaApproval", "إقرار الفكرة"], ["sponsorClose", "إغلاق الرعاية"],
  ["designsDelivery", "تسليم التصاميم النهائية"], ["regOpen", "فتح التسجيل"],
  ["regClose", "إغلاق التسجيل"], ["acceptanceAnnounce", "إعلان المقبولين"],
  ["eventStart", "بداية الحدث"], ["eventEnd", "نهاية الحدث"], ["finalReport", "تسليم التقرير الختامي"]
] as const;

export default function TimelinePage() {
  const [activities, setActivities] = useState<PrepActivity[]>([]);
  const [result, setResult] = useState<TimelineResult | null>(null);
  const { setTimelineDecision } = usePreviewState();

  function addActivity() { setActivities((items) => [...items, { title: "", date: "", openToAll: false }]); }
  function updateActivity(index: number, patch: Partial<PrepActivity>) { setActivities((items) => items.map((item, i) => i === index ? { ...item, ...patch } : item)); }
  function removeActivity(index: number) { setActivities((items) => items.filter((_, i) => i !== index)); }

  function submit(formData: FormData) {
    const dates = Object.fromEntries(milestones.map(([key]) => [key, String(formData.get(key) || "")]).filter(([, value]) => value));
    const next = checkTimeline({ size: "متوسط", format: "هاكاثون", milestones: dates, prepActivities: activities });
    setResult(next);
    setTimelineDecision(next.decision);
  }

  return (
    <AppShell area="team" title="الخطة الزمنية">
      <div className="page">
        <div className="demo-banner"><CalendarCheck size={17} /> هذا مشروع عرض توضيحي، وليس خطة أو قراراً حقيقياً.</div>
        <div className="page-head"><div><h2>خطّة ملتقى الابتكار</h2><p><span className="project-code">FTC-26-018</span> · هاكاثون متوسط</p></div><Status tone="amber">مسودة</Status></div>
        <form className="card form-card" action={submit}>
          <div className="form-section"><h3>المعالم الأساسية</h3><p>اكتبوا التواريخ الميلادية. المعالم المطلوبة تُراجع بحسب حجم المشروع ونوعه.</p><div className="fields">
            {milestones.map(([key, label]) => <div className="field" key={key}><label htmlFor={key}>{label}</label><input id={key} name={key} type="date" /></div>)}
          </div></div>
          <div className="form-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><div><h3>الأنشطة التمهيدية</h3><p style={{ marginBottom: 0 }}>ورش أو جلسات أو تدريبات تسبق الحدث. العدد غير محدود.</p></div><button className="button button-secondary" onClick={addActivity} type="button"><Plus size={15} /> إضافة نشاط</button></div>
            {activities.length === 0 && <div className="notice notice-info" style={{ marginTop: 18 }}><CalendarCheck size={18} /><div>لا توجد أنشطة مضافة. أضف نشاطاً فقط إذا كان جزءاً من البرنامج.</div></div>}
            {activities.map((activity, index) => <div className="activity-row" key={index}>
              <div className="field"><label htmlFor={`activity-title-${index}`}>عنوان النشاط</label><input id={`activity-title-${index}`} value={activity.title} onChange={(e) => updateActivity(index, { title: e.target.value })} /></div>
              <div className="field"><label htmlFor={`activity-date-${index}`}>التاريخ</label><input id={`activity-date-${index}`} type="date" value={activity.date} onChange={(e) => updateActivity(index, { date: e.target.value })} /></div>
              <label className="check-row" htmlFor={`activity-open-${index}`} style={{ minHeight: 40 }}><input id={`activity-open-${index}`} checked={activity.openToAll} onChange={(e) => updateActivity(index, { openToAll: e.target.checked })} type="checkbox" /> مفتوح للجميع</label>
              <button aria-label="حذف النشاط" className="icon-button" onClick={() => removeActivity(index)} type="button"><Trash2 size={16} /></button>
            </div>)}
          </div>
          <div className="form-actions"><button className="button button-secondary" disabled title="يتاح مع التخزين في النسخة التشغيلية" type="button">حفظ كمسودة (قريباً)</button><button className="button button-primary" type="submit">فحص الخطة</button></div>
        </form>
        {result && <section aria-live="polite" className="result-panel form-card" role="status">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><h3 style={{ margin: 0 }}>نتيجة الفحص</h3><Status tone={result.decision === "resubmit" ? "red" : result.decision === "approved" ? "green" : "amber"}>{result.decision === "resubmit" ? "إعادة تقديم" : result.decision === "approved" ? "معتمد" : "معتمد بتنبيهات"}</Status></div>
          {result.checks.map((check) => <div className="check-result" key={check.id}><span className="check-code">{check.id}</span><div><strong>{check.name}</strong><p>{check.message}</p></div><Status tone={check.status === "passed" ? "green" : check.status === "failed" ? "red" : "gray"}>{check.status === "passed" ? "ناجح" : check.status === "failed" ? "فاشل" : "غير مفعّل"}</Status></div>)}
        </section>}
      </div>
    </AppShell>
  );
}
