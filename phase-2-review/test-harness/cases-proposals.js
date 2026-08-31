CONFIG_2.LEAD_EMAIL='lead@ksu.example';
const R=[];const T=(n,f)=>{let p=false,note='';try{const r=f();p=r===true;note=r===true?'':String(r);}
  catch(e){note='استثناء: '+e.message+' @'+(e.stack||'').split('\n')[1];}R.push({n,p,note});};
const mailsTo=a=>__F.MAILS.filter(m=>m.to===a);
const clearMails=()=>{__F.MAILS.length=0;};
const D=iso=>{const p=iso.split('-');return new Date(+p[0],+p[1]-1,+p[2]);};

// --- سجل المرحلة ١ ---
const intake=__F.SS.insertSheet(CONFIG_2.SHEETS.INTAKE_LOG);
intake.appendRow(['التاريخ','المشروع','القائد','النوع','الحضور','الميزانية','المدة',
  'أصحاب المنفعة','إشارة النوع','إشارة الميزانية','الحالة','الحجم المقترح',
  'الحجم المعتمد','سبب التصعيد','معرّف المشروع','إيميل الفريق']);
const addProject=(id,name,fmt,approved,email)=>intake.appendRow([new Date(),name,'قائد',fmt,
  100,25000,'٢ إلى ٣ أيام','شركات','متوسط','متوسط','تلقائي','متوسط',approved,'',id,email]);

addProject('FTC-26-001','ملتقى التقنية','معرض','متوسط','team1@ksu.example');
addProject('FTC-26-002','هاكاثون الرياض','هاكاثون','كبير','team2@ksu.example');
addProject('FTC-26-003','ورشة صغيرة','ورشة عمل','صغير','team3@ksu.example');

// --- خطة زمنية معتمدة للأول، ومرفوضة للثاني ---
const GOOD={ideaApproval:D('2026-09-01'),sponsorClose:D('2026-09-20'),
  designsDelivery:D('2026-10-05'),regOpen:D('2026-10-15'),regClose:D('2026-11-05'),
  acceptanceAnnounce:D('2026-11-10'),eventStart:D('2026-11-20'),
  eventEnd:D('2026-11-22'),finalReport:D('2026-12-05')};
function timelineEvent(id,email,dates){
  const F2=CONFIG_2.FORM_2A;const items=[];
  const push=(t,v)=>items.push({getItem:()=>({getTitle:()=>t}),getResponse:()=>v});
  push(F2.projectId,id);
  CONFIG_2.MILESTONES.forEach(m=>push(F2.dates[m.key],dates[m.key]||''));
  CONFIG_2.HIJRI_FIELDS.forEach(k=>push(F2.hijri[k],''));
  push(F2.notes,'');
  return {response:{getItemResponses:()=>items,getRespondentEmail:()=>email}};
}
onTimelineSubmit(timelineEvent('FTC-26-001','team1@ksu.example',GOOD));
onTimelineSubmit(timelineEvent('FTC-26-002','team2@ksu.example',
  Object.assign({},GOOD,{eventEnd:D('2026-11-18')})));   // معكوس = مرفوض
const TOKEN1=latestPlanFor('FTC-26-001').token;

// --- وثائق مزيفة ---
const LONG='بربوزل مشروع ملتقى التقنية. '.repeat(60);
__F.DOCS['doc-good']=LONG;
__F.DOCS['doc-empty']='قصير';
__F.DOCS['doc-denied']='DENY';

function proposalEvent(id,token,email,docUrl,pasted){
  const F2=CONFIG_2.FORM_2B;const items=[];
  const push=(t,v)=>items.push({getItem:()=>({getTitle:()=>t}),getResponse:()=>v});
  push(F2.projectId,id);push(F2.token,token);push(F2.docUrl,docUrl||'');
  push(F2.pastedText,pasted||'');push(F2.notes,'');
  return {response:{getItemResponses:()=>items,getRespondentEmail:()=>email}};
}
const URL_OK='https://docs.google.com/document/d/doc-good/edit';

// ============================================================

T('بربوزل صالح ينحفظ ونصه يروح لدرايف',()=>{
  clearMails();
  onProposalSubmit(proposalEvent('FTC-26-001',TOKEN1,'team1@ksu.example',URL_OK));
  const p=latestProposalFor('FTC-26-001');
  if(!p)return 'ما انحفظ';
  if(p.state!=='مستلم')return 'الحالة: '+p.state;
  if(!p.textFileId)return 'ما انحفظ ملف نص';
  if(readProposalText(p.textFileId)!==LONG)return 'النص المخزّن ما يطابق';
  if(p.charCount!==LONG.length)return 'عدد الحروف: '+p.charCount;
  if(p.reviewId.indexOf('-2B-')===-1)return 'معرّف المراجعة: '+p.reviewId;
  return true;
});

T('إشعار الفريق ما فيه ولا تقييم',()=>{
  const b=mailsTo('team1@ksu.example')[0].htmlBody;
  if(b.indexOf('ما نقدر نعطيكم أي نتيجة')===-1)return 'ما قال إنه ما فيه نتيجة';
  ['درجة','ضعيف','قوي','معتمد بتعديلات','إعادة تقديم','من ٣٨'].forEach(w=>{
    if(b.indexOf(w)!==-1)throw new Error('تسرّبت لغة تقييم: '+w);
  });
  return true;
});

T('القائد يُشعر أن البربوزل مخزّن وما انقيّم',()=>{
  const b=mailsTo('lead@ksu.example').slice(-1)[0].htmlBody;
  return b.indexOf('مخزّن وما انقيّم')!==-1?true:'ما وضّح أنه ما انقيّم';
});

T('خطة مرفوضة تمنع رفع البربوزل',()=>{
  clearMails();
  onProposalSubmit(proposalEvent('FTC-26-002','ANY','team2@ksu.example',URL_OK));
  if(latestProposalFor('FTC-26-002'))return 'انحفظ بربوزل رغم قفل البوابة';
  const b=mailsTo('team2@ksu.example')[0].htmlBody;
  return b.indexOf('مقفل')!==-1?true:'السبب ما وصل';
});

T('رمز غلط يُرفض حتى لو الخطة معتمدة',()=>{
  clearMails();
  const before=proposalsSheet().getLastRow();
  onProposalSubmit(proposalEvent('FTC-26-001','WRONGTOKEN','team1@ksu.example',URL_OK));
  if(proposalsSheet().getLastRow()!==before)return 'انحفظ برمز غلط';
  return mailsTo('team1@ksu.example')[0].htmlBody.indexOf('رمز الرفع غير صحيح')!==-1
    ?true:'رسالة غير واضحة';
});

T('مشروع صغير ما له مرحلة بربوزل',()=>{
  clearMails();
  onProposalSubmit(proposalEvent('FTC-26-003','ANY','team3@ksu.example',URL_OK));
  if(latestProposalFor('FTC-26-003'))return 'قبل بربوزل مشروع صغير';
  return mailsTo('team3@ksu.example')[0].htmlBody.indexOf('ما فيها مرحلة بربوزل')!==-1
    ?true:'السبب ما وصل';
});

T('PDF يُرفض برسالة تقول وش يسوون',()=>{
  clearMails();
  onProposalSubmit(proposalEvent('FTC-26-001',TOKEN1,'team1@ksu.example',
    'https://drive.google.com/file/d/xyz/view'));
  const b=mailsTo('team1@ksu.example')[0].htmlBody;
  if(b.indexOf('ما نستقبل PDF')===-1)return 'ما رفض PDF بوضوح';
  if(b.indexOf('حفظ كمستند Google')===-1)return 'ما قال لهم الحل';
  return true;
});

T('وثيقة بلا صلاحية ترجع رسالة صلاحيات',()=>{
  clearMails();
  onProposalSubmit(proposalEvent('FTC-26-001',TOKEN1,'team1@ksu.example',
    'https://docs.google.com/document/d/doc-denied/edit'));
  return mailsTo('team1@ksu.example')[0].htmlBody.indexOf('شاركوها مع اللجنة')!==-1
    ?true:'ما وجّه لحل الصلاحيات';
});

T('وثيقة شبه فاضية تُرفض',()=>{
  clearMails();
  onProposalSubmit(proposalEvent('FTC-26-001',TOKEN1,'team1@ksu.example',
    'https://docs.google.com/document/d/doc-empty/edit'));
  return mailsTo('team1@ksu.example')[0].htmlBody.indexOf('شبه فاضية')!==-1
    ?true:'قبل وثيقة فاضية';
});

T('لا رابط ولا نص = رفض',()=>{
  clearMails();
  onProposalSubmit(proposalEvent('FTC-26-001',TOKEN1,'team1@ksu.example','',''));
  return mailsTo('team1@ksu.example')[0].htmlBody.indexOf('ما وصلنا لا رابط وثيقة ولا نص')!==-1
    ?true:'قبل رفعاً فاضياً';
});

T('النص الملصوق يُقبل كمصدر',()=>{
  clearMails();
  onProposalSubmit(proposalEvent('FTC-26-001',TOKEN1,'team1@ksu.example','',LONG));
  const p=latestProposalFor('FTC-26-001');
  if(p.state!=='مستلم')return 'الحالة: '+p.state;
  if(readProposalText(p.textFileId)!==LONG.trim())return 'النص ما انحفظ';
  return true;
});

T('إعادة الرفع تضيف صفاً وآخر نسخة هي المعتمدة',()=>{
  const before=proposalsSheet().getLastRow();
  const NEWER=LONG+' نسخة منقّحة.';
  __F.DOCS['doc-v2']=NEWER;
  onProposalSubmit(proposalEvent('FTC-26-001',TOKEN1,'team1@ksu.example',
    'https://docs.google.com/document/d/doc-v2/edit'));
  if(proposalsSheet().getLastRow()!==before+1)return 'ما أضاف صفاً';
  const p=latestProposalFor('FTC-26-001');
  if(readProposalText(p.textFileId)!==NEWER)return 'ما اعتمد الأخيرة';
  if(p.reviewId==='FTC-26-001-2B-1')return 'أعاد استخدام نفس معرّف المراجعة';
  return true;
});

T('معرّف مجهول يُرفض',()=>{
  clearMails();
  onProposalSubmit(proposalEvent('FTC-99-999','X','ghost@ksu.example',URL_OK));
  return mailsTo('ghost@ksu.example')[0].htmlBody.indexOf('غير موجود في سجل الاستلام')!==-1
    ?true:'ما وضّح السبب';
});

T('ما فيه بربوزل انحفظ بحالة غير "مستلم"',()=>{
  const sh=proposalsSheet();
  const rows=sh.getRange(2,proposalCol('state'),sh.getLastRow()-1,1).getValues();
  const bad=rows.map(r=>r[0]).filter(v=>v!=='مستلم');
  return bad.length===0?true:'حالات غير متوقعة: '+bad.join(',');
});

const passed=R.filter(r=>r.p).length;
console.log('\n=== اختبارات تخزين البربوزل (٢ب — الخطوة ٥) ===');
R.forEach(r=>console.log((r.p?'  ✓ ':'  ✗ ')+r.n+(r.note?'  →  '+r.note:'')));
console.log('\n'+passed+' من '+R.length+' ناجحة\n');
process.exit(passed===R.length?0:1);
