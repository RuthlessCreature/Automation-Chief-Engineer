const escapeDelivery = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);

let deliveryRequestInFlight = false;
let deliveryRequestToken = 0;

async function refreshDeliveryPanel() {
  if (deliveryRequestInFlight) return;
  const tab = document.querySelector('.layer-tab[data-layer="delivery"]');
  const activeTask = document.querySelector('.task-row.active');
  const body = document.querySelector('#inspector-body');
  if (!tab || !activeTask || !body || !tab.classList.contains('active')) return;
  const taskId = activeTask.dataset.id;
  const token = ++deliveryRequestToken;
  deliveryRequestInFlight = true;
  try {
    const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/delivery`, { credentials: 'same-origin' });
    const data = await response.json();
    const currentTask = document.querySelector('.task-row.active')?.dataset.id;
    if (token !== deliveryRequestToken || currentTask !== taskId || !document.querySelector('.layer-tab[data-layer="delivery"]')?.classList.contains('active')) return;
    body.dataset.deliveryTaskId = taskId;
    if (!response.ok || !data.delivery || data.delivery.status !== 'FROZEN') {
      body.dataset.deliveryStatus = 'UNAVAILABLE';
      body.innerHTML = '<div class="delivery-empty"><b>尚未冻结客户 ZIP</b><br>当前任务只能在总工审批、交付清单冻结、哈希写入后进入 Customer Delivery。内部通过不等于客户交付。</div>';
      return;
    }
    const delivery = data.delivery;
    body.dataset.deliveryStatus = 'FROZEN';
    body.innerHTML = `<div class="artifact-card"><b>客户交付 ZIP 已冻结</b><small>${delivery.artifact_count} 个受控产出 · ${escapeDelivery(delivery.frozen_at)}<br>SHA-256：${escapeDelivery(delivery.sha256)}</small><div class="preview-actions"><a class="button ghost" target="_blank" rel="noopener" href="/api/tasks/${encodeURIComponent(taskId)}/delivery/preview?asset=technical-solution">在线预览技术方案</a><a class="button ghost" target="_blank" rel="noopener" href="/api/tasks/${encodeURIComponent(taskId)}/delivery/preview?asset=engineering-data">在线预览工程数据</a><a class="button primary" href="${escapeDelivery(delivery.download_path)}">下载客户 ZIP</a></div></div>`;
  } catch {
    // The main app owns authentication/error rendering; the delivery panel is best-effort.
  } finally {
    deliveryRequestInFlight = false;
  }
}

window.__ACE_DELIVERY__ = { refresh: refreshDeliveryPanel };
document.querySelector('.layer-tab[data-layer="delivery"]')?.addEventListener('click', () => setTimeout(refreshDeliveryPanel, 0));
document.addEventListener('ace:task-switched', () => { deliveryRequestToken++; deliveryRequestInFlight = false; void refreshDeliveryPanel(); });
setInterval(refreshDeliveryPanel, 1500);
