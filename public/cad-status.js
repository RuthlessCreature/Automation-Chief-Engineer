const escCad=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let cadToken=0;
let cadBusy=false;

function activeTaskId(){return document.querySelector('.task-row.active')?.dataset.id||null}
function internalActive(){return document.querySelector('.layer-tab[data-layer="internal"]')?.classList.contains('active')}

async function cadJson(path){
  const response=await fetch(path,{credentials:'same-origin',headers:{Accept:'application/json'}});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'CADCore 状态读取失败');
  return data;
}

async function refreshCadStatus(){
  if(cadBusy||!internalActive())return;
  const taskId=activeTaskId(),body=document.querySelector('#inspector-body');
  if(!taskId||!body)return;
  const token=++cadToken;cadBusy=true;
  try{
    const [{inputs},{jobs}]=await Promise.all([
      cadJson('/api/tasks/'+encodeURIComponent(taskId)+'/inputs'),
      cadJson('/api/tasks/'+encodeURIComponent(taskId)+'/cad-inspections')
    ]);
    if(token!==cadToken||activeTaskId()!==taskId||!internalActive())return;
    const cadInputs=inputs.filter(i=>/\.(step|stp|stl)$/i.test(i.original_name));
    let card=document.querySelector('#cadcore-status-card');
    if(!cadInputs.length&&!jobs.length){card?.remove();return}
    if(!card){card=document.createElement('div');card.id='cadcore-status-card';card.className='artifact-card';body.prepend(card)}
    const byInput=new Map(jobs.map(j=>[j.input_id,j]));
    card.innerHTML='<b>CADCore · G02 几何证据</b><small>真实 STEP/STL 输入、受控检查状态与报告预览</small>'+
      cadInputs.map(input=>{
        const job=byInput.get(input.id);
        if(!job)return '<div class="artifact-text"><strong>'+escCad(input.original_name)+'</strong><br><small>PENDING_AUTO_G02 · 启动总工任务时自动进入 CADCore 检查。</small></div>';
        const report=job.report_artifact_id?'<button class="text-button" data-cad-report="'+escCad(job.report_artifact_id)+'">查看 G02 报告</button>':'';
        return '<div class="artifact-text"><strong>'+escCad(job.original_name||input.original_name)+'</strong><br><small>'+escCad(job.kind)+' · '+escCad(job.status)+(job.completed_at?' · '+escCad(job.completed_at):'')+(job.error_code?' · '+escCad(job.error_code):'')+'</small> '+report+'<div class="cad-report-body" data-report-body="'+escCad(job.id)+'"></div></div>';
      }).join('');
  }catch(error){
    const card=document.querySelector('#cadcore-status-card');
    if(card)card.innerHTML='<b>CADCore · G02 几何证据</b><p class="artifact-text">'+escCad(error.message)+'</p>';
  }finally{cadBusy=false}
}

document.addEventListener('click',async(event)=>{
  const button=event.target.closest('[data-cad-report]');
  if(!button)return;
  const taskId=activeTaskId(),artifactId=button.dataset.cadReport;
  if(!taskId||!artifactId)return;
  button.disabled=true;
  try{
    const {preview}=await cadJson('/api/tasks/'+encodeURIComponent(taskId)+'/artifacts/'+encodeURIComponent(artifactId)+'/preview');
    const target=button.closest('.artifact-text')?.querySelector('.cad-report-body');
    if(target){const pre=document.createElement('pre');pre.className='artifact-text';pre.textContent=preview.content??preview.reason??'报告预览不可用。';target.replaceChildren(pre)}
  }catch(error){alert(error.message)}
  finally{button.disabled=false}
});

document.querySelector('.layer-tab[data-layer="internal"]')?.addEventListener('click',()=>setTimeout(refreshCadStatus,0));
document.addEventListener('ace:task-switched',()=>{cadToken++;void refreshCadStatus()});
setInterval(refreshCadStatus,1500);
