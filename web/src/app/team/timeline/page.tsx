import { redirect } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import { AppShell } from "@/components/shell";
import { Status } from "@/components/status";
import { requireUser } from "@/server/auth/session";
import { teamProjects } from "@/server/data";
import { canUploadProposal } from "@/domain/workflow";
import TimelineForm from "./timeline-form";

export default async function TimelinePage({searchParams}:{searchParams:Promise<{project?:string}>}) {
  const user = await requireUser();
  if(user.role!=="team") redirect("/committee");
  const projects=await teamProjects(user.id); const requested=(await searchParams).project;
  const project=projects.find(x=>x.id===requested)||projects[0];
  if(!project) redirect("/team/intake");
  const unlocked=project.timeline_decision?canUploadProposal(project.timeline_decision):false;
  return <AppShell area="team" title="الخطة الزمنية" userName={user.name} proposalUnlocked={unlocked}><div className="page">
    <div className="demo-banner"><CalendarCheck size={17}/> تُحفظ كل نسخة ترسلونها بسجل مستقل قابل للتتبع.</div>
    <div className="page-head"><div><h2>خطّة {project.name}</h2><p><span className="project-code">{project.public_id}</span> · {project.formats.join("، ")} · {project.approved_size||"بانتظار الحجم"}</p></div><Status tone={project.timeline_decision==="resubmit"?"red":project.timeline_decision?"amber":"gray"}>{project.timeline_decision==="resubmit"?"إعادة تقديم":project.timeline_decision?"تم الفحص":"جديدة"}</Status></div>
    {project.approved_size?<TimelineForm projectId={project.id}/>:<div className="notice notice-warning">لا يمكن تقديم الخطة حتى يعتمد قائد اللجنة حجم المشروع.</div>}
    {project.timeline_checks&&<section className="result-panel form-card"><h3>نتيجة آخر فحص</h3>{project.timeline_checks.map(check=><div className="check-result" key={check.id}><span className="check-code">{check.id}</span><div><strong>{check.name}</strong><p>{check.message}</p></div><Status tone={check.status==="passed"?"green":check.status==="failed"?"red":"gray"}>{check.status==="passed"?"ناجح":check.status==="failed"?"فاشل":"غير مفعّل"}</Status></div>)}</section>}
  </div></AppShell>;
}
