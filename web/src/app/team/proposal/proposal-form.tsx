"use client";
import { useActionState } from "react";
import { FileUp } from "lucide-react";
import { submitProposalAction, type ActionState } from "@/app/actions";
const initial:ActionState={};
export default function ProposalForm({projectId}:{projectId:string}){
 const [state,action,pending]=useActionState(submitProposalAction,initial);
 return <form action={action} className="card form-card" encType="multipart/form-data" style={{marginTop:18}}><input name="projectId" type="hidden" value={projectId}/><div className="form-section"><h3>نسخة المقترح</h3><p>ارفع PDF أو Word أو ملفاً نصياً، أو الصق النص.</p><div className="fields"><div className="field full"><label htmlFor="proposalFile">ملف المقترح</label><input accept=".pdf,.doc,.docx,.txt" id="proposalFile" name="proposalFile" type="file"/></div><div className="field full"><label htmlFor="proposalText">أو الصق النص</label><textarea id="proposalText" name="proposalText"/></div><div className="field full"><label htmlFor="notes">ملاحظات للجنة</label><input id="notes" name="notes"/></div></div>{state.error&&<div className="notice notice-warning" role="alert" style={{marginTop:16}}>{state.error}</div>}{state.success&&<div className="notice notice-info" role="status" style={{marginTop:16}}>{state.success}</div>}</div><div className="form-actions"><button className="button button-primary" disabled={pending}><FileUp size={16}/>{pending?"جارٍ الرفع…":"إرسال المقترح"}</button></div></form>;
}
