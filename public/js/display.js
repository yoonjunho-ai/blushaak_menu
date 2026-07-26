// Get Display ID from URL search params (default to 1)
const urlParams = new URLSearchParams(window.location.search);
const displayId = parseInt(urlParams.get('id') || '1', 10);

let socket = null;
let currentMenuConfig = null;
let currentPhase = 'PHASE_A_MENU';
let isOfflineMode = false;
let offlineTimer = null;

// DOM Elements
const screenTitleEl = document.getElementById('screen-title');
const screenSubtitleEl = document.getElementById('screen-subtitle');
const displayIdTagEl = document.getElementById('display-id-tag');
const networkBadgeEl = document.getElementById('network-badge');
const networkTextEl = document.getElementById('network-text');
const digitalClockEl = document.getElementById('current-clock');

const menuGridViewEl = document.getElementById('menu-grid-view');
const menuGridContainerEl = document.getElementById('menu-grid-container');

const promoVideoViewEl = document.getElementById('promo-video-view');
const promoVideoEl = document.getElementById('promo-video');
const promoVideoSourceEl = document.getElementById('promo-video-source');

const tickerBannerEl = document.getElementById('ticker-banner');
const tickerTextEl = document.getElementById('ticker-text');

// Initialize Digital Clock
function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  digitalClockEl.textContent = `${hours}:${minutes}:${seconds}`;
}
setInterval(updateClock, 1000);
updateClock();

// Register Service Worker for Offline PWA Caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered:', reg.scope))
      .catch(err => console.error('Service Worker registration failed:', err));
  });
}

// Render Menu Cards for current screen (Top 8 Hero Items for 50-inch 2m readability)
function renderMenuGrid(displayData) {
  if (!displayData) return;

  screenTitleEl.textContent = displayData.title || 'MENU BOARD';
  if (screenSubtitleEl) {
    screenSubtitleEl.textContent = displayData.subtitle || '';
  }

  const itemCount = displayData.items.length;
  let gridClass = 'grid-12';
  if (itemCount >= 16) {
    gridClass = 'grid-18';
  } else if (itemCount >= 13) {
    gridClass = 'grid-15';
  }
  menuGridContainerEl.className = `menu-grid-container ${gridClass}`;

  // Render all 12 items for full menu coverage in 4x3 grid
  displayData.items.forEach(item => {
    const card = document.createElement('div');
    card.className = `menu-card ${item.is_sold_out ? 'sold-out' : ''} ${item.is_signature ? 'signature-item' : ''}`;
    card.dataset.itemId = item.id;

    // Badges
    let badgeHtml = '';
    if (item.badge) {
      badgeHtml = `<span class="badge ${item.badge}">${item.badge}</span>`;
    }

    // Image (Prioritize PNG/JPG real images, with SVG fallback on error)
    let imageSrc = item.image || '/assets/menu/shaak_latte.svg';

    card.innerHTML = `
      <div class="menu-card-top">
        ${badgeHtml}
      </div>
      <div class="menu-img-wrapper">
        <img src="${imageSrc}" alt="${item.name_kr}" class="menu-img" onerror="this.onerror=null; this.src='${imageSrc.replace('.png', '.svg')}';">
      </div>
      <div class="menu-details">
        <span class="menu-name-kr">${item.name_kr}</span>
        <span class="menu-name-en">${item.name_en}</span>
        <div class="menu-price-container">
          <span class="menu-price">${item.price}</span>
        </div>
      </div>
      ${item.is_sold_out ? `
        <div class="sold-out-overlay">
          <div class="sold-out-stamp">SOLD OUT</div>
        </div>
      ` : ''}
    `;

    menuGridContainerEl.appendChild(card);
  });
}

const promoImageViewEl = document.getElementById('promo-image-view');
const promoImageEl = document.getElementById('promo-image');

let currentPromoMode = 'VIDEO';

// Pre-load video or poster image source
function setupPromoMedia(campaigns, promoMode) {
  currentPromoMode = promoMode || currentPromoMode;
  if (!campaigns || campaigns.length === 0) return;
  const activeCampaign = campaigns.find(c => c.is_active) || campaigns[0];
  if (!activeCampaign) return;

  if (currentPromoMode === 'IMAGE') {
    if (activeCampaign.images) {
      const imgUrl = activeCampaign.images[`screen_${displayId}`] || activeCampaign.images.screen_1;
      if (promoImageEl.getAttribute('src') !== imgUrl) {
        promoImageEl.src = imgUrl;
      }
    }
  } else {
    if (activeCampaign.videos) {
      const videoUrl = activeCampaign.videos[`screen_${displayId}`] || activeCampaign.videos.screen_1;
      const fullUrl = new URL(videoUrl, window.location.origin).href;

      if (promoVideoEl.src !== fullUrl) {
        console.log(`🎬 Updating Video Source for Screen #${displayId}:`, videoUrl);
        promoVideoEl.src = videoUrl;
        promoVideoSourceEl.setAttribute('src', videoUrl);
        promoVideoEl.load();
      }
    }
  }
}

// Handle State Machine Transition based on active playlist step
function handlePlaylistStepTransition(step, stepElapsedSec) {
  if (!step) return;
  const stepType = step.type || 'MENU';

  if (stepType === 'MENU') {
    menuGridViewEl.style.display = 'block';
    promoVideoViewEl.classList.remove('active');
    promoVideoViewEl.style.display = 'none';
    promoImageViewEl.classList.remove('active');
    promoImageViewEl.style.display = 'none';

    if (!promoVideoEl.paused) {
      promoVideoEl.pause();
    }
  } else if (stepType === 'POSTER_1' || stepType === 'POSTER' || stepType === 'POSTER_2') {
    menuGridViewEl.style.display = 'none';
    promoVideoViewEl.style.display = 'none';
    promoImageViewEl.style.display = 'block';
    promoImageViewEl.classList.add('active');

    // Select correct poster image set (poster_1 vs poster_2)
    const activeCampaign = currentMenuConfig?.promotional_campaigns?.[0];
    if (activeCampaign) {
      const posterSetKey = stepType === 'POSTER_2' ? 'images_poster_2' : 'images_poster_1';
      const imageMap = activeCampaign[posterSetKey] || activeCampaign.images_poster_1 || activeCampaign.images;
      if (imageMap) {
        const imgUrl = imageMap[`screen_${displayId}`] || imageMap.screen_1;
        if (promoImageEl.getAttribute('src') !== imgUrl) {
          promoImageEl.src = imgUrl;
        }
      }
    }

    if (!promoVideoEl.paused) {
      promoVideoEl.pause();
    }
  } else if (stepType === 'VIDEO') {
    menuGridViewEl.style.display = 'none';
    promoImageViewEl.style.display = 'none';
    promoVideoViewEl.style.display = 'block';
    promoVideoViewEl.classList.add('active');

    // Seek to accurate step elapsed time
    if (Math.abs(promoVideoEl.currentTime - stepElapsedSec) > 1.5) {
      promoVideoEl.currentTime = stepElapsedSec;
    }

    if (promoVideoEl.paused) {
      promoVideoEl.play().catch(e => {
        console.warn('Autoplay prevented by browser policy:', e);
      });
    }
  }
}

// Update Ticker Banner
function updateTicker(tickerData) {
  if (!tickerData || !tickerData.is_active) {
    tickerBannerEl.classList.add('hidden');
  } else {
    tickerBannerEl.classList.remove('hidden');
    tickerTextEl.textContent = tickerData.text || '';
  }
}

// WebSocket Connection & Synchronization Logic
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws?id=${displayId}&type=display`;

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log(`✅ Display #${displayId} connected to WAS server WebSocket.`);
    isOfflineMode = false;
    networkBadgeEl.className = 'status-badge online';
    networkTextEl.textContent = 'LIVE SYNC';
    if (offlineTimer) clearInterval(offlineTimer);
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);

      if (msg.event === 'INIT_STATE') {
        currentMenuConfig = msg.config;
        const displayData = currentMenuConfig.displays.find(d => d.display_id === displayId);
        renderMenuGrid(displayData);
        setupPromoMedia(currentMenuConfig.promotional_campaigns);
        updateTicker(currentMenuConfig.system.ticker);
        handlePlaylistStepTransition(msg.active_step, msg.step_elapsed_sec);
      } else if (msg.event === 'SYNC_STATE') {
        handlePlaylistStepTransition(msg.active_step, msg.step_elapsed_sec);
      } else if (msg.event === 'MENU_UPDATE') {
        if (currentMenuConfig) {
          currentMenuConfig.displays = msg.displays;
          const displayData = currentMenuConfig.displays.find(d => d.display_id === displayId);
          renderMenuGrid(displayData);
        }
      } else if (msg.event === 'TICKER_UPDATE') {
        updateTicker(msg.ticker);
      } else if (msg.event === 'CAMPAIGN_UPDATE') {
        setupPromoMedia(msg.campaigns);
      }
    } catch (err) {
      console.error('Error parsing WebSocket message:', err);
    }
  };

  socket.onerror = (err) => {
    console.warn('WebSocket error encountered:', err);
    startOfflineFallback();
  };

  socket.onclose = () => {
    console.warn('⚠️ WebSocket disconnected. Switching to local clock sync fallback...');
    startOfflineFallback();
    // Attempt auto-reconnect after 3 seconds
    setTimeout(connectWebSocket, 3000);
  };
}

// HTTP Polling Fallback for Vercel Serverless / Cloud Hosting
async function fetchConfig() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      currentMenuConfig = await res.json();
      return currentMenuConfig;
    }
  } catch (err) {
    console.warn('API config fetch failed, trying static /menu_config.json...');
  }
  try {
    const res = await fetch('/menu_config.json');
    if (res.ok) {
      currentMenuConfig = await res.json();
      return currentMenuConfig;
    }
  } catch (err) {
    console.error('Failed to load menu config:', err);
  }
  return null;
}

setInterval(async () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    try {
      const res = await fetch('/api/sync-state');
      if (res.ok) {
        const data = await res.json();
        if (data.config && !currentMenuConfig) {
          currentMenuConfig = data.config;
          const displayData = currentMenuConfig.displays.find(d => d.display_id === displayId);
          renderMenuGrid(displayData);
          setupPromoMedia(currentMenuConfig.promotional_campaigns);
          updateTicker(currentMenuConfig.system.ticker);
        }
        if (data.active_step) handlePlaylistStepTransition(data.active_step, data.step_elapsed_sec);
      }
    } catch (e) {
      // Silent catch
    }
  }
}, 3000);

// OFFLINE FALLBACK ENGINE (Local Clock Sync Math)
// If network drops, all 4 screens compute state using Date.now() % 60000
function startOfflineFallback() {
  if (isOfflineMode) return;
  isOfflineMode = true;

  networkBadgeEl.className = 'status-badge offline';
  networkTextEl.textContent = 'OFFLINE LOOP';

  if (offlineTimer) clearInterval(offlineTimer);

  offlineTimer = setInterval(() => {
    const now = Date.now();
    const cycleElapsedSec = Math.floor((now % 60000) / 1000);

    let phase = 'PHASE_A_MENU';
    let phaseElapsed = cycleElapsedSec;

    if (cycleElapsedSec >= 40) {
      phase = 'PHASE_B_PROMO';
      phaseElapsed = cycleElapsedSec - 40;
    }

    handlePhaseTransition(phase, phaseElapsed);
  }, 1000);
}

// Start WebSocket connection
connectWebSocket();
