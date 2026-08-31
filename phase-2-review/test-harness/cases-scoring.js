CONFIG_2.LEAD_EMAIL='lead@ksu.example';
const R=[];const T=(n,f)=>{let p=false,note='';try{const r=f();p=r===true;note=r===true?'':String(r);}
  catch(e){note='استثناء: '+e.message+' @'+(e.stack||'').split('\n')[1];}R.push({n,p,note});};
const mailsTo=a=>__F.MAILS.filter(m=>m.to===a);
const clearMails=()=>{__F.MAILS.length=0;};

// نص بربوزل فيه عبارات نقتبس منها
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

// --- تجهيز مشروع وبربوزل ---
const intake=__F.SS.insertSheet(CONFIG_2.SHEETS.INTAKE_LOG);
intake.appendRow(['التاريخ','المشروع','القائد','النوع','الحضور','الميزانية','المدة',
  'أصحاب المنفعة','إشارة النوع','إشارة الميزانية','الحالة','الحجم المقترح',
  'الحجم المعتمد','سبب التصعيد','معرّف المشروع','إيميل الفريق']);
intake.appendRow([new Date(),'هاكاثون المستقبل','قائد','هاكاثون',150,45000,'٢ إلى ٣ أيام',
  'شركات','كبير','كبير','تلقائي','كبير','كبير','','FTC-26-001','team1@ksu.example']);

const ps=proposalsSheet();
const prow=new Array(proposalWidth_()).fill('');
const pput=(k,v)=>{prow[proposalCol(k)-1]=v;};
__F.FILES['txt-1']={name:'p.txt',content:PROPOSAL};
pput('reviewId','FTC-26-001-2B-1');pput('projectId','FTC-26-001');
pput('name','هاكاثون المستقبل');pput('email','team1@ksu.example');
pput('submitted',new Date());pput('size','كبير');pput('source','Google Doc');
pput('textFileId','txt-1');pput('charCount',PROPOSAL.length);
pput('state','مستلم');
ps.appendRow(prow);

// --- بناء رد مزيف من المودل ---
function modelReply(criteria,stop){
  return {code:200,body:{
    stop_reason:stop||'tool_use',
    model:'claude-opus-5',
    content:[{type:'tool_use',name:'submit_rubric_scores',id:'t1',
              input:{criteria:criteria}}]
  }};
}
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
const mk=(overrides)=>RUBRIC.criteria.map(c=>Object.assign({
  id:c.id,level:'قوي',quote:Q[c.id],fix:'إصلاح '+c.id,reason:'سبب '+c.id
},(overrides||{})[c.id]||{}));
const resetProposal=()=>{
  ps.getRange(2,proposalCol('state')).setValue('مستلم');
};

// ============================================================

T('أوزان الروبريك تعطي ٣٨ بالضبط',()=>rubricSelfCheck());

T('المعيار السادس ينعطّل والورقة فاضية، والتقييم يكمل',()=>{
  clearMails();resetProposal();
  __F.FETCH.queue.push(modelReply(mk()));
  const r=scoreProposal('FTC-26-001');
  const six=r.items.filter(i=>i.criterion.id===6)[0];
  if(!six.disabled)return 'المعيار ٦ ما انعطّل';
  if(six.level!=='غير قابل للتقييم')return 'المستوى: '+six.level;
  if(six.assessed)return 'احتُسب رغم التعطيل';
  const others=r.items.filter(i=>i.criterion.id!==6&&i.assessed).length;
  if(others!==7)return 'باقي المعايير ما كملت: '+others+' من ٧';
  return true;
});

T('التحذير يوصل القائد ويقول إن الورقة فاضية',()=>{
  const b=mailsTo('lead@ksu.example').slice(-1)[0].htmlBody;
  if(b.indexOf('المعيار السادس')===-1)return 'ما ذكر المعيار السادس';
  if(b.indexOf('ما راح يُخمَّن أي رقم')===-1)return 'ما وعد بعدم التخمين';
  return true;
});

T('السقف: مجموع يكفي "معتمد" لكن معياراً حاجباً ما انفحص',()=>{
  clearMails();resetProposal();
  __F.FETCH.queue.push(modelReply(mk()));
  const r=scoreProposal('FTC-26-001');
  // كل شي قوي عدا ٦ المعطّل: 38 - 6 = 32 ≥ 30
  if(r.outcome.total!==32)return 'المجموع: '+r.outcome.total;
  if(r.outcome.effectiveMax!==32)return 'الأقصى الفعلي: '+r.outcome.effectiveMax;
  if(!r.outcome.capped)return 'ما طبّق السقف';
  if(r.outcome.decision!=='معتمد بتعديلات')return 'القرار: '+r.outcome.decision;
  return true;
});

T('معيار حاجب "ضعيف" يرفض حتى عند ٣٥ من ٣٨',()=>{
  clearMails();resetProposal();
  // اجعل ٧ ضعيفاً (وزن ٢): 38 - 4 = 34 ... ثم عطّل ٦ يدوياً بجعله متاحاً
  const figs={available:true,rows:[{event:'فنتك',year:'2025',registered:'',attended:'300',
    workshops:'',prizes:'',views:'',partners:'',source:'التقرير الختامي'}],skipped:0,reason:''};
  const items=validateScoring(mk({7:{level:'ضعيف'}}),PROPOSAL,figs);
  const out=computeRubricDecision(items);
  if(out.total!==34)return 'المجموع: '+out.total;   // ٣٨ ناقص ٤
  if(out.decision!=='إعادة تقديم')return 'القرار عند ٣٤ ومعيار حاجب ضعيف: '+out.decision;
  if(!out.blockingWeak.length)return 'ما سجّل الرفض الحاجب';
  return true;
});

T('٣٥ من ٣٨ مع معيار حاجب ضعيف = إعادة تقديم',()=>{
  const figs={available:true,rows:[{event:'x',source:'y'}],skipped:0,reason:''};
  // ٨ ضعيف (وزن ٢ → ناقص ٤)، والباقي قوي = ٣٤. نرفع ١ و٤ للتأكد من العتبة
  const items=validateScoring(mk({8:{level:'ضعيف'}}),PROPOSAL,figs);
  const out=computeRubricDecision(items);
  if(out.decision!=='إعادة تقديم')return 'القرار: '+out.decision+' عند '+out.total;
  return true;
});

T('اقتباس مهلوس يسقّط الدرجة ولا يحتسبها',()=>{
  const figs={available:true,rows:[{event:'x',source:'y'}],skipped:0,reason:''};
  const items=validateScoring(
    mk({4:{quote:'الوثيقة تتضمن أجندة يومية مفصلة لكل الأيام الستة'}}),PROPOSAL,figs);
  const four=items.filter(i=>i.criterion.id===4)[0];
  if(!four.rejectedQuote)return 'ما رفض الاقتباس المهلوس';
  if(four.assessed)return 'احتُسبت درجة على اقتباس غير موجود';
  if(four.level!=='غير قابل للتقييم')return 'المستوى: '+four.level;
  if(four.reason.indexOf('ما انوجد حرفياً')===-1)return 'السبب ما وضّح';
  return true;
});

T('اقتباس حقيقي يُقبل رغم اختلاف التشكيل والمسافات',()=>{
  const figs={available:true,rows:[{event:'x',source:'y'}],skipped:0,reason:''};
  const items=validateScoring(
    mk({1:{quote:'يقام   في الريـاض على مدى ستة أيام'}}),PROPOSAL,figs);
  const one=items.filter(i=>i.criterion.id===1)[0];
  return one.assessed?true:'رفض اقتباساً صحيحاً: '+one.reason;
});

T('اقتباس قصير جداً ما يبرر درجة',()=>{
  const figs={available:true,rows:[{event:'x',source:'y'}],skipped:0,reason:''};
  const items=validateScoring(mk({2:{quote:'الرياض'}}),PROPOSAL,figs);
  return items.filter(i=>i.criterion.id===2)[0].assessed===false
    ?true:'قبل اقتباساً من كلمة وحدة';
});

T('"غير قابل للتقييم" من المودل يُحترم ولا يُخمَّن',()=>{
  const figs={available:true,rows:[{event:'x',source:'y'}],skipped:0,reason:''};
  const items=validateScoring(
    mk({5:{level:'غير قابل للتقييم',quote:'',reason:'الباقات غير واضحة'}}),PROPOSAL,figs);
  const five=items.filter(i=>i.criterion.id===5)[0];
  if(five.assessed)return 'احتسب درجة لمعيار امتنع عنه المودل';
  if(five.score!==null)return 'أعطى درجة: '+five.score;
  return true;
});

T('معيار ناقص من رد المودل يصير غير قابل للتقييم',()=>{
  const figs={available:true,rows:[{event:'x',source:'y'}],skipped:0,reason:''};
  const partial=mk().filter(c=>c.id!==3);
  const items=validateScoring(partial,PROPOSAL,figs);
  const three=items.filter(i=>i.criterion.id===3)[0];
  if(items.length!==8)return 'عدد البنود: '+items.length;
  if(three.assessed)return 'احتسب معياراً ما أرسله المودل';
  return true;
});

T('معيار الدقة يقبل قوي أو ضعيف فقط، ولا يحتسب مقبول',()=>{
  const figs={available:true,rows:[{event:'x',source:'y'}],skipped:0,reason:''};
  const items=validateScoring(mk({8:{level:'مقبول'}}),PROPOSAL,figs);
  const eight=items.filter(i=>i.criterion.id===8)[0];
  if(eight.assessed)return 'احتسب مستوى غير موجود في قائمة الفحص';
  if(eight.level!=='غير قابل للتقييم')return 'المستوى: '+eight.level;
  return true;
});

T('البرومبت يمنع تقليد فنتك إلا في الخط الزمني',()=>{
  const sys=buildScoringSystemPrompt({available:false,rows:[],reason:'فاضية'});
  if(sys.indexOf('ولا وحدة منهما تعدي')===-1)return 'ما نفى أهليتهما كنموذج';
  if(sys.indexOf('معيار الخط الزمني')===-1)return 'ما حدّد الاستثناء';
  if(sys.indexOf('لا تقلّده فيها')===-1)return 'ما نبّه على ضعف فنتك';
  return true;
});

T('البرومبت يعطّل المعيار ٦ صراحةً والورقة فاضية',()=>{
  const sys=buildScoringSystemPrompt({available:false,rows:[],reason:'فاضية'});
  if(sys.indexOf('معطّل في هذه المراجعة')===-1)return 'ما عطّله في البرومبت';
  if(sys.indexOf('لا تخترع أرقاماً')===-1)return 'ما منع الاختراع';
  return true;
});

T('البرومبت يحقن الأرقام لما تكون متاحة',()=>{
  const figs={available:true,skipped:0,reason:'',rows:[{event:'فنتك',year:'2025',
    registered:'1750',attended:'300',workshops:'',prizes:'50000',views:'',partners:'',
    source:'التقرير الختامي'}]};
  const sys=buildScoringSystemPrompt(figs);
  if(sys.indexOf('ورقة الأرقام المركزية')===-1)return 'ما حقن الورقة';
  if(sys.indexOf('فنتك: السنة 2025')===-1)return 'ما حقن الصف';
  if(sys.indexOf('معطّل في هذه المراجعة')!==-1)return 'عطّل المعيار رغم توفر الورقة';
  return true;
});

T('ورقة بصفوف بلا مصدر تُعامل كفاضية',()=>{
  const sh=__F.SS.insertSheet('أرقام');
  sh.appendRow(FIGURES_HEADERS);
  sh.appendRow(['فنتك','2025','1750','300','','50000','','','']);   // بلا مصدر
  const saved=CONFIG_2.CENTRAL_FIGURES_SHEET_ID;
  CONFIG_2.CENTRAL_FIGURES_SHEET_ID='X';
  global.__origOpen=SpreadsheetApp.openById;
  SpreadsheetApp.openById=()=>({getSheets:()=>[sh]});
  try{
    const f=loadCentralFigures();
    if(f.available)return 'قبل صفاً بلا مصدر';
    if(f.skipped!==1)return 'ما عدّ المستبعد: '+f.skipped;
    return true;
  } finally{CONFIG_2.CENTRAL_FIGURES_SHEET_ID=saved;SpreadsheetApp.openById=__origOpen;}
});

T('صف باسم ومصدر فقط لا يفعّل معيار الأرقام بلا أي رقم',()=>{
  const sh=__F.SS.insertSheet('أرقام بلا مقاييس');
  sh.appendRow(FIGURES_HEADERS);
  sh.appendRow(['فنتك','2025','','','','','','','التقرير الختامي']);
  const saved=CONFIG_2.CENTRAL_FIGURES_SHEET_ID;
  const original=SpreadsheetApp.openById;
  CONFIG_2.CENTRAL_FIGURES_SHEET_ID='NO-METRICS';
  SpreadsheetApp.openById=()=>({getSheets:()=>[sh]});
  try{
    const f=loadCentralFigures();
    if(f.available)return 'فعّل المعيار بلا أي رقم فعلي';
    return f.skipped===1?true:'ما عدّ الصف المستبعد: '+f.skipped;
  } finally{CONFIG_2.CENTRAL_FIGURES_SHEET_ID=saved;SpreadsheetApp.openById=original;}
});

T('رؤوس ورقة أرقام غير مطابقة تعطّل المعيار',()=>{
  const sh=__F.SS.insertSheet('أرقام برؤوس خاطئة');
  sh.appendRow(['event','year','registered','attended','workshops','prizes','views','partners','source']);
  sh.appendRow(['فنتك','2025','','300','','','','','التقرير الختامي']);
  const saved=CONFIG_2.CENTRAL_FIGURES_SHEET_ID;
  const original=SpreadsheetApp.openById;
  CONFIG_2.CENTRAL_FIGURES_SHEET_ID='WRONG-HEADERS';
  SpreadsheetApp.openById=()=>({getSheets:()=>[sh]});
  try{
    const f=loadCentralFigures();
    if(f.available)return 'قبل مخطط أعمدة غير معتمد';
    return f.reason.indexOf('رؤوس')!==-1?true:'سبب غير واضح: '+f.reason;
  } finally{CONFIG_2.CENTRAL_FIGURES_SHEET_ID=saved;SpreadsheetApp.openById=original;}
});

T('نداء الـAPI يستخدم claude-opus-5 والأداة الصارمة',()=>{
  const c=__F.FETCH.calls.slice(-1)[0];
  if(c.payload.model!=='claude-opus-5')return 'المودل: '+c.payload.model;
  if(c.payload.thinking.type!=='adaptive')return 'التفكير: '+JSON.stringify(c.payload.thinking);
  if(c.payload.thinking.budget_tokens!==undefined)return 'أرسل budget_tokens المحذوف';
  if(c.payload.tools[0].strict!==true)return 'الأداة مو صارمة';
  if(c.payload.tool_choice.name!=='submit_rubric_scores')return 'ما أجبر الأداة';
  if(c.payload.output_config.effort!=='high')return 'الجهد: '+c.payload.output_config.effort;
  if(c.headers['anthropic-version']!=='2023-06-01')return 'نسخة الـAPI';
  if(c.payload.fallbacks!=='default')return 'ما فعّل الاحتياط';
  if(String(c.headers['anthropic-beta']).indexOf('server-side-fallback-2026-07-01')===-1)
    return 'ترويسة الاحتياط ناقصة';
  return true;
});

T('المفتاح من Script Properties مو من الكود',()=>{
  const c=__F.FETCH.calls.slice(-1)[0];
  if(c.headers['x-api-key']!=='test-key')return 'ما قرأ المفتاح';
  const src=String(scoreProposal)+String(callAnthropic_);
  if(/sk-ant-/.test(src))return 'مفتاح مكتوب في الكود';
  return true;
});

T('امتناع المودل يوقف التقييم ولا يخترع درجات',()=>{
  resetProposal();
  __F.FETCH.queue.push({code:200,body:{stop_reason:'refusal',
    stop_details:{type:'refusal',category:'other'},content:[]}});
  try{ scoreProposal('FTC-26-001'); return 'كمّل رغم الامتناع'; }
  catch(e){ return e.message.indexOf('امتنع')!==-1?true:'رسالة غلط: '+e.message; }
});

T('خطأ ٤٠٠ ما يُعاد، و٥٠٠ يُعاد',()=>{
  __F.FETCH.calls.length=0;resetProposal();
  __F.FETCH.queue.push({code:400,body:{error:{message:'bad'}}});
  try{ scoreProposal('FTC-26-001'); return 'ما رمى خطأ'; }catch(e){}
  if(__F.FETCH.calls.length!==1)return 'أعاد نداء ٤٠٠: '+__F.FETCH.calls.length;

  __F.FETCH.calls.length=0;resetProposal();
  __F.FETCH.queue.push({code:500,body:{}},{code:500,body:{}},{code:500,body:{}});
  try{ scoreProposal('FTC-26-001'); return 'ما رمى خطأ'; }catch(e){}
  if(__F.FETCH.calls.length!==3)return 'محاولات ٥٠٠: '+__F.FETCH.calls.length;
  return true;
});

T('ما فيه مسار يرسل التقييم للفريق',()=>{
  clearMails();resetProposal();
  __F.FETCH.queue.push(modelReply(mk()));
  scoreProposal('FTC-26-001');
  if(mailsTo('team1@ksu.example').length!==0)return 'وصل الفريق تقييم';
  if(mailsTo('lead@ksu.example').length!==1)return 'ما وصل القائد مسودة';
  const b=mailsTo('lead@ksu.example')[0].htmlBody;
  if(b.indexOf('هذي مسودة، ما وصلت الفريق')===-1)return 'ما وضّح أنها مسودة';
  const src=String(emailLeadScoringDraft_)+String(saveScoring_)+String(scoreProposal);
  if(/proposal\.email|team/.test(src))return 'الكود يشير لإيميل الفريق في مسار التقييم';
  return true;
});

T('السجلان ينكتبان بثمانية صفوف معايير',()=>{
  const cl=__F.SHEETS[CONFIG_2.SHEETS.CRITERION_LOG];
  const rows=cl.getRange(2,1,cl.getLastRow()-1,15).getValues()
    .filter(r=>String(r[2])==='2ب');
  if(rows.length%8!==0)return 'صفوف المعايير مو من مضاعفات ٨: '+rows.length;
  const last8=rows.slice(-8);
  const codes=last8.map(r=>r[3]).join(',');
  if(codes!=='معيار 1,معيار 2,معيار 3,معيار 4,معيار 5,معيار 6,معيار 7,معيار 8')
    return 'الرموز: '+codes;
  if(last8[5][6]!=='غير قابل للتقييم')return 'المعيار ٦ ما انسجّل معطّلاً: '+last8[5][6];
  if(last8[0][9].length<10)return 'الاقتباس ما انحفظ';
  return true;
});

T('حالة البربوزل تصير "مُقيَّم" والدرجة تنحفظ',()=>{
  const p=latestProposalFor('FTC-26-001');
  if(p.state!=='مُقيَّم')return 'الحالة: '+p.state;
  if(p.score!==32)return 'الدرجة: '+p.score;
  if(p.computed!=='معتمد بتعديلات')return 'القرار: '+p.computed;
  return true;
});

T('إعادة التقييم تنشئ معرّف مراجعة جديداً بلا صفوف معايير ملتبسة',()=>{
  const before=latestProposalFor('FTC-26-001').reviewId;
  __F.FETCH.queue.push(modelReply(mk()));
  scoreProposal('FTC-26-001');
  const after=latestProposalFor('FTC-26-001').reviewId;
  if(after===before)return 'أعاد استخدام معرّف المراجعة '+before;
  const rows=criterionLogSheet().getRange(2,1,criterionLogSheet().getLastRow()-1,15).getValues()
    .filter(r=>r[0]===after);
  if(rows.length!==8)return 'صفوف المراجعة الجديدة: '+rows.length;
  return true;
});

const passed=R.filter(r=>r.p).length;
console.log('\n=== اختبارات تقييم الروبريك (٢ب — الخطوة ٦) ===');
R.forEach(r=>console.log((r.p?'  ✓ ':'  ✗ ')+r.n+(r.note?'  →  '+r.note:'')));
console.log('\n'+passed+' من '+R.length+' ناجحة\n');
process.exit(passed===R.length?0:1);
