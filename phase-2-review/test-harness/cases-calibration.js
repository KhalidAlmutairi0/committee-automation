const R=[];
const T=(n,f)=>{let p=false,note='';try{const r=f();p=r===true;note=r===true?'':String(r);}
  catch(e){note='استثناء: '+e.message+' @'+(e.stack||'').split('\n')[1];}R.push({n,p,note});};

const EXPECTED={
  fintech:     [2,2,2,0,0,null,0,0],
  qiwam:       [2,0,1,2,1,null,0,1],
  startupFair: [1,0,1,1,null,null,2,0]
};
const QUOTES={
  fintech:'اقتباس معايرة طويل موثق من بربوزل فنتك',
  qiwam:'اقتباس معايرة طويل موثق من بربوزل قوام',
  startupFair:'اقتباس معايرة طويل موثق من بربوزل ستارت أب فير'
};
const CASES={
  fintech:{name:'فنتك',text:QUOTES.fintech},
  qiwam:{name:'قِوام',text:QUOTES.qiwam},
  startupFair:{name:'StartUp Fair',text:QUOTES.startupFair}
};

const level=n=>n===0?'ضعيف':n===1?'مقبول':'قوي';
const replies=[];
['fintech','qiwam','startupFair'].forEach(key=>{
  const criteria=RUBRIC.criteria.map(c=>({
    id:c.id,
    level:c.id===5&&EXPECTED[key][4]===null?NOT_ASSESSABLE:level(2),
    quote:c.id===5&&EXPECTED[key][4]===null?'':QUOTES[key],
    fix:'إصلاح محدد '+c.id,
    reason:'سبب '+c.id
  }));
  replies.push({stop_reason:'tool_use',content:[{
    type:'tool_use',name:'submit_rubric_scores',input:{criteria}
  }]});
});

let calls=0;
const beforeMail=__F.MAILS.length;
const beforeSheets=Object.keys(__F.SHEETS).length;
let report;

T('جدول المعايرة من الروبريك منقول حرفياً',()=>{
  return JSON.stringify(SCORING_CALIBRATION_EXPECTED)===JSON.stringify(EXPECTED)
    ?true:'جدول التوقعات مختلف: '+JSON.stringify(SCORING_CALIBRATION_EXPECTED);
});

T('المعايرة تشغّل المقترحات الثلاثة ولا تكتب في السجلات أو البريد',()=>{
  report=runScoringCalibration(CASES,()=>replies[calls++]);
  if(calls!==3)return 'عدد نداءات المودل: '+calls;
  if(report.cases.length!==3)return 'عدد تقارير المقترحات: '+report.cases.length;
  if(__F.MAILS.length!==beforeMail)return 'المعايرة أرسلت بريداً';
  return Object.keys(__F.SHEETS).length===beforeSheets?true:'المعايرة أنشأت شيتاً';
});

T('المعيار السادس متخطى في التقارير الثلاثة',()=>{
  const sixes=report.cases.map(c=>c.criteria.filter(r=>r.id===6)[0]);
  return sixes.every(row=>row.skipped===true&&row.matches===null)
    ?true:'المعيار السادس دخل المقارنة: '+JSON.stringify(sixes);
});

T('كل اختلاف يطبع درجة المتوقع والفعلي واقتباس المودل',()=>{
  const disagreements=[];
  report.cases.forEach(c=>c.criteria.forEach(row=>{if(row.matches===false)disagreements.push(row);}));
  if(!disagreements.length)return 'الفكستر ما صنع اختلافاً';
  if(disagreements.some(row=>!row.quote))return 'اختلاف بلا اقتباس';
  if(report.text.indexOf('المتوقع:')===-1||report.text.indexOf('المودل:')===-1)
    return 'التقرير ما طبع المقارنة';
  return report.text.indexOf('اقتباس المودل:')!==-1?true:'التقرير ما طبع دليل الاختلاف';
});

const passed=R.filter(r=>r.p).length;
console.log('\n=== اختبارات منطق معايرة تقييم الروبريك (API مزيف) ===');
R.forEach(r=>console.log((r.p?'  ✓ ':'  ✗ ')+r.n+(r.note?'  →  '+r.note:'')));
console.log('\n'+passed+' من '+R.length+' ناجحة\n');
process.exit(passed===R.length?0:1);
