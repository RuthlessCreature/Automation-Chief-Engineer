const taskAdminStyle = document.createElement('style');
taskAdminStyle.textContent = '.task-admin-toolbar{display:flex;gap:5px;margin:8px 0}.task-admin-toolbar .button{padding:7px 8px;font-size:10px}.task-row-wrap{display:flex;align-items:stretch;gap:5px}.task-row-wrap .task-row{flex:1}.task-select{width:15px;accent-color:#51e8ff;cursor:pointer}';
document.head.appendChild(taskAdminStyle);

function taskIdsSelected() {
  return [...document.querySelectorAll('.task-select:checked')].map((input) => input.dataset.id).filter(Boolean);
}

function decorateTaskRows() {
  const list = document.querySelector('#task-list');
  if (!list) return;
  let toolbar = document.querySelector('#task-admin-toolbar');
  if (!toolbar) {
    toolbar = document.createElement('div');
    toolbar.id = 'task-admin-toolbar';
    toolbar.className = 'task-admin-toolbar';
    toolbar.innerHTML = '<button class="button ghost" data-task-action="rename">改名</button><button class="button ghost" data-task-action="delete">删除所选</button>';
    list.parentElement.insertBefore(toolbar, list);
    toolbar.addEventListener('click', async (event) => {
      const action = event.target.closest('[data-task-action]')?.dataset.taskAction;
      if (!action) return;
      const ids = taskIdsSelected();
      if (action === 'rename') {
        const active = document.querySelector('.task-row.active')?.dataset.id;
        const target = ids.length === 1 ? ids[0] : active;
        if (!target) return alert('请先选中任务，或打开一个任务后再改名。');
        const current = document.querySelector(`.task-row[data-id="${CSS.escape(target)}"] b`)?.textContent ?? '';
        const title = prompt('请输入新的任务名称：', current);
        if (!title || title.trim().length < 3) return;
        const response = await fetch(`/api/tasks/${encodeURIComponent(target)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.trim() }) });
        if (!response.ok) { const data = await response.json(); return alert(data.error || '改名失败'); }
        location.reload();
      }
      if (action === 'delete') {
        if (!ids.length) return alert('请先勾选要删除的任务。');
        if (!confirm(`确认删除 ${ids.length} 个任务？任务会进入可恢复状态，运行中的任务不能删除。`)) return;
        const response = await fetch('/api/tasks/bulk-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskIds: ids }) });
        const data = await response.json();
        if (!response.ok) return alert(data.error || '批量删除失败');
        location.reload();
      }
    });
  }
  for (const button of [...list.querySelectorAll(':scope > .task-row')]) {
    if (button.parentElement?.classList.contains('task-row-wrap')) continue;
    const wrapper = document.createElement('div');
    wrapper.className = 'task-row-wrap';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-select';
    checkbox.dataset.id = button.dataset.id;
    checkbox.title = '选择任务';
    checkbox.addEventListener('click', (event) => event.stopPropagation());
    button.replaceWith(wrapper);
    wrapper.append(checkbox, button);
  }
}

const taskList = document.querySelector('#task-list');
if (taskList) {
  new MutationObserver(decorateTaskRows).observe(taskList, { childList: true });
  decorateTaskRows();
}
