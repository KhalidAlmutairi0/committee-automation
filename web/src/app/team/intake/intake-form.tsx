"use client";
import { useActionState } from "react";
import { ArrowLeft } from "lucide-react";
import { createProjectAction, type ActionState } from "@/app/actions";

const formats = ["ورشة عمل","جلسة حوارية","نشاط بسيط","ميني هاكثون","هاكاثون","معسكر تدريبي","معرض","مشروع تقني / هاردوير"];
const initial: ActionState = {};

export default function IntakeForm() {
  const [state, action, pending] = useActionState(createProjectAction, initial);
  return <form className="card form-card" action={action}>
    <div className="form-section"><h3>بيانات أساسية</h3><p>بيانات التواصل الأساسية للمشروع.</p><div className="fields">
      <div className="field"><label htmlFor="name">اسم المشروع</label><input id="name" name="name" required /></div>
      <div className="field"><label htmlFor="leadName">اسم قائد المشروع</label><input id="leadName" name="leadName" required /></div>
      <div className="field"><label htmlFor="leadPhone">رقم القائد</label><input id="leadPhone" name="leadPhone" required /></div>
      <div className="field"><label htmlFor="deputyName">اسم النائب (اختياري)</label><input id="deputyName" name="deputyName" /></div>
      <div className="field"><label htmlFor="deputyPhone">رقم النائب (اختياري)</label><input id="deputyPhone" name="deputyPhone" /></div>
    </div></div>
    <div className="form-section"><h3>نطاق المشروع</h3><p>الأرقام تقديرية وتُراجع لاحقاً.</p><div className="fields">
      <div className="field full"><label>نوع المشروع (يمكن اختيار أكثر من نوع)</label><div className="checkbox-grid">{formats.map(x=><label className="check-row" key={x}><input name="formats" type="checkbox" value={x}/>{x}</label>)}</div></div>
      <div className="field"><label htmlFor="otherFormat">نوع آخر (اختياري)</label><input id="otherFormat" name="otherFormat" /></div>
      <div className="field"><label htmlFor="attendance">الحضور المتوقع</label><input id="attendance" name="attendance" min="1" required type="number" /></div>
      <div className="field"><label htmlFor="budget">الميزانية التقديرية (ر.س)</label><input id="budget" name="budget" min="0" required type="number" /></div>
      <div className="field"><label htmlFor="duration">المدة</label><input id="duration" name="duration" required placeholder="مثال: يوم واحد" /></div>
      <div className="field"><label>أطراف ذات علاقة</label><label className="check-row"><input name="stakeholders" type="checkbox" value="جهة حكومية أو وزارة"/> جهة حكومية أو وزارة</label></div>
      <div className="field"><label>موارد مطلوبة</label><label className="check-row"><input name="resources" type="checkbox" value="قاعة"/> قاعة</label><label className="check-row"><input name="resources" type="checkbox" value="دعم تقني"/> دعم تقني</label></div>
    </div>{state.error&&<div className="notice notice-warning" role="alert" style={{marginTop:16}}>{state.error}</div>}</div>
    <div className="form-actions"><button className="button button-primary" disabled={pending}>{pending?"جارٍ الحفظ…":"إنشاء المشروع"}<ArrowLeft size={16}/></button></div>
  </form>;
}
