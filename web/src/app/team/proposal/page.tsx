import Link from "next/link";
import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { AppShell } from "@/components/shell";
import { Status } from "@/components/status";
import { requireUser } from "@/server/auth/session";
import { teamProjects } from "@/server/data";
import { canUploadProposal } from "@/domain/workflow";
import ProposalForm from "./proposal-form";

export default async function ProposalPage({searchParams}:{searchParams:Promise<{project?:string}>}){
 const user=await requireUser(); if(user.role!=="team")redirect("/committee");
 const projects=await teamProjects(user.id); const requested=(await searchParams).project; const project=projects.find(x=>x.id===requested)||projects[0];
 if(!project)redirect("/team/intake"); const unlocked=project.timeline_decision?canUploadProposal(project.timeline_decision):false;
 return <AppShell area="team" title="مقترح الرعاية" userName={user.name} proposalUnlocked={unlocked}><div className="page">{!unlocked?<section className="card form-card"><div className="card-body empty-state"><LockKeyhole size={28}/><h2>رفع المقترح مقفل</h2><p>اجتز فحص الخطة الزمنية أولاً.</p><Link className="button button-primary" href={`/team/timeline?project=${project.id}`}>الذهاب للخطة</Link></div></section>:<><div className="page-head"><div><h2>رفع مقترح الرعاية</h2><p><span className="project-code">{project.public_id}</span> · كل نسخة تحفظ مستقلة</p></div><Status tone="green">البوابة مفتوحة</Status></div><div className="notice notice-info form-card"><LockKeyhole size={18}/><div>لن يصل أي تقييم للفريق قبل اعتماد قائد اللجنة. الحد الأعلى للملف 10 MB.</div></div><ProposalForm projectId={project.id}/></>}</div></AppShell>;
}
