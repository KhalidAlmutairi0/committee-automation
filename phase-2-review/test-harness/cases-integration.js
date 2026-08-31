CONFIG_2.LEAD_EMAIL='lead@ksu.example';

// --- تجهيز سجل المرحلة ١ كما تكتبه classifier.gs بعد الترقيع ---
const intake=F.SS.insertSheet(CONFIG_2.SHEETS.INTAKE_LOG);
intake.appendRow(['التاريخ','المشروع','القائد','النوع','الحضور','الميزانية','المدة',
  'أصحاب المنفعة','إشارة النوع','إشارة الميزانية','الحالة','الحجم المقترح',
  'الحجم المعتمد','سبب التصعيد','معرّف المشروع','إيميل الفريق']);
const addProject=(id,name,fmt,approved,email)=>intake.appendRow([new Date(),name,'قائد',fmt,
  100,25000,'٢ إلى ٣ أيام','شركات','متوسط','متوسط','تلقائي','متوسط',approved,'',id,email]);

addProject('FTC-26-001','ملتقى التقنية','معسكر تدريبي','متوسط','team1@ksu.example');
addProject('FTC-26-002','هاكاثون الرياض','هاكاثون','كبير','team2@ksu.example');
addProject('FTC-26-003','مشروع بلا حجم','ورشة عمل','','team3@ksu.example');

// --- بناء رد فورم مزيف ---
const D=iso=>{const p=iso.split('-');return new Date(+p[0],+p[1]-1,+p[2]);};
function formEvent(projectId,email,dates,hijri){
  const F2=CONFIG_2.FORM_2A;const items=[];
  const push=(t,v)=>items.push({getItem:()=>({getTitle:()=>t}),getResponse:()=>v});
  push(F2.projectId,projectId);
  CONFIG_2.MILESTONES.forEach(m=>push(F2.dates[m.key],dates[m.key]||''));
  CONFIG_2.HIJRI_FIELDS.forEach(k=>push(F2.hijri[k],(hijri||{})[k]||''));
  push(F2.notes,'');
  return {response:{getItemResponses:()=>items,getRespondentEmail:()=>email}};
}
const GOOD={ideaApproval:D('2026-09-01'),sponsorClose:D('2026-09-20'),
  designsDelivery:D('2026-10-05'),regOpen:D('2026-10-15'),regClose:D('2026-11-05'),
  acceptanceAnnounce:D('2026-11-10'),
  eventStart:D('2026-11-20'),eventEnd:D('2026-11-22'),finalReport:D('2026-12-05')};

const R=[];const T=(n,f)=>{let p=false,note='';try{const r=f();p=r===true;note=r===true?'':String(r);}
  catch(e){note='استثناء: '+e.message+' @'+(e.stack||'').split('\n')[1];}R.push({n,p,note});};
const mailsTo=a=>F.MAILS.filter(m=>m.to===a);
const clearMails=()=>{F.MAILS.length=0;};

// ============================================================
T('خطة سليمة: الفريق يستلم رمز رفع والبوابة تفتح',()=>{
  clearMails();
  onTimelineSubmit(formEvent('FTC-26-001','team1@ksu.example',GOOD));
  const team=mailsTo('team1@ksu.example'),lead=mailsTo('lead@ksu.example');
  if(team.length!==1)return 'إيميلات الفريق: '+team.length;
  if(lead.length!==1)return 'إيميلات القائد: '+lead.length;
  const plan=latestPlanFor('FTC-26-001');
  if(plan.gate!=='مفتوح')return 'البوابة: '+plan.gate;
  if(!plan.token)return 'ما صدر رمز';
  if(team[0].htmlBody.indexOf(plan.token)===-1)return 'الرمز ما وصل الفريق';
  if(plan.computed!=='معتمد بتنبيهات')return 'القرار: '+plan.computed; // T3/T4/T5 معطّلة
  return true;
});

T('السجلان: صف مراجعة واحد و٧ صفوف معايير',()=>{
  const rl=F.SHEETS[CONFIG_2.SHEETS.REVIEW_LOG],cl=F.SHEETS[CONFIG_2.SHEETS.CRITERION_LOG];
  if(rl.getLastRow()!==2)return 'سجل المراجعة: '+(rl.getLastRow()-1)+' صف';
  if(cl.getLastRow()!==8)return 'سجل المعايير: '+(cl.getLastRow()-1)+' صف';
  const row=rl.getRange(2,1,1,16).getValues()[0];
  if(row[3]!=='2أ')return 'المرحلة: '+row[3];
  if(row[7]!=='معتمد بتنبيهات')return 'القرار المحسوب: '+row[7];
  if(row[8]!=='')return 'قرار القائد انكتب بدون قائد';
  const codes=cl.getRange(2,4,7,1).getValues().map(r=>r[0]).join(',');
  if(codes!=='T1,T2,T3,T4,T5,T6,T7')return 'رموز المعايير: '+codes;
  return true;
});

T('تاريخ معكوس: البوابة تقفل وما فيه رمز',()=>{
  clearMails();
  const bad=Object.assign({},GOOD,{eventEnd:D('2026-11-18')});
  onTimelineSubmit(formEvent('FTC-26-002','team2@ksu.example',bad));
  const plan=latestPlanFor('FTC-26-002');
  if(plan.gate!=='مقفل')return 'البوابة: '+plan.gate;
  if(plan.token)return 'صدر رمز رغم الرفض';
  if(plan.computed!=='إعادة تقديم')return 'القرار: '+plan.computed;
  const team=mailsTo('team2@ksu.example');
  if(team[0].htmlBody.indexOf('مقفل')===-1)return 'ما بلّغ الفريق بالقفل';
  return true;
});

T('البوابة ترفض رفع بربوزل لمشروع مرفوض',()=>{
  const g=checkUploadGate('FTC-26-002','ANYTOKEN');
  return g.ok===false?true:'البوابة فتحت لمشروع مرفوض';
});

T('البوابة تقبل الرمز الصحيح وترفض الغلط',()=>{
  const plan=latestPlanFor('FTC-26-001');
  if(checkUploadGate('FTC-26-001',plan.token).ok!==true)return 'رفضت الرمز الصحيح';
  if(checkUploadGate('FTC-26-001','WRONG').ok!==false)return 'قبلت رمزاً غلط';
  if(checkUploadGate('FTC-26-001','').ok!==false)return 'قبلت رمزاً فاضياً';
  return true;
});

T('رمز مشروع ما ينفع لمشروع ثاني',()=>{
  const t1=latestPlanFor('FTC-26-001').token;
  return checkUploadGate('FTC-26-002',t1).ok===false?true:'رمز مسرّب فتح مشروعاً ثانياً';
});

T('معرّف مجهول: رفض بدون كتابة في السجل',()=>{
  clearMails();
  const before=F.SHEETS[CONFIG_2.SHEETS.REVIEW_LOG].getLastRow();
  onTimelineSubmit(formEvent('FTC-99-999','ghost@ksu.example',GOOD));
  const after=F.SHEETS[CONFIG_2.SHEETS.REVIEW_LOG].getLastRow();
  if(after!==before)return 'انكتب صف لمشروع مجهول';
  if(mailsTo('ghost@ksu.example').length!==1)return 'ما وصل الفريق رد';
  return true;
});

T('مشروع بلا حجم معتمد ينرفض',()=>{
  clearMails();
  onTimelineSubmit(formEvent('FTC-26-003','team3@ksu.example',GOOD));
  const m=mailsTo('team3@ksu.example');
  if(m.length!==1)return 'إيميلات: '+m.length;
  if(m[0].htmlBody.indexOf('ما تم اعتماد حجم')===-1)return 'السبب ما وصل';
  if(latestPlanFor('FTC-26-003'))return 'انكتبت خطة لمشروع بلا حجم';
  return true;
});

T('LEAD_SIGNOFF_2A=true يمنع وصول أي شي للفريق',()=>{
  clearMails();
  CONFIG_2.LEAD_SIGNOFF_2A=true;
  try{
    addProject('FTC-26-004','ورشة الذكاء','ورشة عمل','متوسط','team4@ksu.example');
    onTimelineSubmit(formEvent('FTC-26-004','team4@ksu.example',GOOD));
    if(mailsTo('team4@ksu.example').length!==0)return 'وصل الفريق إيميل قبل القائد';
    if(mailsTo('lead@ksu.example').length!==1)return 'ما وصل القائد شي';
    const g=checkUploadGate('FTC-26-004',latestPlanFor('FTC-26-004').token);
    if(g.ok!==false)return 'البوابة فتحت قبل اعتماد القائد';
    if(g.reason.indexOf('تنتظر اعتماد')===-1)return 'سبب غلط: '+g.reason;
    return true;
  } finally{CONFIG_2.LEAD_SIGNOFF_2A=false;}
});

T('تجاوز القائد يرسل للفريق ويُسجَّل السبب',()=>{
  clearMails();
  const sheet=timelinePlansSheet();
  const plan=latestPlanFor('FTC-26-002');           // كان "إعادة تقديم"
  sheet.getRange(plan.rowNumber,planCol('leadReason')).setValue('التاريخ انصلح بالواتساب');
  sheet.getRange(plan.rowNumber,planCol('lead')).setValue('معتمد بتنبيهات');
  onTimelineLeadEdit({range:{getSheet:()=>sheet,getColumn:()=>planCol('lead'),
    getRow:()=>plan.rowNumber,getValue:()=>'معتمد بتنبيهات'}});

  const after=latestPlanFor('FTC-26-002');
  if(after.gate!=='مفتوح')return 'البوابة: '+after.gate;
  if(!after.token)return 'ما صدر رمز عند التجاوز';
  if(mailsTo('team2@ksu.example').length!==1)return 'ما وصل الفريق قرار القائد';

  const rl=F.SHEETS[CONFIG_2.SHEETS.REVIEW_LOG];
  const rows=rl.getRange(2,1,rl.getLastRow()-1,16).getValues();
  const rec=rows.filter(r=>r[0]===plan.reviewId)[0];
  if(!rec)return 'ما لقى صف المراجعة';
  if(rec[7]!=='إعادة تقديم')return 'المحسوب انداس: '+rec[7];
  if(rec[8]!=='معتمد بتنبيهات')return 'قرار القائد: '+rec[8];
  if(rec[9].indexOf('الواتساب')===-1)return 'سبب الاختلاف ما انحفظ: '+rec[9];
  return true;
});

T('إعادة التقديم تضيف صفاً وما تدهس السابق',()=>{
  clearMails();
  const before=timelinePlansSheet().getLastRow();
  onTimelineSubmit(formEvent('FTC-26-002','team2@ksu.example',GOOD));
  const after=timelinePlansSheet().getLastRow();
  if(after!==before+1)return 'الصفوف: '+before+' → '+after;
  const p=latestPlanFor('FTC-26-002');
  if(p.computed!=='معتمد بتنبيهات')return 'القرار الجديد: '+p.computed;
  if(p.reviewId.indexOf('-2A-')===-1)return 'معرّف مراجعة غريب: '+p.reviewId;
  if(p.reviewId==='FTC-26-002-2A-1')return 'أعاد استخدام نفس معرّف المراجعة';
  return true;
});

T('إيميل الفريق يسمّي الفحوصات المعطّلة',()=>{
  clearMails();
  addProject('FTC-26-005','ندوة البيانات','جلسة حوارية','متوسط','team5@ksu.example');
  onTimelineSubmit(formEvent('FTC-26-005','team5@ksu.example',GOOD));
  const b=mailsTo('team5@ksu.example')[0].htmlBody;
  if(b.indexOf('فحوصات ما اشتغلت')===-1)return 'ما ذكر أن فيه فحوصات معطّلة';
  if(b.indexOf('T3')===-1)return 'ما سمّى T3';
  if(b.indexOf('T5')===-1)return 'ما سمّى T5';
  if(b.indexOf('ما انفحصت واقعية المدد')===-1)return 'ما قال إن الواقعية ما انفحصت';
  return true;
});

T('"معتمد" بفحوصات غير حاجبة مطفية لازم يقول ذلك للفريق',()=>{
  clearMails();
  const savedGaps=CONFIG_2.MIN_GAPS,savedCal=CONFIG_2.ACADEMIC_CALENDAR;
  CONFIG_2.MIN_GAPS={regOpen_to_eventStart:{value:3,unit:'weeks'},
    regClose_to_acceptanceAnnounce:{value:3,unit:'days'},
    acceptanceAnnounce_to_eventStart:{value:7,unit:'days'},
    sponsorClose_to_designsDelivery:{value:10,unit:'days'},
    designsDelivery_to_regOpen:{value:5,unit:'days'},
    eventEnd_to_finalReport:{value:7,unit:'days'}};
  CONFIG_2.ACADEMIC_CALENDAR=[{name:'الاختبارات',start:'2027-05-01',end:'2027-05-10'}];
  try{
    // نافذة خاصة به: إعادة استخدام تواريخ GOOD تصادم مشروعاً معتمداً فينبّه T4
    const OWN={ideaApproval:D('2027-01-05'),sponsorClose:D('2027-01-20'),
      designsDelivery:D('2027-02-05'),regOpen:D('2027-02-12'),regClose:D('2027-03-05'),
      acceptanceAnnounce:D('2027-03-10'),eventStart:D('2027-03-20'),
      eventEnd:D('2027-03-22'),finalReport:D('2027-04-05')};
    addProject('FTC-26-006','معرض الابتكار','معرض','متوسط','team6@ksu.example');
    onTimelineSubmit(formEvent('FTC-26-006','team6@ksu.example',OWN));
    const p=latestPlanFor('FTC-26-006');
    if(p.computed!=='معتمد')return 'القرار: '+p.computed;   // T5 وحده مطفي وهو غير حاجب
    const b=mailsTo('team6@ksu.example')[0].htmlBody;
    if(b.indexOf('فحوصات ما اشتغلت')===-1)return '"معتمد" انرسل بدون ذكر T5 المطفي';
    if(b.indexOf('T5')===-1)return 'ما سمّى T5';
    return true;
  } finally{CONFIG_2.MIN_GAPS=savedGaps;CONFIG_2.ACADEMIC_CALENDAR=savedCal;}
});

T('رد تجاوز القائد يسمّي المعطّل كمان',()=>{
  clearMails();
  const sheet=timelinePlansSheet();
  const plan=latestPlanFor('FTC-26-005');
  sheet.getRange(plan.rowNumber,planCol('lead')).setValue('معتمد');
  onTimelineLeadEdit({range:{getSheet:()=>sheet,getColumn:()=>planCol('lead'),
    getRow:()=>plan.rowNumber,getValue:()=>'معتمد'}});
  const b=mailsTo('team5@ksu.example')[0].htmlBody;
  if(b.indexOf('فحوصات ما اشتغلت')===-1)return 'مسار التجاوز ما ذكر المعطّل';
  if(b.indexOf('T3')===-1)return 'ما سمّى T3';
  return true;
});

T('T4 يشوف مشاريع النادي المعتمدة الأخرى',()=>{
  const w=approvedEventWindows('FTC-26-002');
  const ids=w.map(x=>x.projectId).sort().join(',');
  if(ids.indexOf('FTC-26-001')===-1)return 'ما شاف المشروع المعتمد: '+ids;
  if(ids.indexOf('FTC-26-002')!==-1)return 'ما استثنى نفسه';
  return true;
});

// ============================================================
const passed=R.filter(r=>r.p).length;
console.log('\n=== اختبارات التكامل (٢أ) ===');
R.forEach(r=>console.log((r.p?'  ✓ ':'  ✗ ')+r.n+(r.note?'  →  '+r.note:'')));
console.log('\n'+passed+' من '+R.length+' ناجحة\n');
process.exit(passed===R.length?0:1);
