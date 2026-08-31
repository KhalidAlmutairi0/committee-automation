CONFIG_2.LEAD_EMAIL='lead@ksu.example';

const R=[];
const T=(n,f)=>{let p=false,note='';try{const r=f();p=r===true;note=r===true?'':String(r);}
  catch(e){note='استثناء: '+e.message+' @'+(e.stack||'').split('\n')[1];}R.push({n,p,note});};
const mailsTo=a=>__F.MAILS.filter(m=>m.to===a);

const PROPOSAL=[
  'بروفايل رعاية هاكاثون المستقبل ٢٠٢٦.',
  'يقام في الرياض على مدى ستة أيام بمشاركة ثلاثين فريقاً.',
  'أهدافنا: الوصول إلى ١٢٠ مشاركاً، وإطلاق ٥ نماذج أولية، وتوفير ٢٠ فرصة تدريب.',
  'يفتح التسجيل في ١ أكتوبر ٢٠٢٦ وتُرسل رسائل القبول في ١٠ نوفمبر ٢٠٢٦.',
  'تبدأ الفعالية في ٢٠ نوفمبر ٢٠٢٦ وتنتهي في ٢٥ نوفمبر ٢٠٢٦.',
  'اليوم الأول: تصميم تجربة المستخدم. اليوم الثاني: بناء الواجهات الخلفية.',
  'باقة الماس ١١٠٬٠٠٠ ريال وتشمل إقامة الهاكثون في مقر الراعي.',
  'باقة الذهب ٦٠٬٠٠٠ ريال، متاحة لجهتين فقط.',
  'حضر هاكاثون فنتك السابق ٣٠٠ مشارك.',
  'للتواصل: ftc@ksu.edu.sa، نادي تقنية المستقبل، عمادة شؤون الطلاب.'
].join('\n');

const Q={
  1:'يقام في الرياض على مدى ستة أيام بمشاركة ثلاثين فريقاً',
  2:'الوصول إلى ١٢٠ مشاركاً، وإطلاق ٥ نماذج أولية',
  3:'يفتح التسجيل في ١ أكتوبر ٢٠٢٦ وتُرسل رسائل القبول في ١٠ نوفمبر ٢٠٢٦',
  4:'اليوم الأول: تصميم تجربة المستخدم. اليوم الثاني: بناء الواجهات الخلفية',
  5:'باقة الماس ١١٠٬٠٠٠ ريال وتشمل إقامة الهاكثون في مقر الراعي',
  6:'حضر هاكاثون فنتك السابق ٣٠٠ مشارك',
  7:'للتواصل: ftc@ksu.edu.sa، نادي تقنية المستقبل، عمادة شؤون الطلاب',
  8:'بروفايل رعاية هاكاثون المستقبل ٢٠٢٦'
};
const mk=()=>RUBRIC.criteria.map(c=>({
  id:c.id,level:'قوي',quote:Q[c.id],fix:'إصلاح '+c.id,reason:'سبب '+c.id
}));
const modelReply=()=>({code:200,body:{stop_reason:'tool_use',content:[{
  type:'tool_use',name:'submit_rubric_scores',input:{criteria:mk()}
}]}});

const intake=__F.SS.insertSheet(CONFIG_2.SHEETS.INTAKE_LOG);
intake.appendRow(['التاريخ','المشروع','القائد','النوع','الحضور','الميزانية','المدة',
  'أصحاب المنفعة','إشارة النوع','إشارة الميزانية','الحالة','الحجم المقترح',
  'الحجم المعتمد','سبب التصعيد','معرّف المشروع','إيميل الفريق']);
intake.appendRow([new Date(),'هاكاثون المستقبل','قائد','هاكاثون',150,45000,'٢ إلى ٣ أيام',
  'شركات','كبير','كبير','تلقائي','كبير','كبير','','FTC-26-101','team101@ksu.example']);

const ps=proposalsSheet();
const prow=new Array(proposalWidth_()).fill('');
const put=(k,v)=>{prow[proposalCol(k)-1]=v;};
__F.FILES['lead-review-text']={name:'proposal.txt',content:PROPOSAL};
put('reviewId','FTC-26-101-2B-1');put('projectId','FTC-26-101');
put('name','هاكاثون المستقبل');put('email','team101@ksu.example');
put('submitted',new Date());put('size','كبير');put('source','Google Doc');
put('textFileId','lead-review-text');put('charCount',PROPOSAL.length);put('state','مستلم');
ps.appendRow(prow);

__F.FETCH.queue.push(modelReply());
scoreProposal('FTC-26-101');
const cs=criterionLogSheet();
const criterionRows=()=>cs.getRange(2,1,cs.getLastRow()-1,CRITERION_LOG_HEADERS.length)
  .getValues().map((r,i)=>({values:r,row:i+2}))
  .filter(x=>x.values[0]==='FTC-26-101-2B-1');
const criterion=(id)=>criterionRows().filter(x=>x.values[3]==='معيار '+id)[0];
const edit=(sheet,row,col,value,userEmail,oldValue)=>{
  sheet.getRange(row,col).setValue(value);
  onScoringReviewEdit({range:{
    getSheet:()=>sheet,getRow:()=>row,getColumn:()=>col,getValue:()=>value
  },user:userEmail?{getEmail:()=>userEmail}:undefined,oldValue:oldValue});
};

T('التقييم يبقى عند القائد ولا يصل الفريق قبل الاعتماد',()=>{
  if(mailsTo('team101@ksu.example').length)return 'وصل الفريق قبل اعتماد القائد';
  return latestProposalFor('FTC-26-101').state===PROPOSAL_STATE.SCORED
    ?true:'الحالة مو مُقيَّم';
});

T('شاشة القائد مركّبة بقوائم منسدلة وتريقر تعديل',()=>{
  if(typeof installScoringReviewValidation!=='function')return 'دالة القوائم المنسدلة ناقصة';
  if(typeof installScoringReviewTrigger!=='function')return 'دالة التريقر ناقصة';
  const form=String(createProposalForm);
  if(form.indexOf('installScoringReviewValidation()')===-1)return 'إنشاء الفورم ما يركّب شاشة المراجعة';
  if(form.indexOf('installScoringReviewTrigger()')===-1)return 'إنشاء الفورم ما يركّب تريقر المراجعة';
  return true;
});

T('مسودة القائد تشرح مسار التعديل والإرسال الحالي',()=>{
  const src=String(emailLeadScoringDraft_);
  if(src.indexOf('نتيجة القائد')===-1)return 'تعليمات تعديل الدرجة ناقصة';
  if(src.indexOf('قرار القائد')===-1)return 'تعليمات الاعتماد ناقصة';
  if(src.indexOf('ما بُنيتا بعد')!==-1)return 'المسودة ما زالت تقول إن الخطوتين ناقصتان';
  return true;
});

T('فحص الإعدادات يعتبر مفتاح Anthropic المفقود عائق تشغيل',()=>{
  const originalKey=__F.PROPS.ANTHROPIC_API_KEY;
  const originalUi=SpreadsheetApp.getUi;
  let msg='';
  try {
    delete __F.PROPS.ANTHROPIC_API_KEY;
    SpreadsheetApp.getUi=()=>({ButtonSet:{OK:'OK'},alert:(title,body)=>{msg=body||title;}});
    checkConfig();
  } finally {
    __F.PROPS.ANTHROPIC_API_KEY=originalKey;
    SpreadsheetApp.getUi=originalUi;
  }
  if(msg.indexOf('ANTHROPIC_API_KEY')===-1)return 'ما ذكر المفتاح المفقود';
  return msg.indexOf('يوقف التشغيل')!==-1?true:'صنّفه تحذيراً بدل عائق';
});

T('فحص الإعدادات يتحقق من فتح ورقة الأرقام ولا يكتفي بوجود معرّف',()=>{
  const originalId=CONFIG_2.CENTRAL_FIGURES_SHEET_ID;
  const originalOpen=SpreadsheetApp.openById;
  const originalUi=SpreadsheetApp.getUi;
  let msg='';
  try {
    CONFIG_2.CENTRAL_FIGURES_SHEET_ID='inaccessible-sheet';
    SpreadsheetApp.openById=()=>{throw new Error('permission denied');};
    SpreadsheetApp.getUi=()=>({ButtonSet:{OK:'OK'},alert:(title,body)=>{msg=body||title;}});
    checkConfig();
  } finally {
    CONFIG_2.CENTRAL_FIGURES_SHEET_ID=originalId;
    SpreadsheetApp.openById=originalOpen;
    SpreadsheetApp.getUi=originalUi;
  }
  const warningAt=msg.indexOf('⚠️ معطّل أو ناقص:');
  const reasonAt=msg.indexOf('ما قدرنا نفتح ورقة الأرقام المركزية');
  const readyAt=msg.indexOf('✓ جاهز:');
  if(reasonAt===-1)return 'قال إن الورقة مربوطة رغم تعذر فتحها';
  return reasonAt>warningAt&&(readyAt===-1||reasonAt<readyAt)
    ?true:'سبب تعذر الورقة مو داخل قسم التحذيرات';
});

T('فحص الإعدادات يحذّر من ورقة أرقام صحيحة المخطط لكنها فارغة',()=>{
  const sh=__F.SS.insertSheet('أرقام فارغة للفحص');
  sh.appendRow(FIGURES_HEADERS);
  const originalId=CONFIG_2.CENTRAL_FIGURES_SHEET_ID;
  const originalOpen=SpreadsheetApp.openById;
  const originalUi=SpreadsheetApp.getUi;
  let msg='';
  try {
    CONFIG_2.CENTRAL_FIGURES_SHEET_ID='EMPTY-FIGURES';
    SpreadsheetApp.openById=()=>({getSheets:()=>[sh]});
    SpreadsheetApp.getUi=()=>({ButtonSet:{OK:'OK'},alert:(title,body)=>{msg=body||title;}});
    checkConfig();
  } finally {
    CONFIG_2.CENTRAL_FIGURES_SHEET_ID=originalId;
    SpreadsheetApp.openById=originalOpen;
    SpreadsheetApp.getUi=originalUi;
  }
  const warningAt=msg.indexOf('⚠️ معطّل أو ناقص:');
  const reasonAt=msg.indexOf('الجدول المعتمد ما فيه ولا صف');
  const readyAt=msg.indexOf('✓ جاهز:');
  if(reasonAt===-1)return 'ما كشف الورقة الفارغة';
  return reasonAt>warningAt&&(readyAt===-1||reasonAt<readyAt)
    ?true:'سبب الورقة الفارغة مو داخل قسم التحذيرات';
});

T('فحص الإعدادات يعلن ورقة الأرقام جاهزة فقط مع صف رقمي موثّق',()=>{
  const sh=__F.SS.insertSheet('أرقام جاهزة للفحص');
  sh.appendRow(FIGURES_HEADERS);
  sh.appendRow(['فنتك','2025','','300','','','','','التقرير الختامي']);
  const originalId=CONFIG_2.CENTRAL_FIGURES_SHEET_ID;
  const originalOpen=SpreadsheetApp.openById;
  const originalUi=SpreadsheetApp.getUi;
  let msg='';
  try {
    CONFIG_2.CENTRAL_FIGURES_SHEET_ID='VALID-FIGURES';
    SpreadsheetApp.openById=()=>({getSheets:()=>[sh]});
    SpreadsheetApp.getUi=()=>({ButtonSet:{OK:'OK'},alert:(title,body)=>{msg=body||title;}});
    checkConfig();
  } finally {
    CONFIG_2.CENTRAL_FIGURES_SHEET_ID=originalId;
    SpreadsheetApp.openById=originalOpen;
    SpreadsheetApp.getUi=originalUi;
  }
  return msg.indexOf('ورقة الأرقام المركزية جاهزة: 1 صف معتمد')!==-1
    ?true:'ما أعلن الورقة الموثقة جاهزة';
});

T('أي محرر غير قائد اللجنة لا يقدر يعتمد أو يرسل',()=>{
  edit(ps,2,proposalCol('lead'),'معتمد بتعديلات','member@ksu.example');
  if(mailsTo('team101@ksu.example').length)return 'محرر غير القائد أرسل التقييم';
  if(ps.getRange(2,proposalCol('lead')).getValue()!=='')return 'ما مسح محاولة الاعتماد';
  return latestProposalFor('FTC-26-101').state===PROPOSAL_STATE.SCORED
    ?true:'غيّر الحالة لمحرر غير مخوّل';
});

T('أي محرر غير قائد اللجنة لا يقدر يعدّل درجات القائد',()=>{
  const c=criterion(1);
  edit(cs,c.row,12,'ضعيف','member@ksu.example','');
  const row=cs.getRange(c.row,1,1,CRITERION_LOG_HEADERS.length).getValues()[0];
  return row[11]===''?true:'بقي تعديل غير مخوّل في السجل';
});

T('القائد يغيّر مستوى أي معيار والدرجة تُحسب من وزنه',()=>{
  const c=criterion(2);
  edit(cs,c.row,12,'ضعيف');
  const row=cs.getRange(c.row,1,1,CRITERION_LOG_HEADERS.length).getValues()[0];
  if(row[12]!==0)return 'درجة القائد: '+row[12];
  if(row[13]!=='نعم')return 'ما علّم الصف كمعدّل';
  return true;
});

T('المعيار السادس المعطّل ما يقدر القائد يمنحه درجة بلا ورقة أرقام',()=>{
  const c=criterion(6);
  edit(cs,c.row,12,'قوي');
  const row=cs.getRange(c.row,1,1,CRITERION_LOG_HEADERS.length).getValues()[0];
  if(row[11]!=='')return 'قبل مستوى القائد رغم تعطيل المرجع';
  if(row[12]!=='')return 'حسب درجة رغم تعطيل المرجع';
  return true;
});

T('معيار الدقة لا يقبل المستوى غير الموجود "مقبول"',()=>{
  const c=criterion(8);
  edit(cs,c.row,12,'مقبول');
  const row=cs.getRange(c.row,1,1,CRITERION_LOG_HEADERS.length).getValues()[0];
  if(row[11]!=='')return 'قبل مستوى مقبول للمعيار ٨';
  if(row[12]!=='')return 'حسب درجة لمستوى غير صالح';
  return true;
});

T('قرار يخالف الدرجات النهائية لا يُرسل للفريق',()=>{
  edit(ps,2,proposalCol('lead'),'معتمد');
  if(mailsTo('team101@ksu.example').length)return 'أرسل قراراً يخالف الروبريك';
  if(ps.getRange(2,proposalCol('lead')).getValue()!=='')return 'ما مسح القرار المرفوض';
  return latestProposalFor('FTC-26-101').state===PROPOSAL_STATE.SCORED
    ?true:'غيّر الحالة رغم الرفض';
});

T('اختلاف قرار القائد عن المحسوب يحتاج سبباً',()=>{
  edit(ps,2,proposalCol('lead'),'إعادة تقديم');
  if(mailsTo('team101@ksu.example').length)return 'أرسل بلا سبب اختلاف';
  return ps.getRange(2,proposalCol('lead')).getValue()===''
    ?true:'ما مسح القرار حتى يُكتب السبب أولاً';
});

T('إصلاح فارغ يمنع اعتماد تقييم نهائي',()=>{
  const c=criterion(2);
  cs.getRange(c.row,11).setValue('');
  ps.getRange(2,proposalCol('leadReason')).setValue('الهدف العددي لا يقيس نتيجة فعلية.');
  edit(ps,2,proposalCol('lead'),'إعادة تقديم');
  const sent=mailsTo('team101@ksu.example').length;
  cs.getRange(c.row,11).setValue('إصلاح 2');
  if(sent)return 'أرسل معياراً بلا إصلاح';
  return latestProposalFor('FTC-26-101').state===PROPOSAL_STATE.SCORED
    ?true:'غيّر الحالة رغم نقص الإصلاح';
});

T('المعيار غير القابل للتقييم يحتاج إصلاحاً قبل الإرسال أيضاً',()=>{
  const c=criterion(1);
  edit(cs,c.row,12,'غير قابل للتقييم');
  cs.getRange(c.row,11).setValue('');
  const before=mailsTo('team101@ksu.example').length;
  edit(ps,2,proposalCol('lead'),'إعادة تقديم');
  const sent=mailsTo('team101@ksu.example').length-before;
  cs.getRange(c.row,11).setValue('إصلاح 1');
  edit(cs,c.row,12,'');
  return sent===0?true:'أرسل معياراً غير مقيّم بلا إصلاح';
});

T('فشل تسجيل القرار يمنع إرسال البريد',()=>{
  const original=recordLeadDecision;
  const before=mailsTo('team101@ksu.example').length;
  let sent;
  try {
    recordLeadDecision=()=>false;
    edit(ps,2,proposalCol('lead'),'إعادة تقديم');
    sent=mailsTo('team101@ksu.example').length-before;
  } finally {
    recordLeadDecision=original;
    ps.getRange(2,proposalCol('state')).setValue(PROPOSAL_STATE.SCORED);
    ps.getRange(2,proposalCol('lead')).setValue('');
    while(mailsTo('team101@ksu.example').length>before){
      const i=__F.MAILS.findIndex(m=>m.to==='team101@ksu.example');
      __F.MAILS.splice(i,1);
    }
  }
  return sent===0?true:'أرسل رغم أن القرار ما انسجّل';
});

T('فشل MailApp لا يترك الحالة قابلة لإعادة إرسال تلقائي',()=>{
  const original=MailApp.sendEmail;
  let stateDuring='';
  try {
    MailApp.sendEmail=()=>{
      stateDuring=latestProposalFor('FTC-26-101').state;
      throw new Error('mail unavailable');
    };
    edit(ps,2,proposalCol('lead'),'إعادة تقديم');
  } finally {
    MailApp.sendEmail=original;
  }
  const failed=latestProposalFor('FTC-26-101').state;
  edit(ps,2,proposalCol('lead'),'إعادة تقديم');
  const stillFailed=latestProposalFor('FTC-26-101').state;
  ps.getRange(2,proposalCol('state')).setValue(PROPOSAL_STATE.SCORED);
  ps.getRange(2,proposalCol('lead')).setValue('');
  if(stateDuring!==PROPOSAL_STATE.SENDING)return 'ما ثبّت حالة قيد الإرسال قبل MailApp: '+stateDuring;
  if(failed!==PROPOSAL_STATE.SEND_FAILED)return 'حالة الفشل: '+failed;
  return stillFailed===PROPOSAL_STATE.SEND_FAILED?true:'سمح بإعادة آلية بعد فشل ملتبس';
});

T('اعتماد القائد يرسل التقييم النهائي مرة واحدة ويسجّله',()=>{
  ps.getRange(2,proposalCol('leadReason')).setValue('الهدف العددي لا يقيس نتيجة فعلية.');
  edit(ps,2,proposalCol('lead'),'إعادة تقديم');
  const mails=mailsTo('team101@ksu.example');
  if(mails.length!==1)return 'عدد رسائل الفريق: '+mails.length;
  const body=mails[0].htmlBody;
  if(body.indexOf('إعادة تقديم')===-1)return 'القرار النهائي ناقص';
  if(body.indexOf('2. الأهداف القابلة للقياس')===-1)return 'جدول المعايير ناقص';
  if(body.indexOf('الوصول إلى ١٢٠ مشاركاً')===-1)return 'الاقتباس ناقص';
  if(body.indexOf('إصلاح 2')===-1)return 'الإصلاح ناقص';
  if(body.indexOf('26 من 32')===-1)return 'المجموع النهائي غلط أو ناقص';
  const p=latestProposalFor('FTC-26-101');
  if(p.state!==PROPOSAL_STATE.SENT)return 'الحالة: '+p.state;
  const log=reviewLogSheet().getRange(2,1,reviewLogSheet().getLastRow()-1,REVIEW_LOG_HEADERS.length).getValues()
    .filter(r=>r[0]==='FTC-26-101-2B-1')[0];
  if(log[8]!=='إعادة تقديم')return 'قرار القائد ما انسجّل';
  if(log[9].indexOf('الهدف العددي')===-1)return 'سبب الاختلاف ما انسجّل';
  if(log[16]!==26)return 'المجموع النهائي ما انسجّل: '+JSON.stringify(log);
  if(log[17]!==32)return 'الحد الأعلى النهائي ما انسجّل: '+JSON.stringify(log);
  if(p.score!==26)return 'درجة البربوزل بقيت قديمة: '+p.score;
  return true;
});

T('إعادة تشغيل حدث الاعتماد ما يكرر البريد',()=>{
  edit(ps,2,proposalCol('lead'),'إعادة تقديم');
  return mailsTo('team101@ksu.example').length===1?true:'تكرر البريد';
});

const passed=R.filter(r=>r.p).length;
console.log('\n=== اختبارات مراجعة القائد والإرسال (٢ب — الخطوتان ٧ و٨) ===');
R.forEach(r=>console.log((r.p?'  ✓ ':'  ✗ ')+r.n+(r.note?'  →  '+r.note:'')));
console.log('\n'+passed+' من '+R.length+' ناجحة\n');
process.exit(passed===R.length?0:1);
