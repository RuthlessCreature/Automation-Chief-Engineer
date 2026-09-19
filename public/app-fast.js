const ace = window.__ACE_APP__;
const stagesFast = [
  ['intake','需求接收与输入完整性','Intake Router','G00'],['requirements','需求工程','Requirement Engineer','G01'],['feasibility','可行性架构','Feasibility Architect','G03'],['vision','机器视觉','Vision Engineer','G04'],['mechanical','机械方案','Mechanical Engineer','G05'],['electrical','电控与安全','Electrical Control Engineer','G06'],['software_mes','软件与 MES','Software MES Engineer','G07'],['product_cad','产品 CAD','Product CAD Engineer','G02'],['ct_capacity','节拍与产能','CT Capacity Engineer','G08'],['bom_cost','BOM 与制造成本','BOM Cost Engineer','G09'],['digital_twin','数字孪生渲染','Digital Twin Renderer','G10'],['validation','验证与质量','Validation Engineer','G11'],['project_sales','项目与商务','Project Sales Engineer','G12'],['documentation','文档受控汇编','Documentation Engineer','G13'],['chief_review','总工审查与交付打包','Chief Reviewer','G14/G15'],
];
const escapeFast = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
let switchToken = 0;

async function jsonFast(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', headers: { Accept: 'application/json', ...(options.headers || {}) }, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '请求失败');
  return data;
}

async function startTaskFast() {
  const state = ace?.state;
  const button = document.querySelector('#start-task');
  if (!state?.task || !button || button.disabled) return;
  button.disabled = true;
  try {
    await jsonFast(`/api/tasks/${state.task.id}/start`, { method: 'POST' });
    await refreshFast(switchToken);
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
  }
}

async function reworkTaskFast() {
  const state = ace?.state;
  const button = document.querySelector('#rework-task');
  if (!state?.task || !button || button.disabled) return;
  button.disabled = true;
  try {
    await jsonFast(`/api/tasks/${state.task.id}/rework`, { method: 'POST' });
    await refreshFast(switchToken);
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
  }
}

function renderFastPipeline() {
  const state = ace?.state;
  if (!state?.task) return;
  const latest = new Map();
  for (const event of state.events) if (event.stageId && ['STAGE_STARTED', 'STAGE_GATED', 'QUALITY_BLOCKED'].includes(event.type)) latest.set(event.stageId, event);
  const complete = new Set(state.events.filter((event) => event.type === 'STAGE_GATED').map((event) => event.stageId)).size;
  const progress = document.querySelector('#progress');
  const count = document.querySelector('#stage-count');
  const label = document.querySelector('#progress-label');
  if (progress) progress.style.width = `${Math.min(100, complete / stagesFast.length * 100)}%`;
  if (count) count.textContent = `${complete} / ${stagesFast.length}`;
  if (label) label.textContent = state.task.state === 'PACKAGED' ? '客户 ZIP 已冻结，可下载' : state.task.state === 'PACKAGING' ? '内部质量链通过，正在冻结客户 ZIP' : state.task.state === 'QUALITY_BLOCKED' ? '质量闸门阻断，等待返工' : state.task.state === 'FAILED' ? '工作流失败，未扣除 credits' : complete ? `已完成 ${complete} 个质量闸门` : '总工工作流执行中';
  const pipeline = document.querySelector('#pipeline');
  if (!pipeline) return;
  pipeline.innerHTML = stagesFast.map(([id, stageLabel, agent, gate], index) => {
    const event = latest.get(id);
    const status = event?.type === 'QUALITY_BLOCKED' ? 'blocked' : event?.type === 'STAGE_GATED' ? 'pass' : event?.type === 'STAGE_STARTED' ? 'running' : '';
    return `<button class="stage-card ${status}" data-stage="${id}"><div class="stage-no">${String(index + 1).padStart(2, '0')} · ${gate}</div><div class="stage-agent">${escapeFast(agent)}</div><div class="stage-label">${escapeFast(stageLabel)}</div><div class="stage-foot"><span>${status === 'pass' ? 'GATE PASS' : status === 'running' ? 'IN PROGRESS' : status === 'blocked' ? 'BLOCKED' : 'PENDING'}</span><span>↗</span></div></button>`;
  }).join('');
  pipeline.querySelectorAll('.stage-card').forEach((button) => {
    button.addEventListener('click', () => window.__ACE_APP__?.inspectStage?.(button.dataset.stage));
  });
}

function renderFastInspector() {
  const state = ace?.state;
  if (!state?.task) return;
  const body = document.querySelector('#inspector-body');
  if (!body || state.layer !== 'internal') return;
  const latest = new Map();
  for (const event of state.events) if (event.stageId && ['STAGE_STARTED', 'STAGE_GATED', 'QUALITY_BLOCKED'].includes(event.type)) latest.set(event.stageId, event);
  const stage = latest.get(state.events.at(-1)?.stageId);
  const artifacts = state.artifacts.filter((artifact) => artifact.visibility === 'INTERNAL');
  body.innerHTML = `<div class="artifact-card"><b>${escapeFast(stage?.payload?.agent || '过程证据')}</b><small>${escapeFast(stage?.payload?.gate || 'INTERNAL')}</small><p class="artifact-text">${escapeFast(stage?.message || '任务启动后，各阶段产出和门禁证据会在此出现。')}</p><button class="button ghost" id="quality-compare">运行 Golden Comparator</button></div>${artifacts.slice(-6).map((artifact) => `<article class="artifact-card"><b>${escapeFast(artifact.title)}</b><small>${escapeFast(artifact.stage_id)} · ${escapeFast(artifact.sha256.slice(0, 16))}…</small><button class="button ghost" data-artifact="${escapeFast(artifact.id)}">查看安全预览</button></article>`).join('')}`;
  body.querySelector('#quality-compare')?.addEventListener('click', () => void runQualityCompare());
  body.querySelectorAll('[data-artifact]').forEach((button) => button.addEventListener('click', () => window.__ACE_APP__?.viewArtifact?.(button.dataset.artifact)));
}

async function runQualityCompare() {
  const state = ace?.state;
  const body = document.querySelector('#inspector-body');
  if (!state?.task || !body) return;
  try {
    const result = await jsonFast(`/api/tasks/${state.task.id}/quality/compare`, { method: 'POST' });
    body.innerHTML = `<div class="artifact-card"><b>Golden Comparator · ${result.gptSolConfigured ? 'GPT-SOL 已配置' : 'GPT-SOL 基线参考'}</b><small>${result.results.length} 个已接受产物已评分</small>${result.results.map((item) => `<p class="artifact-text"><strong>${escapeFast(item.stageId)}</strong> · MiniMax ${item.minimaxScore}/100 · GPT-SOL ${item.gptSolScore ?? '未配置'} · ${item.deliveryAllowed ? '可进入交付审查' : '需返工/阻断'}<br>${escapeFast((item.issues||[]).join('；')||'无红线问题')}</p>`).join('')}</div>`;
  } catch (error) { body.innerHTML = `<div class="inspector-empty">${escapeFast(error.message)}</div>`; }
}

function renderFastEvents() {
  const state = ace?.state;
  const list = document.querySelector('#events');
  const count = document.querySelector('#event-count');
  if (!state || !list) return;
  if (count) count.textContent = state.events.length;
  list.innerHTML = state.events.length ? state.events.slice().reverse().map((event) => `<li><strong>${escapeFast(event.message)}</strong><time>#${event.seq} · ${new Date(event.createdAt).toLocaleTimeString('zh-CN')}</time></li>`).join('') : '<li>等待任务事件</li>';
}

function renderFastTask(task, inputs) {
  const state = ace.state;
  state.task = task;
  state.inputs = inputs;
  document.querySelector('#welcome')?.classList.add('hidden');
  document.querySelector('#task-view')?.classList.remove('hidden');
  document.querySelector('#task-title').textContent = task.title;
  document.querySelector('#task-breadcrumb').textContent = `TASK / ${task.id.slice(0, 8).toUpperCase()}`;
  document.querySelector('#task-prompt').textContent = `${task.prompt}${inputs.length ? ` · 已锁定 ${inputs.length} 个内部输入资料` : ''}`;
  const badge = document.querySelector('#task-state');
  badge.textContent = task.state;
  badge.className = `state ${task.state}`;
  document.querySelector('#start-task').hidden = task.state !== 'DRAFT';
  const reworkButton = document.querySelector('#rework-task');
  if (reworkButton) reworkButton.hidden = !['QUALITY_BLOCKED', 'FAILED', 'PACKAGED'].includes(task.state);
  const startButton = document.querySelector('#start-task');
  if (startButton) startButton.onclick = startTaskFast;
  if (reworkButton) reworkButton.onclick = reworkTaskFast;
  document.querySelectorAll('.task-row').forEach((row) => row.classList.toggle('active', row.dataset.id === task.id));
  renderFastPipeline();
  renderFastInspector();
  renderFastEvents();
}

async function refreshFast(token) {
  if (token !== switchToken || !ace?.state?.task) return;
  try {
    const state = ace.state;
    const after = state.events.at(-1)?.seq || 0;
    const [{ task }, eventResult] = await Promise.all([jsonFast(`/api/tasks/${state.task.id}`), jsonFast(`/api/tasks/${state.task.id}/events?after=${after}`)]);
    if (token !== switchToken) return;
    if (eventResult.events.length) {
      state.events.push(...eventResult.events);
      const [{ artifacts }, { delivery }] = await Promise.all([jsonFast(`/api/tasks/${state.task.id}/artifacts`), jsonFast(`/api/tasks/${state.task.id}/delivery`)]);
      state.artifacts = artifacts;
      state.delivery = delivery;
    }
    renderFastTask(task, state.inputs);
  } catch (error) { console.warn('task refresh failed', error); }
}

async function switchTaskFast(id) {
  if (!ace?.state || !id) return;
  const token = ++switchToken;
  if (ace.state.timer) clearInterval(ace.state.timer);
  const body = document.querySelector('#inspector-body');
  if (body) body.innerHTML = '<div class="inspector-empty">正在切换任务并加载最新过程证据…</div>';
  try {
    const [{ task }, { artifacts }, { inputs }, { events }, { delivery }] = await Promise.all([
      jsonFast(`/api/tasks/${id}`), jsonFast(`/api/tasks/${id}/artifacts`), jsonFast(`/api/tasks/${id}/inputs`), jsonFast(`/api/tasks/${id}/events?after=0`), jsonFast(`/api/tasks/${id}/delivery`),
    ]);
    if (token !== switchToken) return;
    ace.state.artifacts = artifacts;
    ace.state.events = events;
    ace.state.delivery = delivery;
    renderFastTask(task, inputs);
    document.dispatchEvent(new CustomEvent('ace:task-switched', { detail: { taskId: task.id } }));
    ace.state.timer = setInterval(() => refreshFast(token), 1000);
  } catch (error) {
    if (token === switchToken && body) body.innerHTML = `<div class="inspector-empty">${escapeFast(error.message)}</div>`;
  }
}

document.addEventListener('click', (event) => {
  const target = event.target;
  if (target.closest('.task-select')) return;
  const row = target.closest('.task-row');
  if (!row?.dataset.id) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void switchTaskFast(row.dataset.id);
}, true);
