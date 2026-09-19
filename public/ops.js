const errorBox=document.querySelector('#ops-error');
const metrics=document.querySelector('#ops-metrics');
const list=document.querySelector('#incident-list');
let status='OPEN';
const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,options={}){const r=await fetch(path,{credentials:'same-origin',headers:{Accept:'application/json',...(options.headers||{})},...options});const d=await r.json();if(!r.ok)throw new Error(d.error||'请求失败');return d}
function sum(rows,predicate){return rows.filter(predicate).reduce((n,r)=>n+Number(r.count||0),0)}
async function refresh(){
  errorBox.textContent='';
  try{
    const {user}=await api('/api/me');
    if(!user||!['reviewer','admin','system'].includes(user.role))throw new Error('当前账号无权访问运维台账。');
    const [health,data]=await Promise.all([api('/api/ops/health'),api('/api/ops/incidents?status='+encodeURIComponent(status)+'&limit=100')]);
    const failed=sum(health.tasks,r=>r.state==='FAILED'),blocked=sum(health.tasks,r=>r.state==='QUALITY_BLOCKED'),open=sum(health.incidents,r=>r.status==='OPEN'),retries=sum(health.retries,r=>r.status==='STARTED'||r.status==='SCHEDULED');
    metrics.innerHTML=[
      ['开放 Incident',open],['FAILED 任务',failed],['质量阻断',blocked],['活动重试',retries],['运行任务',sum(health.tasks,r=>r.state==='RUNNING')],['已打包',sum(health.tasks,r=>r.state==='PACKAGED')]
    ].map(([k,v])=>'<div class="ops-card"><small>'+esc(k)+'</small><div class="metric">'+esc(v)+'</div></div>').join('');
    list.innerHTML=data.incidents.length?data.incidents.map(renderIncident).join(''):'<div class="incident">当前筛选没有 incident。</div>';
  }catch(e){errorBox.textContent=e.message;metrics.innerHTML='';list.innerHTML=''}
}
function renderIncident(i){return '<article class="incident"><div class="incident-head"><div><b>'+esc(i.task_title||i.task_id)+'</b><br><code>'+esc(i.code)+'</code></div><span class="state '+esc(i.status)+'">'+esc(i.severity)+' · '+esc(i.status)+'</span></div><p>'+esc(i.source)+' · Task '+esc(i.task_state)+' · '+esc(i.created_at)+'</p><div class="incident-actions">'+(i.status==='OPEN'?'<button class="button ghost" data-ack="'+esc(i.id)+'">确认接管</button>':'')+(i.status!=='RESOLVED'?'<button class="button primary" data-resolve="'+esc(i.id)+'">关闭事件</button>':'')+'</div></article>'}
document.addEventListener('click',async(e)=>{const filter=e.target.closest('[data-filter]')?.dataset.filter;if(filter){status=filter;return refresh()}const ack=e.target.closest('[data-ack]')?.dataset.ack;if(ack){await api('/api/ops/incidents/'+encodeURIComponent(ack)+'/acknowledge',{method:'POST'});return refresh()}const id=e.target.closest('[data-resolve]')?.dataset.resolve;if(id){const note=prompt('填写关闭说明（至少 3 个字符）：');if(!note||note.trim().length<3)return;await api('/api/ops/incidents/'+encodeURIComponent(id)+'/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({note:note.trim()})});return refresh()}});
document.querySelector('#refresh').onclick=refresh;
refresh();
