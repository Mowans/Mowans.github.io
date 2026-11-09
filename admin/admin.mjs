import {STATUSES,CATEGORIES,CV_PATH,newProject,normalizeContent,renderSite,statusLabel,validatePDF,escapeHTML} from './content.mjs?v=2';
import {GitHubClient,ConflictError,UncertainError,SITE} from './github.mjs?v=2';

if(window.top!==window.self){document.body.textContent='请在独立窗口中打开主页管理页面。';throw new Error('Framing disabled');}
const $=selector=>document.querySelector(selector);
const client=new GitHubClient();
const DRAFT_KEY='junyao-homepage-draft-v1';
const clone=value=>structuredClone(value);
const state={data:null,baseline:null,baselineRevision:null,template:'',snapshot:null,selectedId:null,pdf:null,pdfBytes:null,busy:false,remoteChanged:false,savedDraft:null,pending:null,storageOK:true};
let saveTimer,pollGeneration=0;

function notice(message,error=false,link=null){
  const element=$('#notice');element.replaceChildren(document.createTextNode(message));element.classList.toggle('error',error);element.hidden=false;
  if(link){const a=document.createElement('a');a.textContent=link.label;a.href=link.href;a.target='_blank';a.rel='noopener noreferrer';element.append(a);}
}
function current(){return state.data?.projects.find(p=>p.id===state.selectedId);}
function dirty(){return Boolean(state.data && (JSON.stringify(state.data.projects)!==JSON.stringify(state.baseline?.projects) || state.pdf));}
function setBusy(value){
  state.busy=value;
  document.querySelectorAll('.shell input,.shell textarea,.shell select,.shell button,.actionbar button,.topbar button').forEach(el=>el.disabled=value);
  $('#project-form').classList.toggle('locked',value);
  $('#connect-submit').disabled=value;
  if(!value) updateSummary();
}
function updateSummary(){
  if(!state.data)return;
  const changed=dirty();
  const awaitingDraft=Boolean(state.savedDraft&&!$('#draft-banner').hidden);
  const editLocked=state.busy||Boolean(state.pending)||awaitingDraft;
  $('#draft-state').textContent=state.pending?'发布结果待确认':changed?(state.storageOK?'草稿已保存在本机':'草稿尚未保存，请导出备份'):'已载入当前内容';
  $('#draft-state').classList.toggle('changed',changed);
  $('#change-summary').textContent=state.pending?'请核对上次发布结果':changed?`有待发布的更改${state.pdf?' · 含新简历':''}`:'尚未修改';
  $('#publish-button').textContent=state.pending?'核对发布结果':client.connected?'发布更改 ↗':'连接并发布 ↗';
  $('#publish-button').disabled=state.busy||awaitingDraft||state.remoteChanged||(!changed&&!state.pending);
  $('#preview-button').disabled=state.busy;
  $('#add-project').disabled=editLocked;
  $('#export-draft').disabled=state.busy||awaitingDraft;
  $('#import-draft').disabled=editLocked;
  $('#cv-file').disabled=editLocked;
  $('#clear-cv').disabled=editLocked;
  const i=state.data.projects.findIndex(p=>p.id===state.selectedId);
  $('#move-up').disabled=editLocked||i<=0;
  $('#move-down').disabled=editLocked||i<0||i===state.data.projects.length-1;
  $('#remove-project').disabled=editLocked;
  $('#project-form').querySelectorAll('[data-field]').forEach(el=>el.disabled=editLocked);
  $('#project-count').textContent=String(state.data.projects.length);
}
function saveDraft(){
  clearTimeout(saveTimer);
  if(!state.data)return;
  if(state.savedDraft&&!$('#draft-banner').hidden&&!dirty())return;
  const record={format:'junyao-homepage-draft',version:1,baseRevision:state.baselineRevision,data:state.data,savedAt:new Date().toISOString(),pending:state.pending?{sha:state.pending.sha,data:state.pending.data}:null};
  try{if(dirty()||state.pending)localStorage.setItem(DRAFT_KEY,JSON.stringify(record));else localStorage.removeItem(DRAFT_KEY);state.storageOK=true;}
  catch{state.storageOK=false;}
  updateSummary();
}
function changed(){state.storageOK=true;clearTimeout(saveTimer);$('#draft-state').textContent='正在保存草稿…';saveTimer=setTimeout(saveDraft,300);updateSummary();}
function renderList(){
  const list=$('#project-list');list.replaceChildren();
  state.data.projects.forEach((p,i)=>{
    const button=document.createElement('button');button.type='button';button.className='project-select';button.dataset.projectId=p.id;
    if(p.id===state.selectedId)button.setAttribute('aria-current','true');
    const index=document.createElement('span');index.className='list-index';index.textContent=String(i+1).padStart(2,'0');
    const title=document.createElement('span');title.className='list-title';title.textContent=p.title.zh||p.title.en||'未命名项目';
    const meta=document.createElement('span');meta.className='list-meta';meta.textContent=[p.venue,statusLabel(p).zh||statusLabel(p).en,p.visible?'':'未展示'].filter(Boolean).join(' · ');
    button.append(index,title,meta);button.addEventListener('click',()=>selectProject(p.id));list.append(button);
  });updateSummary();
}
function valueAt(object,path){return path.split('.').reduce((result,key)=>result?.[key],object);}
function setAt(object,path,value){const keys=path.split('.');const last=keys.pop();const target=keys.reduce((result,key)=>result[key],object);target[last]=value;}
function selectProject(id){
  state.selectedId=id;const p=current();
  $('#project-form').hidden=!p;$('#empty-state').hidden=Boolean(p);
  if(p){
    $('#project-form').querySelectorAll('[data-field]').forEach(el=>{if(el.type==='checkbox')el.checked=Boolean(valueAt(p,el.dataset.field));else el.value=valueAt(p,el.dataset.field)??'';});
    $('#custom-status-fields').hidden=p.status!=='custom';
  }
  renderList();
}
function showCV(){
  const cv=state.baseline?.cv;
  $('#current-cv-info').textContent=cv?`${cv.fileName} · ${(cv.size/1024).toFixed(0)} KB`:'Junyao_Huang_CV.pdf';
  $('.current-cv a').href=`../${CV_PATH}?v=${encodeURIComponent(cv?.updatedAt||'')}`;
  $('#pending-cv').hidden=!state.pdf;
  if(state.pdf){$('#pending-cv-name').textContent=state.pdf.name;$('#pending-cv-size').textContent=`${(state.pdf.size/1024).toFixed(0)} KB · 等待发布`;}updateSummary();
}
function install(data,template){
  state.data=clone(data);state.baseline=clone(data);state.baselineRevision=data.revision;state.template=template;state.selectedId=data.projects[0]?.id??null;state.remoteChanged=false;state.pdf=null;state.pdfBytes=null;state.pending=null;
  $('#cv-file').value='';selectProject(state.selectedId);showCV();
}
async function loadPublished(){
  const [response,template]=await Promise.all([fetch('../content/site.json',{cache:'no-store'}),fetch('../index.html',{cache:'no-store'})]);
  if(!response.ok||!template.ok)throw new Error('暂时无法载入主页内容，请点击“载入最新内容”重试。');
  install(normalizeContent(await response.json()),await template.text());
}
function connectionUI(){
  $('#connection-status').textContent=client.connected?'已连接 Mowans':'尚未连接 GitHub';$('#connection-status').classList.toggle('connected',client.connected);
  $('#connect-button').hidden=client.connected;$('#disconnect-button').hidden=!client.connected;updateSummary();
}
function confirmation(title,message){
  const dialog=$('#confirm-dialog');$('#confirm-title').textContent=title;$('#confirm-description').textContent=message;
  return new Promise(resolve=>{
    const finish=value=>{dialog.close();$('#confirm-accept').onclick=null;$('#confirm-cancel').onclick=null;dialog.removeEventListener('cancel',cancel);resolve(value);};
    const cancel=event=>{event.preventDefault();finish(false);};
    $('#confirm-accept').onclick=()=>finish(true);$('#confirm-cancel').onclick=()=>finish(false);dialog.addEventListener('cancel',cancel);dialog.showModal();
  });
}
function openConnect(){ $('#connect-error').textContent='';$('#connect-dialog').showModal();$('#token-input').focus(); }
async function connect(event){
  event.preventDefault();if(state.busy)return;
  const token=$('#token-input').value;$('#token-input').value='';setBusy(true);$('#connect-error').textContent='';
  try{
    await client.connect(token);
    const remote=await client.snapshot();
    if(dirty()&&state.baselineRevision!==remote.data.revision&&!state.pending){
      state.remoteChanged=true;
      notice('线上内容已有变化。草稿仍在本机，请先导出草稿，再载入最新内容核对。',true);
    }else if(!dirty()&&!state.pending){install(remote.data,remote.template);}
    state.snapshot=remote;state.template=remote.template;
    $('#connect-dialog').close();connectionUI();
    if(state.pending)await reconcile();else if(!state.remoteChanged)notice('已连接 GitHub。修改内容后点击“发布更改”。');
  }catch(error){client.disconnect();$('#connect-error').textContent=error.message;}
  finally{connectionUI();setBusy(false);}
}
function preview(language='zh'){
  try{
    const html=renderSite(state.template,state.data);
    const base=new URL('../',location.href).href;
    const safe=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<html lang="[^"]+"/,`<html lang="${language==='zh'?'zh-CN':'en'}"`).replace('<head>',`<head><base href="${escapeHTML(base)}">`);
    $('#preview-frame').srcdoc=safe;$('#preview-zh').setAttribute('aria-pressed',String(language==='zh'));$('#preview-en').setAttribute('aria-pressed',String(language==='en'));
    if(!$('#preview-dialog').open)$('#preview-dialog').showModal();
  }catch(error){notice(error.message,true);}
}
function review(){
  if(state.pending){if(!client.connected)openConnect();else reconcile().catch(e=>notice(e.message,true));return;}
  try{normalizeContent(state.data);renderSite(state.template,state.data);}catch(error){notice(error.message,true);return;}
  if(!client.connected){openConnect();return;}
  if(!state.snapshot||state.remoteChanged||state.baselineRevision!==state.snapshot.data.revision){notice('线上版本已变化，请先导出草稿，再载入最新内容。',true);return;}
  const before=state.baseline.projects;const after=state.data.projects;
  const additions=after.filter(p=>!before.some(old=>old.id===p.id)).length;
  const removals=before.filter(p=>!after.some(next=>next.id===p.id)).length;
  const edits=after.filter(p=>{const old=before.find(item=>item.id===p.id);return old&&JSON.stringify(p)!==JSON.stringify(old);}).length;
  const items=[`主页将展示 ${after.filter(p=>p.visible).length} 个项目`,additions?`新增 ${additions} 个项目`:null,edits?`修改 ${edits} 个项目`:null,removals?`移除 ${removals} 个项目`:null,JSON.stringify(before.map(p=>p.id))!==JSON.stringify(after.map(p=>p.id))?'更新项目展示顺序':null,state.pdf?`替换简历：${state.pdf.name}`:null].filter(Boolean);
  $('#publish-review').replaceChildren(...items.map(value=>{const li=document.createElement('li');li.textContent=value;return li;}));
  $('#publish-progress').textContent='所有内容将在同一次发布中更新。';$('#publish-dialog').showModal();
}
async function publish(){
  if(state.busy)return;setBusy(true);$('#publish-dialog').querySelectorAll('button').forEach(b=>b.disabled=true);
  const next=clone(state.data);next.revision=crypto.randomUUID();next.updatedAt=new Date().toISOString();
  if(state.pdf)next.cv={path:CV_PATH,fileName:state.pdf.name,size:state.pdf.size,updatedAt:next.updatedAt};
  try{
    const result=await client.publish(state.snapshot,next,state.pdfBytes,message=>$('#publish-progress').textContent=message);
    success(result);
  }catch(error){
    if(error instanceof UncertainError){state.pending={sha:error.sha,data:next};saveDraft();}
    if(error instanceof ConflictError)state.remoteChanged=true;
    notice(error.message,true);
  }finally{$('#publish-dialog').close();$('#publish-dialog').querySelectorAll('button').forEach(b=>b.disabled=false);setBusy(false);}
}
function success(result){
  const id=state.selectedId;install(result.data,result.template);state.snapshot=result;
  if(state.data.projects.some(p=>p.id===id))selectProject(id);
  state.savedDraft=null;$('#draft-banner').hidden=true;saveDraft();
  notice('已提交到 GitHub，正在等待网站更新。',false,{label:'查看发布进度 ↗',href:'https://github.com/Mowans/Mowans.github.io/actions'});
  pollPublished(result.data.revision);
}
async function reconcile(){
  if(!state.pending)return;
  setBusy(true);
  try{
    const remote=await client.snapshot();
    if(remote.data.revision===state.pending.data.revision)success(remote);
    else{state.pending=null;state.remoteChanged=true;saveDraft();notice('当前仓库与待确认的发布不同。请导出草稿，再载入最新内容核对；系统不会自动重复发布。',true);}
  }finally{setBusy(false);}
}
async function pollPublished(revision){
  const generation=++pollGeneration;
  for(let attempt=0;attempt<24;attempt++){
    await new Promise(resolve=>setTimeout(resolve,5000));if(generation!==pollGeneration)return;
    try{
      const url=new URL('../content/site.json',location.href);url.searchParams.set('v',Date.now());
      const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(8000)});
      if(response.ok&&(await response.json()).revision===revision){notice('更新已上线，访客现在可以看到你的新内容。',false,{label:'打开主页 ↗',href:SITE+'?lang=zh'});return;}
    }catch{/* A slow deployment or temporary network error does not repeat the commit. */}
  }
  if(generation===pollGeneration)notice('更改已保存到 GitHub，网站更新暂未确认。请稍后查看发布进度。',false,{label:'查看发布进度 ↗',href:'https://github.com/Mowans/Mowans.github.io/actions'});
}
function downloadDraft(){
  const json=JSON.stringify({format:'junyao-homepage-draft',version:1,baseRevision:state.baselineRevision,data:state.data},null,2);
  const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='Junyao_Homepage_Draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function reloadContent(){
  if(state.busy)return;
  if((dirty()||state.pending)&&!await confirmation('载入最新内容？','本机未发布的编辑和选中的 PDF 将被替换。需要保留时，请先取消并导出草稿。'))return;
  setBusy(true);
  try{if(client.connected){const remote=await client.snapshot();install(remote.data,remote.template);state.snapshot=remote;}else{await loadPublished();state.snapshot=null;}state.savedDraft=null;$('#draft-banner').hidden=true;saveDraft();notice('已载入最新内容。');}
  catch(error){notice(error.message,true);}finally{setBusy(false);}
}

for(const [value,[label]] of Object.entries(STATUSES)){const option=new Option(label,value);$('#status-select').add(option);}
for(const [value,[label]] of Object.entries(CATEGORIES))$('#category-select').add(new Option(label,value));
$('#project-form').addEventListener('submit',event=>event.preventDefault());
$('#project-form').addEventListener('input',event=>{
  const field=event.target.dataset.field;if(!field||state.busy||!current())return;
  setAt(current(),field,event.target.type==='checkbox'?event.target.checked:event.target.value);
  $('#custom-status-fields').hidden=current().status!=='custom';renderList();changed();
});
$('#add-project').addEventListener('click',()=>{if(state.data.projects.length>=100){notice('最多可保存 100 个项目。',true);return;}const project=newProject('p-'+crypto.randomUUID());state.data.projects.push(project);selectProject(project.id);changed();$('#project-form [data-field="title.zh"]').focus();});
for(const [selector,delta] of [['#move-up',-1],['#move-down',1]])$(selector).addEventListener('click',()=>{const i=state.data.projects.findIndex(p=>p.id===state.selectedId);const j=i+delta;if(j<0||j>=state.data.projects.length)return;[state.data.projects[i],state.data.projects[j]]=[state.data.projects[j],state.data.projects[i]];renderList();changed();});
$('#remove-project').addEventListener('click',async()=>{const p=current();if(p&&await confirmation('移除这个项目？',`“${p.title.zh||p.title.en||'未命名项目'}”将从草稿中移除，发布后才会影响主页。`)){state.data.projects=state.data.projects.filter(item=>item.id!==p.id);selectProject(state.data.projects[0]?.id??null);changed();}});
document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(tab=>{if(tab===button)tab.setAttribute('aria-current','page');else tab.removeAttribute('aria-current');});$('#projects-panel').hidden=button.dataset.tab!=='projects';$('#cv-panel').hidden=button.dataset.tab!=='cv';}));
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>{if(!state.busy)$('#'+button.dataset.close).close();}));
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('cancel',event=>{if(state.busy)event.preventDefault();}));
$('#connect-dialog').addEventListener('close',()=>$('#token-input').value='');
$('#connect-button').addEventListener('click',openConnect);$('#connect-form').addEventListener('submit',connect);
$('#disconnect-button').addEventListener('click',()=>{client.disconnect();state.snapshot=null;connectionUI();notice('已断开 GitHub。文字草稿仍保存在本机。');});
$('#preview-button').addEventListener('click',()=>preview());$('#preview-zh').addEventListener('click',()=>preview('zh'));$('#preview-en').addEventListener('click',()=>preview('en'));
$('#publish-button').addEventListener('click',review);$('#confirm-publish').addEventListener('click',publish);
$('#export-draft').addEventListener('click',downloadDraft);$('#reload-content').addEventListener('click',reloadContent);
$('#cv-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;setBusy(true);try{const bytes=await validatePDF(file);state.pdf=file;state.pdfBytes=bytes;showCV();changed();notice('新简历已准备好，点击“发布更改”后才会替换线上版本。');}catch(error){event.target.value='';notice(error.message,true);}finally{setBusy(false);}});
$('#clear-cv').addEventListener('click',()=>{state.pdf=null;state.pdfBytes=null;$('#cv-file').value='';showCV();changed();});
$('#restore-draft').addEventListener('click',()=>{try{const draft=state.savedDraft;state.data=normalizeContent(draft.data,{draft:true});state.baselineRevision=draft.baseRevision;state.pending=draft.pending??null;state.remoteChanged=state.baseline.revision!==draft.baseRevision&&!state.pending;selectProject(state.data.projects[0]?.id??null);$('#draft-banner').hidden=true;saveDraft();notice(state.remoteChanged?'草稿与线上版本不同，请导出备份后载入最新内容核对。':'已恢复文字草稿。未发布的 PDF 需要重新选择。',state.remoteChanged);}catch(error){notice(error.message,true);}});
$('#discard-draft').addEventListener('click',()=>{state.savedDraft=null;$('#draft-banner').hidden=true;saveDraft();});
$('#import-draft').addEventListener('change',async event=>{
  const file=event.target.files[0];event.target.value='';if(!file)return;
  try{
    if(file.size>2*1024*1024)throw new Error('草稿文件不能超过 2 MB。');
    const record=JSON.parse(await file.text());if(record.format!=='junyao-homepage-draft'||record.version!==1)throw new Error('请选择由这个管理页面导出的草稿。');
    const data=normalizeContent(record.data,{draft:true});
    if(!await confirmation('导入草稿？','将用文件中的项目文字替换当前编辑内容。线上简历文件保持不变，发布前仍可预览。'))return;
    state.data.projects=data.projects;selectProject(state.data.projects[0]?.id??null);changed();notice('草稿已导入，请核对后发布。');
  }catch(error){notice(error instanceof SyntaxError?'无法读取草稿，请选择正确的 JSON 草稿文件。':error.message,true);}
});
window.addEventListener('beforeunload',event=>{saveDraft();if(state.pdf||state.busy||!state.storageOK){event.preventDefault();event.returnValue='';}});
try{
  await loadPublished();
  try{const raw=localStorage.getItem(DRAFT_KEY);if(raw){const record=JSON.parse(raw);if(record.format==='junyao-homepage-draft'&&record.version===1){normalizeContent(record.data,{draft:true});state.savedDraft=record;$('#draft-banner').hidden=false;}}}catch{notice('无法恢复本机草稿，已载入线上内容。',true);}
  updateSummary();
}catch(error){$('#draft-state').textContent='载入失败';notice(error.message,true);}
