export const CV_PATH = 'assets/Junyao_Huang_CV.pdf';
export const MAX_PDF_BYTES = 10 * 1024 * 1024;
export const STATUSES = {
  under_review: ['审稿中', 'Under review'], phase1: ['已通过 Phase 1', 'Passed Phase 1'],
  accepted: ['已录用', 'Accepted'], published: ['已发表', 'Published'],
  in_preparation: ['论文准备中', 'Manuscript in preparation'],
  in_progress: ['进行中', 'In progress'], completed: ['已完成', 'Completed'], custom: ['自定义', 'Custom']
};
export const CATEGORIES = {event:['事件视觉','Event-based vision'],planning:['安全规划','Safe planning'],learning:['机器人学习','Robot learning'],other:['其他项目','Other projects']};
export const ILLUSTRATIONS = {
  navigation: ['navigation.svg', 'navigation-visual', 'Event-based robot navigation schematic.'],
  planning: ['planning.svg', 'planning-visual', 'Safe planning under a shared budget schematic.'],
  flight: ['flight.svg', 'flight-visual', 'Event-based flight feedback schematic.'],
  general: ['research-loop.svg', 'navigation-visual', 'Perception, learning, and action schematic.']
};

const fail = message => { throw new Error(message); };
function text(value, label, max = 2000) {
  if (typeof value !== 'string') fail(`${label}格式不正确。`);
  const result = value.trim();
  if (result.length > max) fail(`${label}最多 ${max} 个字符。`);
  return result;
}
function bilingual(value, label, max, required = false) {
  const result = {zh:text(value?.zh ?? '', `${label}（中文）`, max), en:text(value?.en ?? '', `${label}（英文）`, max)};
  if (required && !result.zh && !result.en) fail(`请填写${label}，至少提供一种语言。`);
  return result;
}
export function safeURL(value) {
  if (!value) return '';
  const cleaned = text(value, '链接', 2000);
  let url;
  try { url = new URL(cleaned); } catch { fail('链接需要是完整的 https:// 或 http:// 网址。'); }
  if (!['https:','http:'].includes(url.protocol) || url.username || url.password) fail('链接只支持不含登录凭据的 http/https 网址。');
  return url.href;
}
export function normalizeContent(input, {draft=false}={}) {
  if (!input || input.schemaVersion !== 1 || !Array.isArray(input.projects)) fail('内容版本不匹配，请重新载入。');
  if (new TextEncoder().encode(JSON.stringify(input)).length>750000) fail('项目文字总量过大，请精简内容后重试。');
  if (input.projects.length > 100) fail('最多可保存 100 个项目。');
  if (typeof input.revision !== 'string' || !/^[a-zA-Z0-9_.-]{1,80}$/.test(input.revision)) fail('内容版本号不正确。');
  if (!Number.isFinite(Date.parse(input.updatedAt))) fail('更新时间不正确。');
  const ids = new Set();
  const projects = input.projects.map((p, i) => {
    const label = `第 ${i+1} 个项目`;
    if (!p || typeof p.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(p.id) || ids.has(p.id)) fail(`${label}编号不正确或重复。`);
    ids.add(p.id);
    if (!Object.hasOwn(STATUSES, p.status) || !Object.hasOwn(CATEGORIES, p.category) || !Object.hasOwn(ILLUSTRATIONS, p.illustration)) fail(`${label}的状态、分类或配图不正确。`);
    const customStatus = bilingual(p.customStatus, '自定义状态', 120, !draft && p.status === 'custom');
    return {
      id:p.id, visible:p.visible !== false, title:bilingual(p.title, `${label}标题`, 240, !draft),
      summary:bilingual(p.summary, `${label}简介`, 3000, !draft), role:bilingual(p.role,'作者或职责',200),
      period:bilingual(p.period,'项目时间',120), status:p.status, venue:text(p.venue ?? '', '会议或期刊',120),
      customStatus, category:p.category, illustration:p.illustration,
      metric:{value:text(p.metric?.value ?? '', '核心指标',80),label:bilingual(p.metric?.label,'指标说明',500)},
      details:bilingual(p.details,'方法与实验',15000),
      links:Object.fromEntries(['paper','code','project','video'].map(key=>[key,draft?text(p.links?.[key]??'','链接',2000):safeURL(p.links?.[key] ?? '')]))
    };
  });
  return {schemaVersion:1,revision:input.revision,updatedAt:input.updatedAt,
    cv:{path:CV_PATH,fileName:text(input.cv?.fileName ?? 'Junyao_Huang_CV.pdf','简历文件名',200),
      updatedAt:text(input.cv?.updatedAt ?? input.updatedAt,'简历更新时间',80),
      size:Number.isSafeInteger(input.cv?.size) && input.cv.size >= 0 && input.cv.size <= MAX_PDF_BYTES ? input.cv.size : 0},projects};
}
export function escapeHTML(value) { return String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
const bi = value => `<span lang="en">${escapeHTML(value.en || value.zh)}</span><span lang="zh-CN">${escapeHTML(value.zh || value.en)}</span>`;
export function statusLabel(project) {
  return project.status === 'custom' ? project.customStatus : {zh:STATUSES[project.status][0],en:STATUSES[project.status][1]};
}
function paragraphs(value, lang) {
  return (value[lang] || value[lang === 'zh' ? 'en' : 'zh']).split(/\n\s*\n/).filter(Boolean).map(p=>`<p>${escapeHTML(p).replace(/\n/g,'<br>')}</p>`).join('');
}
function renderProject(project, i) {
  const art = ILLUSTRATIONS[project.illustration];
  const labels = {paper:['论文','Paper'],code:['代码','Code'],project:['项目','Project'],video:['视频','Video']};
  const links = Object.entries(project.links).filter(([,url])=>url).map(([key,url])=>`<a class="text-link" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${bi({zh:labels[key][0],en:labels[key][1]})}<svg class="icon small"><use href="#arrow"/></svg></a>`).join('');
  return `<article class="research-item" data-topics="${project.category}" id="project-${project.id}">
    <div class="research-visual ${art[1]}"><img src="assets/${art[0]}" width="280" height="196" alt="${art[2]}"><span class="visual-label">${String(i+1).padStart(2,'0')} / ${escapeHTML(CATEGORIES[project.category][1].toUpperCase())}</span></div>
    <div class="research-content">
      <div class="research-meta"><span class="status-pill${project.status==='phase1'?' warm':['in_preparation','in_progress','custom'].includes(project.status)?' neutral':''}">${project.venue?escapeHTML(project.venue)+' <span>·</span> ':''}${bi(statusLabel(project))}</span><span class="date">${bi(project.period)}</span></div>
      <h3>${bi(project.title)}</h3><p class="author">${bi(project.role)}</p><p>${bi(project.summary)}</p>
      ${project.metric.value?`<div class="result-line"><strong>${escapeHTML(project.metric.value)}</strong>${bi(project.metric.label)}</div>`:''}
      ${project.details.zh||project.details.en?`<details><summary>${bi({zh:'方法与实验',en:'Method & evaluation'})}<svg class="icon"><use href="#plus"/></svg></summary><div class="detail-body"><div lang="en">${paragraphs(project.details,'en')}</div><div lang="zh-CN">${paragraphs(project.details,'zh')}</div></div></details>`:''}
      ${links?`<div class="project-links">${links}</div>`:''}
    </div></article>`.replace(/[ \t]+$/gm,'');
}
function replaceRegion(template, key, replacement) {
  const start = `<!-- cms:${key}:start -->`, end = `<!-- cms:${key}:end -->`;
  if (template.split(start).length!==2 || template.split(end).length!==2) fail('主页模板已变化，请重新载入最新内容后再发布。');
  const from = template.indexOf(start)+start.length, to = template.indexOf(end);
  if (to<from) fail('主页模板标记顺序不正确。');
  return template.slice(0,from)+'\n'+replacement+'\n'+template.slice(to);
}
export function renderSite(template, input) {
  const data = normalizeContent(input);
  const projects = data.projects.filter(p=>p.visible);
  const filter = (key,label,count='')=>`<button type="button" data-filter="${key}" aria-pressed="${key==='all'}">${bi(label)}${count?`<span class="count">${count}</span>`:''}</button>`;
  const filters = filter('all',{zh:'全部研究',en:'All research'},String(projects.length).padStart(2,'0'))+Object.entries(CATEGORIES).filter(([key])=>projects.some(p=>p.category===key)).map(([key,[zh,en]])=>filter(key,{zh,en})).join('');
  let html = replaceRegion(template,'filters',filters);
  html = replaceRegion(html,'projects',projects.map(renderProject).join('\n') || `<p>${bi({zh:'研究内容更新中。',en:'Research updates coming soon.'})}</p>`);
  const date = new Date(data.updatedAt);
  const en = new Intl.DateTimeFormat('en',{year:'numeric',month:'long',timeZone:'Asia/Shanghai'}).format(date);
  const zh = new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'long',timeZone:'Asia/Shanghai'}).format(date);
  html = replaceRegion(html,'research-date',bi({en:`Research statuses updated ${en}. Illustrations are conceptual schematics.`,zh:`研究状态更新于 ${zh}。配图为方法示意图。`}));
  html = replaceRegion(html,'footer-date',bi({en:`Updated ${en}`,zh:`更新于 ${zh}`}));
  const cvLink = /href="assets\/Junyao_Huang_CV\.pdf(?:\?[^"<>]*)?"/g;
  if ([...html.matchAll(cvLink)].length!==1) fail('简历下载链接已变化，请重新载入最新内容。');
  html=html.replace(cvLink,`href="${CV_PATH}?v=${encodeURIComponent(data.cv.updatedAt)}"`);
  if(new TextEncoder().encode(html).length>900000) fail('生成的网页过大，请精简项目文字后重试。');
  return html;
}
export async function validatePDF(file) {
  if (!file || !/\.pdf$/i.test(file.name) || (file.type && file.type!=='application/pdf')) fail('请选择 PDF 格式的简历。');
  if (file.size===0 || file.size>MAX_PDF_BYTES) fail('PDF 文件需要大于 0 且不超过 10 MB。');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-') fail('文件内容不是有效的 PDF，请重新选择。');
  return bytes;
}
export function newProject(id) {
  const blank = () => ({zh:'',en:''});
  return {id,visible:true,title:blank(),summary:blank(),role:blank(),period:blank(),status:'in_progress',venue:'',customStatus:blank(),category:'learning',illustration:'general',metric:{value:'',label:blank()},details:blank(),links:{paper:'',code:'',project:'',video:''}};
}
