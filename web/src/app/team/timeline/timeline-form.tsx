"use client";
import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { submitTimelineAction, type ActionState } from "@/app/actions";
import type { PrepActivity } from "@/domain/types";

const milestones=[["ideaApproval","إقرار الفكرة"],["sponsorClose","إغلاق الرعاية"],["designsDelivery","تسليم التصاميم النهائية"],["regOpen","فتح التسجيل"],["regClose","إغلاق التسجيل"],["acceptanceAnnounce","إعلان المقبولين"],["eventStart","بداية الحدث"],["eventEnd","نهاية الحدث"],["finalReport","تسليم التقرير الختامي"]] as const;
const initial:ActionState={};
export default function TimelineForm({projectId}:{projectId:string}){
  const [activities,setActivities]=useState<PrepActivity[]>([]); const [state,action,pending]=useActionState(submitTimelineAction,initial);
  const update=(i:number,patch:Partial<PrepActivity>)=>setActivities(items=>items.map((x,n)=>n===i?{...x,...patch}:x));
  return <form className="card form-card" action={action}><input name="projectId" type="hidden" value={projectId}/><input name="prepActivities" type="hidden" value={JSON.stringify(activities)}/>
    <div className="form-section"><h3>المعالم الأساسية</h3><p>اكتبوا التواريخ الميلادية. المعالم المطلوبة تختلف بحسب حجم المشروع ونوعه.</p><div className="fields">{milestones.map(([key,label])=><div className="field" key={key}><label htmlFor={key}>{label}</label><input id={key} name={key} type="date"/></div>)}</div></div>
    <div className="form-section"><div className="section-inline"><div><h3>الأنشطة التمهيدية</h3><p>ورش أو جلسات أو تدريبات تسبق الحدث. العدد غير محدود.</p></div><button className="button button-secondary" onClick={()=>setActivities(x=>[...x,{title:"",date:"",openToAll:false}])} type="button"><Plus size={15}/>إضافة نشاط</button></div>
      {activities.length===0&&<div className="notice notice-info">لا توجد أنشطة تمهيدية.</div>}
      {activities.map((activity,i)=><div className="activity-row" key={i}><div className="field"><label>عنوان النشاط</label><input required value={activity.title} onChange={e=>update(i,{title:e.target.value})}/></div><div className="field"><label>التاريخ</label><input required type="date" value={activity.date} onChange={e=>update(i,{date:e.target.value})}/></div><label className="check-row"><input checked={activity.openToAll} onChange={e=>update(i,{openToAll:e.target.checked})} type="checkbox"/> مفتوح للجميع بدون قبول</label><button aria-label="حذف النشاط" className="icon-button" onClick={()=>setActivities(x=>x.filter((_,n)=>n!==i))} type="button"><Trash2 size={16}/></button></div>)}
      {state.error&&<div className="notice notice-warning" role="alert" style={{marginTop:16}}>{state.error}</div>}{state.success&&<div className="notice notice-info" role="status" style={{marginTop:16}}>{state.success}</div>}
    </div><div className="form-actions"><button className="button button-primary" disabled={pending}>{pending?"جارٍ الفحص…":"فحص وحفظ الخطة"}</button></div>
  </form>;
}
