"use client";

import Link from "next/link";
import { ArrowLeft, Check, Clock3, FileText, LockKeyhole, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/shell";
import { Status } from "@/components/status";
import { usePreviewState } from "@/components/preview-state";

export default function TeamDashboard() {
  const { proposalUnlocked, timelineDecision } = usePreviewState();
  return (
    <AppShell area="team" title="بوابة الفريق">
      <div className="page">
        <div className="demo-banner"><ShieldCheck size={17} /> هذه بيانات عرض توضيحية وليست قراراً أو تقييماً لمشروع حقيقي.</div>
        <div className="page-head">
          <div><h2>مرحباً، فريق نبض</h2><p>تابعوا رحلة المشروع وأكملوا الخطوة المتاحة الآن.</p></div>
          <Link className="button button-secondary" href="/team/intake">طلب مشروع جديد</Link>
        </div>
        <div className="grid-2">
          <section className="card">
            <div className="card-header"><h3>المشروع الحالي</h3><span className="project-code">FTC-26-018</span></div>
            <div className="card-body">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 22 }}>
                <div><strong style={{ fontSize: 19 }}>ملتقى الابتكار الطلابي</strong><p style={{ color: "var(--muted)", margin: "5px 0 0", fontSize: 13 }}>هاكاثون · مشروع متوسط</p></div>
                <Status tone="amber">قيد الإعداد</Status>
              </div>
              <div className="progress-list">
                <div className="progress-item"><span className="progress-icon"><Check size={16} /></span><div><strong>استلام وتصنيف المشروع</strong><small>اكتمل واعتمد الحجم المتوسط</small></div><Status tone="green">مكتمل</Status></div>
                <div className="progress-item"><span className="progress-icon"><Clock3 size={16} /></span><div><strong>الخطة الزمنية</strong><small>{timelineDecision ? "تم فحص آخر نسخة" : "جاهزة للتعبئة والفحص الفوري"}</small></div><Link className="button button-ghost" href="/team/timeline">{timelineDecision ? "راجع" : "ابدأ"} <ArrowLeft size={14} /></Link></div>
                <div className="progress-item"><span className={`progress-icon ${proposalUnlocked ? "" : "locked"}`}>{proposalUnlocked ? <Check size={15} /> : <LockKeyhole size={15} />}</span><div><strong>مقترح الرعاية</strong><small>{proposalUnlocked ? "فُتح بعد اجتياز الخطة" : "يفتح بعد اجتياز الخطة الزمنية"}</small></div>{proposalUnlocked ? <Link className="button button-ghost" href="/team/proposal">ارفع <ArrowLeft size={14} /></Link> : <Status tone="gray">مقفل</Status>}</div>
                <div className="progress-item"><span className="progress-icon locked"><FileText size={15} /></span><div><strong>ملاحظات اللجنة</strong><small>تظهر بعد اعتماد قائد اللجنة</small></div><Status tone="gray">لاحقاً</Status></div>
              </div>
            </div>
          </section>
          <div className="stack">
            <section className="card">
              <div className="card-header"><h3>ما المطلوب الآن؟</h3></div>
              <div className="card-body">
                <p style={{ margin: "0 0 18px", color: "var(--muted)", lineHeight: 1.8 }}>أدخلوا تواريخ المشروع والأنشطة التمهيدية. ستظهر نتيجة الفحوصات السبعة فوراً قبل إرسال الخطة.</p>
                <Link className="button button-primary" href="/team/timeline">تعبئة الخطة الزمنية <ArrowLeft size={16} /></Link>
              </div>
            </section>
            <div className="notice notice-warning"><Clock3 size={18} /><div><strong>أربعة فحوصات بانتظار نقل أو بيانات معتمدة</strong><br />ستُذكر صراحةً في النتيجة، ولن يقدم النظام موافقة نظيفة وهي معطّلة.</div></div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
