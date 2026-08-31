CONFIG.OWNER_EMAIL='lead@ksu.example';
CONFIG_2.LEAD_EMAIL='lead@ksu.example';
const R=[];const T=(n,f)=>{let p=false,note='';try{const r=f();p=r===true;note=r===true?'':String(r);}
  catch(e){note='استثناء: '+e.message+' @'+(e.stack||'').split('\n')[1];}R.push({n,p,note});};

function submit(name,formats,head,budget,email){
  const A={'اسم المشروع':name,'اسم قائد المشروع':'سعد','رقم قائد المشروع (واتساب)':'0500000000',
    'نوع المشروع':formats,'عدد الحضور / المشاركين المتوقع':String(head),
    'الميزانية التقديرية (ريال)':String(budget),'مدة التنفيذ':'٢ إلى ٣ أيام',
    'أصحاب المنفعة / الجهات المتوقعة':['شركات'],'الموارد المطلوبة من النادي':['قاعة']};
  const items=Object.keys(A).map(k=>({getItem:()=>({getTitle:()=>k}),getResponse:()=>A[k]}));
  onFormSubmit({response:{getItemResponses:()=>items,getRespondentEmail:()=>email}});
}

T('المعرّف يتولّد عند التسليم ويتسلسل',()=>{
  submit('ملتقى أ',['معسكر تدريبي'],100,25000,'a@ksu.example');
  submit('ملتقى ب',['ورشة عمل'],40,3000,'b@ksu.example');
  submit('ملتقى ج',['هاكاثون'],200,60000,'c@ksu.example');
  const sh=__F.SHEETS['سجل القرارات'];
  const ids=sh.getRange(2,15,3,1).getValues().map(r=>r[0]);
  const yy=String(new Date().getFullYear()).slice(-2);
  const want=['FTC-'+yy+'-001','FTC-'+yy+'-002','FTC-'+yy+'-003'];
  if(ids.join(',')!==want.join(','))return 'المعرّفات: '+ids.join(',');
  const mails=sh.getRange(2,16,3,1).getValues().map(r=>r[0]);
  if(mails.join(',')!=='a@ksu.example,b@ksu.example,c@ksu.example')return 'الإيميلات: '+mails.join(',');
  return true;
});

T('رؤوس سجل المرحلة ١ صارت ١٦ عموداً',()=>{
  const h=__F.SHEETS['سجل القرارات'].getRange(1,1,1,16).getValues()[0];
  if(h[14]!=='معرّف المشروع')return 'العمود ١٥: '+h[14];
  if(h[15]!=='إيميل الفريق')return 'العمود ١٦: '+h[15];
  return true;
});

T('المعرّف يوصل الفريق في إيميل الاعتماد التلقائي',()=>{
  const m=__F.MAILS.filter(x=>x.to==='b@ksu.example');
  if(m.length!==1)return 'إيميلات: '+m.length;
  const yy=String(new Date().getFullYear()).slice(-2);
  if(m[0].htmlBody.indexOf('FTC-'+yy+'-002')===-1)return 'المعرّف ما وصل';
  return true;
});

T('المعرّف يوصل الفريق في إيميل التصعيد كمان',()=>{
  // معسكر تدريبي بـ١٠٠ حاضر: النوع يقول كبير (فوق ٨٠) والميزانية تقول متوسط = تعارض
  const m=__F.MAILS.filter(x=>x.to==='a@ksu.example');
  if(m.length!==1)return 'إيميلات: '+m.length;
  const yy=String(new Date().getFullYear()).slice(-2);
  if(m[0].htmlBody.indexOf('FTC-'+yy+'-001')===-1)return 'المعرّف ما وصل';
  if(m[0].htmlBody.indexOf('ما تم اعتماد حجم')===-1)return 'ما حافظ على قاعدة عدم ذكر الحجم';
  return true;
});

T('التصنيف نفسه ما تغيّر',()=>{
  const sh=__F.SHEETS['سجل القرارات'];
  const rows=sh.getRange(2,11,3,3).getValues();   // الحالة، المقترح، المعتمد
  const got=rows.map(r=>r[0]+'/'+r[1]).join(' , ');
  const want='مُصعَّد/كبير , تلقائي/صغير , تلقائي/كبير';
  return got===want?true:'النتائج: '+got;
});

T('المرحلة ٢ تقرأ مشروعاً كتبته المرحلة ١',()=>{
  const yy=String(new Date().getFullYear()).slice(-2);
  const p=getProject('FTC-'+yy+'-001');
  if(!p)return 'ما لقاه';
  if(p.projectName!=='ملتقى أ')return 'الاسم: '+p.projectName;
  if(p.email!=='a@ksu.example')return 'الإيميل: '+p.email;
  if(p.formats.join(',')!=='معسكر تدريبي')return 'النوع: '+p.formats.join(',');
  if(!hasSelectiveAdmission(p))return 'ما عرف أن المعسكر فيه قبول انتقائي';
  if(checkEligibleFor2A(p).ok!==false)return 'قبل مشروعاً ما اعتُمد حجمه';
  return true;
});

const passed=R.filter(r=>r.p).length;
console.log('\n=== اختبارات توافق المرحلة ١ ===');
R.forEach(r=>console.log((r.p?'  ✓ ':'  ✗ ')+r.n+(r.note?'  →  '+r.note:'')));
console.log('\n'+passed+' من '+R.length+' ناجحة\n');
process.exit(passed===R.length?0:1);
