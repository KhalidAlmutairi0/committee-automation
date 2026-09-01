import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check, Clock3, FileText, LockKeyhole, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/shell";
import { Status } from "@/components/status";
import { requireUser } from "@/server/auth/session";
import { teamProjects } from "@/server/data";
import { canUploadProposal } from "@/domain/workflow";

export default async function TeamDashboard() {
  const user = await requireUser();
  if (user.role !== "team") redirect("/committee");
  const projects = await teamProjects(user.id);
  const project = projects[0];
  const unlocked = project?.timeline_decision ? canUploadProposal(project.timeline_decision) : false;
  return <AppShell area="team" title="بوابة الفريق" userName={user.name} proposalUnlocked={unlocked}>
    <div className="page">
      <div className="demo-banner"><ShieldCheck size={17} /> بياناتكم محفوظة داخل حساب الفريق ولا تظهر لفريق آخر.</div>
      <div className="page-head"><div><h2>مرحباً، {user.name}</h2><p>تابع رحلة المشروع وأكمل الخطوة المتاحة الآن.</p></div><Link className="button button-secondary" href="/team/intake">طلب مشروع جديد</Link></div>
      {!project ? <section className="card form-card"><div className="card-body empty-state"><h3>لا يوجد مشروع بعد</h3><p>ابدأ بطلب مشروع جديد لتحديد المسار.</p><Link className="button button-primary" href="/team/intake">إنشاء أول مشروع</Link></div></section> : <div className="grid-2">
        <section className="card"><div className="card-header"><h3>المشروع الحالي</h3><span className="project-code">{project.public_id}</span></div><div className="card-body">
          <div className="project-heading"><div><strong>{project.name}</strong><p>{project.formats.join(" · ")} · {project.approved_size ? `مشروع ${project.approved_size}` : "الحجم قيد الاعتماد"}</p></div><Status tone={project.review_status === "sent" ? "green" : "amber"}>{project.review_status === "sent" ? "اكتمل" : "قيد العمل"}</Status></div>
          <div className="progress-list">
            <div className="progress-item"><span className="progress-icon"><Check size={16}/></span><div><strong>استلام وتصنيف المشروع</strong><small>{project.approved_size ? `الحجم: ${project.approved_size}` : "بانتظار قائد اللجنة"}</small></div><Status tone={project.approved_size ? "green" : "amber"}>{project.approved_size ? "مكتمل" : "معلّق"}</Status></div>
            <div className="progress-item"><span className="progress-icon"><Clock3 size={16}/></span><div><strong>الخطة الزمنية</strong><small>{project.timeline_decision ? "تم فحص آخر نسخة" : "جاهزة للتعبئة"}</small></div><Link className="button button-ghost" href={`/team/timeline?project=${project.id}`}>{project.timeline_decision ? "راجع" : "ابدأ"} <ArrowLeft size={14}/></Link></div>
            <div className="progress-item"><span className={`progress-icon ${unlocked ? "" : "locked"}`}>{unlocked ? <Check size={15}/> : <LockKeyhole size={15}/>}</span><div><strong>مقترح الرعاية</strong><small>{unlocked ? (project.proposal_id ? "تم استلام نسخة" : "البوابة مفتوحة") : "يفتح بعد اجتياز الخطة"}</small></div>{unlocked ? <Link className="button button-ghost" href={`/team/proposal?project=${project.id}`}>فتح <ArrowLeft size={14}/></Link> : <Status tone="gray">مقفل</Status>}</div>
            <div className="progress-item"><span className={`progress-icon ${project.review_status === "sent" ? "" : "locked"}`}><FileText size={15}/></span><div><strong>ملاحظات اللجنة</strong><small>{project.review_status === "sent" ? "أُرسلت إلى بريد حساب الفريق" : "تظهر بعد اعتماد قائد اللجنة"}</small></div><Status tone={project.review_status === "sent" ? "green" : "gray"}>{project.review_status === "sent" ? "أُرسلت" : "لاحقاً"}</Status></div>
          </div>
        </div></section>
        <div className="stack"><section className="card"><div className="card-header"><h3>مشاريع الفريق</h3></div><div className="card-body project-list">{projects.map((item)=><Link href={`/team/timeline?project=${item.id}`} key={item.id}><span>{item.name}</span><small className="project-code">{item.public_id}</small></Link>)}</div></section><div className="notice notice-info"><ShieldCheck size={18}/><div>المعيار السادس للأرقام المركزية ما زال معطلاً ولن تُخمن المنصة أي قيمة.</div></div></div>
      </div>}
    </div>
  </AppShell>;
}
