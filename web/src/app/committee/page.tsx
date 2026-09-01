import Link from "next/link";
import { ArrowLeft, BotOff, CircleAlert, Clock3, FileCheck2 } from "lucide-react";
import { AppShell } from "@/components/shell";
import { Status } from "@/components/status";
import { approveProjectSizeAction, decideTimelineAction, setCommitteeMemberAction } from "@/app/actions";
import { requireCommittee } from "@/server/auth/session";
import { committeeProjects } from "@/server/data";

function projectState(project: Awaited<ReturnType<typeof committeeProjects>>[number]){
 if(!project.approved_size)return {label:"قرار الحجم",tone:"red" as const};
 if(!project.timeline_decision)return {label:"بانتظار الخطة",tone:"gray" as const};
 if(project.timeline_decision==="resubmit")return {label:"إعادة تقديم الخطة",tone:"red" as const};
 if(!project.proposal_id)return {label:"بانتظار المقترح",tone:"gray" as const};
 if(project.review_status==="sent")return {label:"أُرسل للفريق",tone:"green" as const};
 if(project.review_status==="send_failed")return {label:"فشل الإرسال",tone:"red" as const};
 return {label:"مراجعة المقترح",tone:"amber" as const};
}

export default async function CommitteeDashboard(){
 const user=await requireCommittee(); const projects=await committeeProjects();
 const needsDecision=projects.filter(p=>!p.approved_size||p.timeline_decision==="resubmit").length;
 const completed=projects.filter(p=>p.review_status==="sent").length;
 return <AppShell area="committee" title="لوحة المتابعة" userName={user.name}><div className="page">
  <div className="demo-banner"><CircleAlert size={17}/> هذه سجلات تشغيلية. كل اعتماد وإرسال يخضع لصلاحية الخادم.</div>
  <div className="page-head"><div><h2>مرحباً، {user.name}</h2><p>الأعمال التي تحتاج انتباه اللجنة.</p></div></div>
  <div className="stats"><div className="stat-card"><span>كل المشاريع</span><strong>{projects.length}</strong><small>في المنصة</small></div><div className="stat-card"><span>تحتاج قراراً</span><strong>{needsDecision}</strong><small>من قائد اللجنة</small></div><div className="stat-card"><span>مقترحات مستلمة</span><strong>{projects.filter(p=>p.proposal_id).length}</strong><small>للمراجعة</small></div><div className="stat-card"><span>مكتملة</span><strong>{completed}</strong><small>أُرسلت نتائجها</small></div></div>
  <div className="grid-2 committee-layout"><section className="card"><div className="card-header"><h3>المشاريع</h3></div><div className="table-wrap"><table><thead><tr><th>المشروع</th><th>الفريق</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>{projects.length===0?<tr><td colSpan={4}>لا توجد مشاريع بعد.</td></tr>:projects.map(project=>{const state=projectState(project);return <tr key={project.id}><td><strong>{project.name}</strong><br/><span className="project-code">{project.public_id}</span><details className="project-evidence"><summary>بيانات القرار</summary><dl><dt>الأنواع</dt><dd>{project.formats.join("، ")}{project.other_format&&`، ${project.other_format}`}</dd><dt>الحضور</dt><dd>{project.attendance}</dd><dt>الميزانية</dt><dd>{project.budget} ر.س</dd><dt>المدة</dt><dd>{project.duration}</dd><dt>الأطراف</dt><dd>{project.stakeholders.join("، ")||"لا يوجد"}</dd><dt>أسباب التصعيد</dt><dd>{project.intake_reasons.join("، ")||"لا يوجد"}</dd></dl>{project.timeline_checks&&<div className="compact-checks"><strong>فحوصات آخر خطة</strong>{project.timeline_checks.map(check=><p key={check.id}><b>{check.id} · {check.name}:</b> {check.message}</p>)}</div>}</details></td><td>{project.owner_name}<br/><small>{project.owner_email}</small></td><td><Status tone={state.tone}>{state.label}</Status></td><td>
    {!project.approved_size&&user.role==="committee_lead"?<form action={approveProjectSizeAction} className="inline-form"><input name="projectId" type="hidden" value={project.id}/><select name="size" defaultValue={project.proposed_size}><option>صغير</option><option>متوسط</option><option>كبير</option><option>تقني</option></select><button className="button button-ghost">اعتماد</button></form>:project.proposal_id?<Link className="button button-ghost" href={`/committee/reviews/${project.review_id}`}>راجع <ArrowLeft size={14}/></Link>:project.timeline_decision&&user.role==="committee_lead"?<form action={decideTimelineAction} className="inline-form"><input name="projectId" type="hidden" value={project.id}/><select name="decision" defaultValue={project.timeline_decision}><option value="approved">معتمد</option><option value="approved_with_warnings">معتمد بتنبيهات</option><option value="resubmit">إعادة تقديم</option></select><input aria-label="سبب اختلاف القرار" name="reason" placeholder="سبب الاختلاف"/><button className="button button-ghost">حفظ</button></form>:"—"}
   </td></tr>})}</tbody></table></div></section>
   <div className="stack"><div className="notice notice-warning"><BotOff size={19}/><div><strong>محرك التقييم غير متصل</strong><br/>المراجعة الحالية يدوية بالكامل، ولا يوجد اتصال بأي مزود نماذج.</div></div><section className="card"><div className="card-header"><h3>جاهزية الفحوصات</h3></div><div className="card-body"><div className="progress-item"><span className="progress-icon"><FileCheck2 size={15}/></span><div><strong>3 فحوصات فعّالة</strong><small>T1، T2، T7</small></div><Status tone="green">تعمل</Status></div><div className="progress-item"><span className="progress-icon locked"><Clock3 size={15}/></span><div><strong>4 بانتظار بيانات</strong><small>T3، T4، T5، T6</small></div><Status tone="amber">معلّقة</Status></div></div></section>{user.role==="committee_lead"&&<section className="card"><div className="card-header"><h3>إضافة عضو لجنة</h3></div><form action={setCommitteeMemberAction} className="card-body"><p className="helper-text">يُنشئ العضو حساباً برمز التسجيل أولاً، ثم يرفعه القائد هنا.</p><div className="field"><label htmlFor="memberEmail">بريد العضو</label><input id="memberEmail" name="email" required type="email"/></div><button className="button button-secondary" style={{marginTop:12}}>منح صلاحية المراجعة</button></form></section>}</div>
  </div>
 </div></AppShell>;
}
