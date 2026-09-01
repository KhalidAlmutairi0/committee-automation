import Link from "next/link";
import { ArrowLeft, BotOff, CircleAlert, Clock3, FileCheck2 } from "lucide-react";
import { AppShell } from "@/components/shell";
import { Status } from "@/components/status";

const projects = [
  { id: "FTC-26-018", name: "ملتقى الابتكار الطلابي", team: "فريق نبض", stage: "مراجعة المقترح", status: "مسودة جاهزة", tone: "amber" as const, action: true },
  { id: "FTC-26-017", name: "ورشة بناء المنتجات", team: "فريق أثر", stage: "الخطة الزمنية", status: "بانتظار الفريق", tone: "gray" as const, action: false },
  { id: "FTC-26-016", name: "معرض الحلول التقنية", team: "فريق مدى", stage: "قرار الحجم", status: "يحتاج قراراً", tone: "red" as const, action: false },
  { id: "FTC-26-015", name: "جلسة مؤسسي المستقبل", team: "فريق أفق", stage: "مكتمل", status: "أُرسل للفريق", tone: "green" as const, action: false }
];

export default function CommitteeDashboard() {
  return (
    <AppShell area="committee" title="لوحة المتابعة">
      <div className="page">
        <div className="demo-banner"><CircleAlert size={17} /> أرقام ومشاريع هذه الشاشة للعرض فقط، وليست سجلات تشغيلية.</div>
        <div className="page-head"><div><h2>صباح الخير</h2><p>هذه الأعمال التي تحتاج انتباه اللجنة اليوم.</p></div><button className="button button-primary" disabled title="يتاح في النسخة التشغيلية">إضافة مشروع (قريباً)</button></div>
        <div className="stats">
          <div className="stat-card"><span>مشاريع نشطة</span><strong>12</strong><small>هذا الفصل</small></div>
          <div className="stat-card"><span>تحتاج قراراً</span><strong>3</strong><small>من قائد اللجنة</small></div>
          <div className="stat-card"><span>بانتظار الفرق</span><strong>5</strong><small>لا إجراء مطلوب</small></div>
          <div className="stat-card"><span>مكتملة</span><strong>4</strong><small>أُرسلت نتائجها</small></div>
        </div>
        <div className="grid-2 committee-layout">
          <section className="card">
            <div className="card-header"><h3>المشاريع الأخيرة</h3><button className="button button-ghost" disabled title="يتاح في النسخة التشغيلية">عرض الكل (قريباً)</button></div>
            <div className="table-wrap"><table><thead><tr><th>المشروع</th><th>المرحلة</th><th>الحالة</th><th></th></tr></thead><tbody>
              {projects.map((project) => <tr key={project.id}><td><strong>{project.name}</strong><br /><span className="project-code" style={{ marginTop: 5 }}>{project.id}</span> <small style={{ color: "var(--muted)" }}>{project.team}</small></td><td>{project.stage}</td><td><Status tone={project.tone}>{project.status}</Status></td><td>{project.action && <Link className="button button-ghost" href={`/committee/reviews/${project.id}`}>راجع <ArrowLeft size={14} /></Link>}</td></tr>)}
            </tbody></table></div>
          </section>
          <div className="stack">
            <div className="notice notice-warning"><BotOff size={19} /><div><strong>محرك التقييم غير متصل</strong><br />لن يبدأ التقييم الآلي قبل ربط الخادم الذي تختاره. لا يوجد اتصال بـ Anthropic.</div></div>
            <section className="card"><div className="card-header"><h3>جاهزية الفحوصات</h3></div><div className="card-body">
              <div className="progress-item"><span className="progress-icon"><FileCheck2 size={15} /></span><div><strong>3 فحوصات فعّالة</strong><small>T1، T2، T7</small></div><Status tone="green">تعمل</Status></div>
              <div className="progress-item"><span className="progress-icon locked"><Clock3 size={15} /></span><div><strong>4 بانتظار نقل أو بيانات</strong><small>T3، T4، T5، T6</small></div><Status tone="amber">معلّقة</Status></div>
            </div></section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
