import {normalizeContent, renderSite, CV_PATH, MAX_PDF_BYTES} from './content.mjs';

export const OWNER='Mowans';
export const REPO='Mowans.github.io';
export const BRANCH='main';
export const API='https://api.github.com';
export const SITE='https://mowans.github.io/';
const ROOT=`/repos/${OWNER}/${REPO}`;
export class ConflictError extends Error {}
export class UncertainError extends Error { constructor(sha){super('提交结果尚未确认，请点击“核对发布结果”，不要重复发布。');this.sha=sha;} }
export class ApiError extends Error { constructor(status,message){super(message);this.status=status;} }
export function toBase64(bytes) {
  let binary='';
  for(let i=0;i<bytes.length;i+=16384) binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
  return btoa(binary);
}
export function decodeContent(value) {
  if (value?.encoding!=='base64' || typeof value.content!=='string') throw new Error('无法读取仓库内容，请重试。');
  return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(value.content.replace(/\s/g,'')),c=>c.charCodeAt(0)));
}
function errorMessage(status) {
  if(status===401) return 'GitHub 连接已失效，请重新连接有效的令牌。';
  if(status===403) return 'GitHub 暂时拒绝了操作。请检查令牌的 Contents 读写权限、有效期，或稍后重试。';
  if(status===404) return '无法访问主页仓库。请确认令牌已选中 Mowans.github.io。';
  if(status===409 || status===422) return '内容或仓库状态已变化，请保留草稿，重新载入最新内容后再发布。';
  if(status===429) return '操作过于频繁，请稍等再试。';
  return 'GitHub 暂时无法完成操作，请稍后重试。';
}
export class GitHubClient {
  #token=''; #fetch;
  constructor(fetcher=globalThis.fetch.bind(globalThis)){this.#fetch=fetcher;}
  disconnect(){this.#token='';}
  get connected(){return Boolean(this.#token);}
  async request(path,{method='GET',body}={}) {
    if(!this.#token) throw new Error('请先连接 GitHub。');
    if(path!=='/user' && path!==ROOT && !path.startsWith(ROOT+'/')) throw new Error('请求不属于主页仓库。');
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),25000);
    try {
      const response=await this.#fetch(API+path,{method,headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${this.#token}`,'X-GitHub-Api-Version':'2026-03-10',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal,cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer'});
      if(!response.ok) throw new ApiError(response.status,errorMessage(response.status));
      return response.status===204?null:await response.json();
    } catch(error) {
      if(error instanceof ApiError) throw error;
      throw new Error('网络连接中断或超时，请检查网络后重试。');
    } finally {clearTimeout(timer);}
  }
  async connect(token) {
    this.#token=String(token).trim();
    if(!/^github_pat_[A-Za-z0-9_]+$/.test(this.#token)){this.disconnect();throw new Error('请使用 GitHub 细粒度令牌（以 github_pat_ 开头）。');}
    try {
      const user=await this.request('/user');
      if(user.login?.toLowerCase()!==OWNER.toLowerCase()) throw new Error('请使用 Mowans 账号创建的令牌。');
      const repo=await this.request(ROOT);
      if(repo.full_name?.toLowerCase()!==`${OWNER}/${REPO}`.toLowerCase() || repo.archived || repo.permissions?.push===false) throw new Error('此连接没有主页仓库的写入权限。');
      return user.login;
    } catch(error){this.disconnect();throw error;}
  }
  async head(){return (await this.request(`${ROOT}/git/ref/heads/${BRANCH}`)).object.sha;}
  async snapshot(){
    const head=await this.head();
    const [commit,data,template]=await Promise.all([
      this.request(`${ROOT}/git/commits/${head}`),
      this.request(`${ROOT}/contents/content/site.json?ref=${head}`),
      this.request(`${ROOT}/contents/index.html?ref=${head}`)
    ]);
    return {head,tree:commit.tree.sha,data:normalizeContent(JSON.parse(decodeContent(data))),template:decodeContent(template)};
  }
  async publish(snapshot,input,pdfBytes,onProgress=()=>{}) {
    const data=normalizeContent(input);
    if(!this.connected) throw new Error('请先连接 GitHub。');
    if(!snapshot?.head || !snapshot.tree) throw new Error('请先载入最新内容。');
    if(pdfBytes && (!(pdfBytes instanceof Uint8Array) || pdfBytes.length>MAX_PDF_BYTES || new TextDecoder().decode(pdfBytes.subarray(0,5))!=='%PDF-')) throw new Error('简历文件无效。');
    const html=renderSite(snapshot.template,data);
    onProgress('正在检查线上版本…');
    if(await this.head()!==snapshot.head) throw new ConflictError('仓库在编辑期间已更新。草稿仍已保留，请导出草稿，再载入最新内容并核对。');
    const entries=[];
    for(const [path,content] of [['content/site.json',JSON.stringify(data,null,2)+'\n'],['index.html',html]]){
      onProgress('正在保存网页内容…');
      const blob=await this.request(`${ROOT}/git/blobs`,{method:'POST',body:{content,encoding:'utf-8'}});
      entries.push({path,mode:'100644',type:'blob',sha:blob.sha});
    }
    if(pdfBytes){
      onProgress('正在上传新简历…');
      const blob=await this.request(`${ROOT}/git/blobs`,{method:'POST',body:{content:toBase64(pdfBytes),encoding:'base64'}});
      entries.push({path:CV_PATH,mode:'100644',type:'blob',sha:blob.sha});
    }
    const tree=await this.request(`${ROOT}/git/trees`,{method:'POST',body:{base_tree:snapshot.tree,tree:entries}});
    const commit=await this.request(`${ROOT}/git/commits`,{method:'POST',body:{message:`Update homepage content (${data.updatedAt.slice(0,10)})`,tree:tree.sha,parents:[snapshot.head]}});
    onProgress('正在发布到 GitHub…');
    try {
      await this.request(`${ROOT}/git/refs/heads/${BRANCH}`,{method:'PATCH',body:{sha:commit.sha,force:false}});
    } catch(error) {
      // A lost response does not mean the commit failed. Verify before allowing a retry.
      let head;
      try{head=await this.head();}catch{throw new UncertainError(commit.sha);}
      if(head!==commit.sha){
        if(error instanceof ApiError) throw new ConflictError(error.message);
        throw new UncertainError(commit.sha);
      }
    }
    return {head:commit.sha,tree:tree.sha,data,template:html};
  }
}
