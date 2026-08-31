CONFIG_2.LEAD_EMAIL='lead@ksu.example';

const R=[];
const T=(n,f)=>{let p=false,note='';try{const r=f();p=r===true;note=r===true?'':String(r);}
  catch(e){note='استثناء: '+e.message+' @'+(e.stack||'').split('\n')[1];}R.push({n,p,note});};

let formSeq=0;
const forms={};
const created=[];
const triggers=[];
let alertText='';

function item_(){return {setTitle(){return this;},setHelpText(){return this;},
  setRequired(){return this;},setChoiceValues(){return this;}};}
function form_(id){
  const form={id:id,url:'https://forms.example/'+id,accepting:true,closedMessage:'',responses:[],
    getId(){return this.id;},getPublishedUrl(){return this.url;},getEditUrl(){return this.url+'/edit';},
    setDescription(){return this;},setCollectEmail(){return this;},setAllowResponseEdits(){return this;},
    addTextItem:item_,addDateItem:item_,addParagraphTextItem:item_,addMultipleChoiceItem:item_,
    addSectionHeaderItem:item_,setDestination(){return this;},
    isAcceptingResponses(){return this.accepting;},
    setAcceptingResponses(v){this.accepting=v;return this;},
    setCustomClosedFormMessage(v){this.closedMessage=v;return this;},
    getResponses(){return this.responses.slice();}};
  forms[id]=form;return form;
}
function response_(id,projectId,email){
  const title=CONFIG_2.FORM_2A.projectId;
  return {getId:()=>id,getTimestamp:()=>new Date('2026-08-31T10:00:00Z'),
    getRespondentEmail:()=>email,getItemResponses:()=>[
      {getItem:()=>({getTitle:()=>title}),getResponse:()=>projectId}
    ]};
}
function reset_(oldId){
  Object.keys(forms).forEach(k=>delete forms[k]);created.length=0;triggers.length=0;alertText='';
  delete __F.PROPS.TIMELINE_2A_FORMS;
  const old=form_(oldId);
  CONFIG_2.TIMELINE_FORM_URL=old.url;
  triggers.push({getHandlerFunction:()=> 'onTimelineSubmit',getTriggerSourceId:()=>old.id});
  return old;
}

global.FormApp={DestinationType:{SPREADSHEET:'SPREADSHEET'},
  create(){const f=form_('new-'+(++formSeq));f.accepting=true;created.push(f);return f;},
  openById:id=>{if(!forms[id])throw new Error('missing form '+id);return forms[id];},
  openByUrl:url=>{const found=Object.values(forms).find(f=>f.url===url);if(!found)throw new Error('missing '+url);return found;}};
global.ScriptApp={
  getProjectTriggers:()=>triggers.slice(),deleteTrigger:t=>{const i=triggers.indexOf(t);if(i>=0)triggers.splice(i,1);},
  newTrigger(handler){const t={handler,sourceId:'',getHandlerFunction(){return this.handler;},
    getTriggerSourceId(){return this.sourceId;}};return {forForm(f){t.sourceId=f.getId();return this;},
      forSpreadsheet(){t.sourceId='SHEETID';return this;},onFormSubmit(){return this;},onEdit(){return this;},
      create(){triggers.push(t);return t;}};}
};
SpreadsheetApp.getUi=()=>({ButtonSet:{OK:'OK'},alert:(title,body)=>{alertText=(body||title);}});

T('إعادة التوليد تقفل الفورم القديم وتدل الفريق على الرابط الجديد',()=>{
  const old=reset_('old-safe');
  createTimelineForm();
  const fresh=created[0];
  if(old.accepting)return 'الفورم القديم بقي يقبل ردوداً';
  if(old.closedMessage.indexOf(fresh.url)===-1)return 'رسالة الإغلاق ما سمت الرابط الجديد';
  if(!fresh.accepting)return 'الفورم الجديد بقي مقفلاً';
  if(!triggers.some(t=>t.getHandlerFunction()==='onTimelineSubmit'&&t.getTriggerSourceId()===fresh.id))
    return 'الفورم الجديد بلا تريقر';
  if(alertText.indexOf('CONFIG_2')===-1)return 'التنبيه ما سمّى CONFIG_2';
  return alertText.indexOf('الرابط الموزع')!==-1?true:'التنبيه ما ذكر تحديث الرابط الموزع';
});

T('رد قديم بلا صف خطة يمنع استبدال الفورم ويسمّيه',()=>{
  const old=reset_('old-pending');
  old.responses.push(response_('pending-response','FTC-26-099','pending@ksu.example'));
  try{createTimelineForm();return 'أنشأ فورماً جديداً رغم الرد المعلّق';}
  catch(e){
    if(e.message.indexOf('FTC-26-099')===-1)return 'الخطأ ما سمّى المشروع المعلّق: '+e.message;
    if(created.length)return 'أنشأ الفورم قبل فحص الردود';
    return old.accepting?true:'قفل القديم رغم رفض الاستبدال';
  }
});

T('رد له صف خطة لا يمنع استبدال الفورم',()=>{
  const old=reset_('old-processed');
  old.responses.push(response_('processed-response','FTC-26-200','done@ksu.example'));
  const sheet=timelinePlansSheet();
  const row=new Array(planWidth_()).fill('');
  row[planCol('projectId')-1]='FTC-26-200';
  row[planCol('email')-1]='done@ksu.example';
  row[planCol('responseId')-1]='processed-response';
  sheet.appendRow(row);
  createTimelineForm();
  return created.length===1&&!old.accepting?true:'الرد المعالج منع الاستبدال أو بقي القديم مفتوحاً';
});

T('فحص البدء يقفل أي فورم مفتوح بلا تريقر ويرفع خطأً صريحاً',()=>{
  const old=reset_('old-orphan');
  triggers.length=0;
  try{assertTimelineFormsHealthy_();return 'الفحص قبل فورماً مفتوحاً بلا تريقر';}
  catch(e){
    if(old.accepting)return 'ترك الفورم اليتيم يقبل ردوداً';
    return e.message.indexOf(old.url)!==-1?true:'الخطأ ما سمّى الفورم: '+e.message;
  }
});

const passed=R.filter(r=>r.p).length;
console.log('\n=== اختبارات دورة حياة فورم الخطة الزمنية ===');
R.forEach(r=>console.log((r.p?'  ✓ ':'  ✗ ')+r.n+(r.note?'  →  '+r.note:'')));
console.log('\n'+passed+' من '+R.length+' ناجحة\n');
process.exit(passed===R.length?0:1);
