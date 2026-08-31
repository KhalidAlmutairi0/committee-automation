// محاكاة خدمات أبس سكربت، بالقدر اللي تحتاجه المرحلة ٢أ
function makeSheet(name){
  const g=[];
  const at=(r,c)=>{while(g.length<r)g.push([]);const row=g[r-1];while(row.length<c)row.push('');return row;};
  const sh={
    _name:name,_rtl:false,_frozen:0,_validation:{},
    getName:()=>name,
    setRightToLeft(v){sh._rtl=v;return sh;},
    setFrozenRows(n){sh._frozen=n;return sh;},
    getLastRow:()=>g.length,
    getLastColumn:()=>g.reduce((m,r)=>Math.max(m,r.length),0),
    getMaxColumns:()=>Math.max(sh.getLastColumn(),40),
    getMaxRows:()=>Math.max(g.length,1000),
    insertColumnsAfter(){return sh;},
    appendRow(vals){const r=g.length+1;vals.forEach((v,i)=>{at(r,i+1)[i]=v;});return sh;},
    getRange(r,c,nr,nc){
      nr=nr||1;nc=nc||1;
      return {
        getValues(){const o=[];for(let i=0;i<nr;i++){const row=at(r+i,c+nc-1);o.push(row.slice(c-1,c-1+nc).map(v=>v===undefined?'':v));}return o;},
        setValues(v){for(let i=0;i<nr;i++)for(let j=0;j<nc;j++){at(r+i,c+j)[c+j-1]=v[i][j];}return this;},
        getValue(){return at(r,c)[c-1];},
        setValue(v){at(r,c)[c-1]=v;return this;},
        setFontWeight(){return this;},
        setDataValidation(x){sh._validation[c]=x;return this;}
      };
    },
    _grid:g
  };
  return sh;
}
const SHEETS={};
const SS={
  getSheetByName:n=>SHEETS[n]||null,
  insertSheet(n){SHEETS[n]=makeSheet(n);return SHEETS[n];},
  getUrl:()=>'https://sheet.example/x',
  getId:()=>'SHEETID',
  toast:(m)=>TOASTS.push(m)
};
const TOASTS=[];
const MAILS=[];
global.SpreadsheetApp={
  getActiveSpreadsheet:()=>SS,
  newDataValidation:()=>({requireValueInList(){return this;},setAllowInvalid(){return this;},
                          setHelpText(){return this;},build(){return {};}}),
  getUi:()=>{throw new Error('no ui');}
};
global.MailApp={sendEmail:o=>MAILS.push(o)};
global.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
let uuidN=0;
global.Utilities={getUuid:()=>'aaaaaaaa-bbbb-cccc-dddd-'+String(++uuidN).padStart(12,'0')};
global.Session={getActiveUser:()=>({getEmail:()=>'lead@ksu.example'})};
global.Logger={log:()=>{}};
// --- درايف ومستندات ---
const DOCS={};      // docId -> نص، أو 'DENY' لمحاكاة منع الصلاحية
const FILES={};     // fileId -> {name,content}
let fileN=0;
global.MimeType={PLAIN_TEXT:'text/plain'};
global.DocumentApp={
  openById(id){
    if(!(id in DOCS))throw new Error('not found');
    if(DOCS[id]==='DENY')throw new Error('permission denied');
    return {getBody:()=>({getText:()=>DOCS[id]})};
  }
};
const FOLDER={
  createFile(name,content){
    const id='file-'+(++fileN);FILES[id]={name,content};
    return {getId:()=>id};
  }
};
global.DriveApp={
  getFolderById:()=>FOLDER,
  getFoldersByName:()=>({hasNext:()=>true,next:()=>FOLDER}),
  createFolder:()=>FOLDER,
  getFileById(id){
    if(!FILES[id])throw new Error('no file');
    return {getBlob:()=>({getDataAsString:()=>FILES[id].content})};
  }
};

// --- خصائص السكربت + نداءات HTTP ---
const PROPS={ANTHROPIC_API_KEY:'test-key'};
global.PropertiesService={getScriptProperties:()=>({
  getProperty:k=>PROPS[k]||null, setProperty:(k,v)=>{PROPS[k]=v;}
})};
global.Utilities.sleep=()=>{};
const FETCH={queue:[],calls:[]};
global.UrlFetchApp={
  fetch(url,opts){
    FETCH.calls.push({url,payload:JSON.parse(opts.payload),headers:opts.headers});
    const next=FETCH.queue.shift();
    if(!next)throw new Error('ما فيه رد مزيف في الطابور');
    return {getResponseCode:()=>next.code,getContentText:()=>JSON.stringify(next.body)};
  }
};

module.exports={SHEETS,MAILS,TOASTS,SS,makeSheet,DOCS,FILES,PROPS,FETCH};
