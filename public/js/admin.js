let socket = null;
let currentConfig = null;
let activeScreenTab = 1;
let connectedDisplayIds = new Set();
let isPaused = false;

// DOM Elements
const wsServerStatusEl = document.getElementById('ws-server-status');
const adminClockEl = document.getElementById('admin-clock');

const currentPhaseBadgeEl = document.getElementById('current-phase-badge');
const cycleProgressBarEl = document.getElementById('cycle-progress-bar');
const cycleTimeTextEl = document.getElementById('cycle-time-text');
const pauseToggleBtnEl = document.getElementById('pause-toggle-btn');

const tickerActiveToggleEl = document.getElementById('ticker-active-toggle');
const tickerTextInputEl = document.getElementById('ticker-text-input');

const menuItemsTableBodyEl = document.getElementById('menu-items-table-body');

// Digital Clock
function updateAdminClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  adminClockEl.textContent = `${hours}:${minutes}:${seconds}`;
}
setInterval(updateAdminClock, 1000);
updateAdminClock();

// Connect WebSocket as Admin Client
function connectAdminWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws?type=admin`;

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log('✅ Admin CMS connected to WAS WebSocket.');
    wsServerStatusEl.className = 'status-indicator online';
    wsServerStatusEl.innerHTML = '<span class="dot"></span> WAS Server Connected';
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);

      if (msg.event === 'INIT_STATE') {
        currentConfig = msg.config;
        renderAdminUI();
      } else if (msg.event === 'SYNC_STATE') {
        updateSyncStateUI(msg);
      } else if (msg.event === 'CLIENT_STATUS') {
        updateClientStatusUI(msg.clients);
      } else if (msg.event === 'MENU_UPDATE') {
        if (currentConfig) {
          currentConfig.displays = msg.displays;
          renderMenuTable(activeScreenTab);
        }
      } else if (msg.event === 'TICKER_UPDATE') {
        updateTickerUI(msg.ticker);
      } else if (msg.event === 'SIMULATION_UPDATE') {
        if (msg.system) {
          isPaused = msg.system.is_paused;
          updatePauseBtnUI();
        }
      }
    } catch (e) {
      console.error('Error parsing WS message:', e);
    }
  };

  socket.onclose = () => {
    console.warn('⚠️ Admin WS disconnected. Retrying in 3s...');
    wsServerStatusEl.className = 'status-indicator offline';
    wsServerStatusEl.innerHTML = '<span class="dot"></span> Server Offline';
    setTimeout(connectAdminWebSocket, 3000);
  };
}

// HTTP Polling Fallback for Vercel Serverless
setInterval(async () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    try {
      const res = await fetch('/api/sync-state');
      if (res.ok) {
        const data = await res.json();
        if (data.active_step) updateSyncStateUI(data);
      }
    } catch (e) {
      // Silent catch
    }
  }
}, 1500);

// Render Full Admin UI
function renderAdminUI() {
  if (!currentConfig) return;

  // Ticker setup
  if (currentConfig.system && currentConfig.system.ticker) {
    updateTickerUI(currentConfig.system.ticker);
  }

  // Render Table for default Tab
  renderMenuTable(activeScreenTab);
}

// Update Sync Progress Bar & Phase Badge
function updateSyncStateUI(syncMsg) {
  const { active_step, step_elapsed_sec, cycle_elapsed_sec, total_cycle_sec, speed_multiplier, is_paused: paused } = syncMsg;
  isPaused = paused;
  updatePauseBtnUI();

  const totalSec = total_cycle_sec || 60;
  const stepName = active_step ? (active_step.name || active_step.type) : '메뉴판';
  const stepDuration = active_step ? (active_step.duration_sec || 20) : 40;

  if (active_step && active_step.type === 'MENU') {
    currentPhaseBadgeEl.className = 'phase-badge menu';
  } else {
    currentPhaseBadgeEl.className = 'phase-badge promo';
  }
  currentPhaseBadgeEl.textContent = `현재 재생 단계: ${stepName} (${step_elapsed_sec}초 / ${stepDuration}초)`;

  const percent = Math.min(100, Math.max(0, (cycle_elapsed_sec / totalSec) * 100));
  cycleProgressBarEl.style.width = `${percent}%`;
  cycleTimeTextEl.textContent = `전체 루프 순환: ${cycle_elapsed_sec}초 / ${totalSec}초 (${speed_multiplier}배속)`;
}

// Update Screen Online/Offline Badges
function updateClientStatusUI(clientList) {
  connectedDisplayIds.clear();

  clientList.forEach(c => {
    if (c.clientType === 'display') {
      connectedDisplayIds.add(Number(c.displayId));
    }
  });

  for (let i = 1; i <= 4; i++) {
    const badgeEl = document.getElementById(`badge-screen-${i}`);
    if (badgeEl) {
      if (connectedDisplayIds.has(i)) {
        badgeEl.className = 'screen-badge online';
        badgeEl.textContent = 'ONLINE (SYNCED)';
      } else {
        badgeEl.className = 'screen-badge offline';
        badgeEl.textContent = 'OFFLINE';
      }
    }
  }
}

// Render Menu Items Table for current tab
function renderMenuTable(screenId) {
  if (!currentConfig || !currentConfig.displays) return;
  const display = currentConfig.displays.find(d => d.display_id === screenId);
  if (!display) return;

  menuItemsTableBodyEl.innerHTML = '';

  display.items.forEach(item => {
    const tr = document.createElement('tr');

    let imageSrc = item.image || '/assets/menu/shaak_latte.png';
    if (imageSrc.endsWith('.png')) imageSrc = imageSrc.replace('.png', '.svg');

    tr.innerHTML = `
      <td>
        <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
          <img src="${imageSrc}" id="img_preview_${item.id}" class="table-img" alt="${item.name_kr}">
          <input type="file" id="img_file_${item.id}" accept="image/*" style="display:none;" onchange="uploadMenuImage(${screenId}, '${item.id}')">
          <button class="upload-img-btn" onclick="document.getElementById('img_file_${item.id}').click()">🖼️ 사진 등록</button>
        </div>
      </td>
      <td><strong>${item.id}</strong></td>
      <td><input type="text" id="name_kr_${item.id}" value="${item.name_kr}" class="table-input" style="width: 140px;"></td>
      <td><input type="text" id="name_en_${item.id}" value="${item.name_en}" class="table-input" style="width: 150px;"></td>
      <td><input type="text" id="price_${item.id}" value="${item.price}" class="table-input"></td>
      <td>
        <select id="badge_${item.id}" class="table-select">
          <option value="" ${!item.badge ? 'selected' : ''}>None</option>
          <option value="BEST" ${item.badge === 'BEST' ? 'selected' : ''}>BEST</option>
          <option value="NEW" ${item.badge === 'NEW' ? 'selected' : ''}>NEW</option>
          <option value="SEASONAL" ${item.badge === 'SEASONAL' ? 'selected' : ''}>SEASONAL</option>
          <option value="BAKERY" ${item.badge === 'BAKERY' ? 'selected' : ''}>BAKERY</option>
          <option value="POPULAR" ${item.badge === 'POPULAR' ? 'selected' : ''}>POPULAR</option>
        </select>
      </td>
      <td>
        <label class="toggle-switch">
          <input type="checkbox" ${item.is_sold_out ? 'checked' : ''} onchange="toggleSoldOut(${screenId}, '${item.id}', ${item.is_sold_out})">
          <span class="slider"></span>
        </label>
      </td>
      <td>
        <button class="save-row-btn" onclick="saveItemChanges(${screenId}, '${item.id}')">💾 Save</button>
        <button class="delete-row-btn" onclick="deleteMenuItem(${screenId}, '${item.id}', '${item.name_kr}')">🗑 삭제</button>
      </td>
    `;

    menuItemsTableBodyEl.appendChild(tr);
  });
}

// Append a blank, unsaved row for creating a new menu item
function addNewItemRow() {
  const tr = document.createElement('tr');
  tr.className = 'new-item-row';
  tr.innerHTML = `
    <td><img src="/assets/menu/shaak_latte.svg" class="table-img" alt="신규 메뉴"></td>
    <td><em>신규</em></td>
    <td><input type="text" id="new_item_name_kr" class="table-input" style="width: 140px;" placeholder="한글 이름"></td>
    <td><input type="text" id="new_item_name_en" class="table-input" style="width: 150px;" placeholder="English Name"></td>
    <td><input type="text" id="new_item_price" class="table-input" placeholder="3.5"></td>
    <td>
      <select id="new_item_badge" class="table-select">
        <option value="">None</option>
        <option value="BEST">BEST</option>
        <option value="NEW">NEW</option>
        <option value="SEASONAL">SEASONAL</option>
        <option value="BAKERY">BAKERY</option>
        <option value="POPULAR">POPULAR</option>
      </select>
    </td>
    <td>-</td>
    <td>
      <button class="save-row-btn" onclick="createMenuItem(${activeScreenTab})">✅ 추가</button>
      <button class="delete-row-btn" onclick="this.closest('tr').remove()">✖ 취소</button>
    </td>
  `;
  menuItemsTableBodyEl.appendChild(tr);
  document.getElementById('new_item_name_kr').focus();
}

// Create a new menu item on the server, then re-render from the response
async function createMenuItem(displayId) {
  const name_kr = document.getElementById('new_item_name_kr').value.trim();
  const name_en = document.getElementById('new_item_name_en').value.trim();
  const price = document.getElementById('new_item_price').value.trim();
  const badge = document.getElementById('new_item_badge').value;

  if (!name_kr) {
    alert('한글 메뉴 이름을 입력해주세요.');
    return;
  }

  try {
    const res = await fetch('/api/config/item-add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayId,
        item: { name_kr, name_en, price, badge: badge || null }
      })
    });
    const data = await res.json();
    if (data.success) {
      if (currentConfig) {
        const display = currentConfig.displays.find(d => d.display_id === displayId);
        if (display) display.items.push(data.item);
      }
      renderMenuTable(displayId);
    } else {
      alert(data.error || '메뉴 추가에 실패했습니다.');
    }
  } catch (err) {
    console.error('Failed to add new menu item:', err);
  }
}

// Delete a menu item after confirmation, then re-render from the response
async function deleteMenuItem(displayId, itemId, itemName) {
  if (!confirm(`"${itemName}" 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;

  try {
    const res = await fetch('/api/config/item-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayId, itemId })
    });
    const data = await res.json();
    if (data.success) {
      if (currentConfig) {
        const display = currentConfig.displays.find(d => d.display_id === displayId);
        if (display) display.items = display.items.filter(i => i.id !== itemId);
      }
      renderMenuTable(displayId);
    } else {
      alert(data.error || '삭제에 실패했습니다.');
    }
  } catch (err) {
    console.error('Failed to delete menu item:', err);
  }
}

// Upload Menu Item Image
async function uploadMenuImage(displayId, itemId) {
  const fileInput = document.getElementById(`img_file_${itemId}`);
  if (!fileInput.files || fileInput.files.length === 0) return;

  const formData = new FormData();
  formData.append('displayId', displayId);
  formData.append('itemId', itemId);
  formData.append('image', fileInput.files[0]);

  try {
    const res = await fetch('/api/upload-menu-image', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById(`img_preview_${itemId}`).src = data.imageUrl;
      console.log(`Image updated for item ${itemId}`);
    }
  } catch (err) {
    console.error('Failed to upload menu image:', err);
  }
}

async function fetchConfig() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      currentConfig = await res.json();
      return currentConfig;
    }
  } catch (err) {
    console.warn('API config fetch failed, trying static /menu_config.json...');
  }
  try {
    const res = await fetch('/menu_config.json');
    if (res.ok) {
      currentConfig = await res.json();
      return currentConfig;
    }
  } catch (err) {
    console.error('Failed to load menu config:', err);
  }
  return null;
}

// Switch Screen Tabs
function switchScreenTab(screenId) {
  activeScreenTab = screenId;
  const buttons = document.querySelectorAll('.screen-tabs .tab-btn');
  buttons.forEach((btn, idx) => {
    if (idx + 1 === screenId) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  renderMenuTable(screenId);
}

// Toggle Sold Out
async function toggleSoldOut(displayId, itemId, currentState) {
  try {
    const res = await fetch('/api/config/item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayId,
        itemId,
        updates: { is_sold_out: !currentState }
      })
    });
    const data = await res.json();
    if (data.success) {
      console.log(`Sold out updated for ${itemId}`);
    }
  } catch (err) {
    console.error('Failed to update sold out state:', err);
  }
}

// Save Row Changes
async function saveItemChanges(displayId, itemId) {
  const name_kr = document.getElementById(`name_kr_${itemId}`).value;
  const name_en = document.getElementById(`name_en_${itemId}`).value;
  const price = document.getElementById(`price_${itemId}`).value;
  const badgeVal = document.getElementById(`badge_${itemId}`).value;

  try {
    const res = await fetch('/api/config/item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayId,
        itemId,
        updates: {
          name_kr,
          name_en,
          price,
          badge: badgeVal || null
        }
      })
    });
    const data = await res.json();
    if (data.success) {
      alert(`Item ${name_kr} updated successfully!`);
    }
  } catch (err) {
    console.error('Failed to save item changes:', err);
  }
}

// Update Ticker UI & State
function updateTickerUI(ticker) {
  if (!ticker) return;
  tickerActiveToggleEl.checked = ticker.is_active || false;
  tickerTextInputEl.value = ticker.text || '';
}

async function updateTickerState() {
  const is_active = tickerActiveToggleEl.checked;
  const text = tickerTextInputEl.value;

  try {
    await fetch('/api/config/ticker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active, text })
    });
  } catch (err) {
    console.error('Failed to update ticker:', err);
  }
}

// Simulation Control Actions
async function setSpeed(multiplier) {
  const buttons = document.querySelectorAll('.speed-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  await fetch('/api/config/simulation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ speed_multiplier: multiplier })
  });
}

async function forcePhase(phase) {
  await fetch('/api/config/simulation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force_phase: phase })
  });
}

async function togglePause() {
  isPaused = !isPaused;
  await fetch('/api/config/simulation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_paused: isPaused })
  });
  updatePauseBtnUI();
}

function updatePauseBtnUI() {
  if (isPaused) {
    pauseToggleBtnEl.textContent = '▶️ Resume Loop';
    pauseToggleBtnEl.style.background = '#10B981';
    pauseToggleBtnEl.style.color = '#FFFFFF';
  } else {
    pauseToggleBtnEl.textContent = '⏸️ Pause Loop';
    pauseToggleBtnEl.style.background = '#F1F5F9';
    pauseToggleBtnEl.style.color = '#0F172A';
  }
}

// Preset Sequences Handler
async function applyPreset(presetType) {
  let playlist_sequence = [];

  if (presetType === 'MENU_VIDEO') {
    playlist_sequence = [
      { id: 'step_menu', type: 'MENU', name: '메뉴판', duration_sec: 40, enabled: true },
      { id: 'step_video', type: 'VIDEO', name: '프로모션 동영상', duration_sec: 20, enabled: true }
    ];
  } else if (presetType === 'MENU_POSTER_VIDEO') {
    playlist_sequence = [
      { id: 'step_menu', type: 'MENU', name: '메뉴판', duration_sec: 40, enabled: true },
      { id: 'step_poster_1', type: 'POSTER_1', name: '시즌 포스터 1', duration_sec: 5, enabled: true },
      { id: 'step_video', type: 'VIDEO', name: '프로모션 동영상', duration_sec: 20, enabled: true }
    ];
  } else if (presetType === 'MENU_VIDEO_POSTER') {
    playlist_sequence = [
      { id: 'step_menu', type: 'MENU', name: '메뉴판', duration_sec: 40, enabled: true },
      { id: 'step_video', type: 'VIDEO', name: '프로모션 동영상', duration_sec: 20, enabled: true },
      { id: 'step_poster_1', type: 'POSTER_1', name: '시즌 포스터 1', duration_sec: 5, enabled: true }
    ];
  } else if (presetType === 'MENU_POSTER1_VIDEO_POSTER2') {
    playlist_sequence = [
      { id: 'step_menu', type: 'MENU', name: '메뉴판', duration_sec: 40, enabled: true },
      { id: 'step_poster_1', type: 'POSTER_1', name: '시즌 포스터 1', duration_sec: 5, enabled: true },
      { id: 'step_video', type: 'VIDEO', name: '프로모션 동영상', duration_sec: 20, enabled: true },
      { id: 'step_poster_2', type: 'POSTER_2', name: '시즌 포스터 2', duration_sec: 5, enabled: true }
    ];
  }

  try {
    const res = await fetch('/api/config/playlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playlist_sequence })
    });
    const data = await res.json();
    if (data.success) {
      updatePresetActiveBtn(presetType);
      console.log(`Playlist preset ${presetType} applied successfully.`);
    }
  } catch (err) {
    console.error('Failed to apply playlist preset:', err);
  }
}

function updatePresetActiveBtn(presetType) {
  const map = {
    'MENU_VIDEO': 'preset-btn-1',
    'MENU_POSTER_VIDEO': 'preset-btn-2',
    'MENU_VIDEO_POSTER': 'preset-btn-3',
    'MENU_POSTER1_VIDEO_POSTER2': 'preset-btn-4'
  };

  document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
  const activeId = map[presetType] || 'preset-btn-1';
  const targetBtn = document.getElementById(activeId);
  if (targetBtn) targetBtn.classList.add('active');
}

// Upload Poster 1 or Poster 2 Image
async function uploadPromoPoster(screenId, posterKey) {
  const fileInput = document.getElementById(posterKey === 'images_poster_2' ? `poster2-file-${screenId}` : `poster1-file-${screenId}`);
  if (!fileInput.files || fileInput.files.length === 0) return;

  const formData = new FormData();
  formData.append('screenId', screenId);
  formData.append('posterKey', posterKey);
  formData.append('image', fileInput.files[0]);

  try {
    const res = await fetch('/api/upload-promo-image', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      const targetLabelId = posterKey === 'images_poster_2' ? `poster2-path-${screenId}` : `poster1-path-${screenId}`;
      document.getElementById(targetLabelId).textContent = data.imageUrl;
      alert(`Screen #${screenId} [${posterKey === 'images_poster_2' ? '포스터 2' : '포스터 1'}] 이미지가 반영되었습니다!`);
    }
  } catch (err) {
    console.error('Failed to upload promo poster:', err);
  }
}

// Video Upload Action
async function uploadVideo(screenId) {
  const fileInput = document.getElementById(`video-file-${screenId}`);
  if (!fileInput.files || fileInput.files.length === 0) return;

  const formData = new FormData();
  formData.append('screenId', screenId);
  formData.append('video', fileInput.files[0]);

  try {
    const res = await fetch('/api/upload-promo', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById(`video-path-${screenId}`).textContent = data.videoUrl;
      alert(`Screen #${screenId} video updated successfully!`);
    }
  } catch (err) {
    console.error('Failed to upload video:', err);
  }
}

// Preview Screen Popup
function openPreview(screenId) {
  window.open(`/display?id=${screenId}`, `display_preview_${screenId}`, 'width=1280,height=720');
}

// Initialize Admin WS
connectAdminWebSocket();
