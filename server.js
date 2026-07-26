const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Conditionally load ws (WebSockets) ONLY in local standalone server environments
let WebSocketServer, WebSocket;
if (!process.env.VERCEL) {
  try {
    const wsModule = require('ws');
    WebSocketServer = wsModule.WebSocketServer;
    WebSocket = wsModule.WebSocket;
  } catch (err) {
    console.warn('WebSocket module load notice:', err.message);
  }
}

const CONFIG_PATH = path.join(__dirname, 'menu_config.json');

// Use /tmp on Vercel read-only filesystem to avoid EROFS crash
const UPLOADS_DIR = process.env.VERCEL
  ? path.join('/tmp', 'uploads')
  : path.join(__dirname, 'uploads');

try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('Upload directory creation notice:', err.message);
}

const PUBLIC_DIR = path.join(__dirname, 'public');

// Multer storage configuration for promo video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `promo_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// Helper to load and save menu configuration
function loadConfig() {
  try {
    const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading menu_config.json:', err);
    return null;
  }
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Config save notice (read-only environment or Vercel serverless):', err.message);
  }
}

let menuConfig = loadConfig();

const app = express();
app.use(express.json());
app.use(express.static(PUBLIC_DIR));
app.use('/uploads', express.static(UPLOADS_DIR));

// Direct convenient short routes
app.get('/display', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'display.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

// REST APIs
app.get('/api/config', (req, res) => {
  res.json(loadConfig() || menuConfig);
});

// Update item state (is_sold_out, price, badge, name_kr, etc.)
app.post('/api/config/item', (req, res) => {
  const { displayId, itemId, updates } = req.body;
  if (!menuConfig) return res.status(500).json({ error: 'Config not loaded' });

  const display = menuConfig.displays.find(d => d.display_id === Number(displayId));
  if (!display) return res.status(404).json({ error: 'Display not found' });

  const item = display.items.find(i => i.id === itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  Object.assign(item, updates);
  saveConfig(menuConfig);

  broadcast({
    event: 'MENU_UPDATE',
    display_id: displayId,
    item_id: itemId,
    displays: menuConfig.displays,
    timestamp: Date.now()
  });

  res.json({ success: true, item });
});

// Update ticker notice
app.post('/api/config/ticker', (req, res) => {
  const { is_active, text } = req.body;
  if (!menuConfig.system.ticker) {
    menuConfig.system.ticker = {};
  }
  menuConfig.system.ticker.is_active = is_active;
  if (text !== undefined) menuConfig.system.ticker.text = text;

  saveConfig(menuConfig);

  broadcast({
    event: 'TICKER_UPDATE',
    ticker: menuConfig.system.ticker,
    timestamp: Date.now()
  });

  res.json({ success: true, ticker: menuConfig.system.ticker });
});

// Update simulation control (speed, pause, force phase)
app.post('/api/config/simulation', (req, res) => {
  const { speed_multiplier, is_paused, force_phase } = req.body;

  if (speed_multiplier !== undefined) menuConfig.system.speed_multiplier = speed_multiplier;
  if (is_paused !== undefined) menuConfig.system.is_paused = is_paused;

  if (force_phase) {
    if (force_phase === 'PHASE_A_MENU') {
      cycleElapsedSec = 0;
    } else if (force_phase === 'PHASE_B_PROMO') {
      cycleElapsedSec = menuConfig.system.phase_a_duration_sec;
    }
  }

  saveConfig(menuConfig);

  broadcast({
    event: 'SIMULATION_UPDATE',
    system: menuConfig.system,
    timestamp: Date.now()
  });

  res.json({ success: true, system: menuConfig.system });
});

// Multer storage for menu item images
const menuImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(PUBLIC_DIR, 'assets', 'menu')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const itemId = req.body.itemId || 'item';
    cb(null, `${itemId}_${Date.now()}${ext}`);
  }
});
const uploadMenuImg = multer({ storage: menuImageStorage });

app.post('/api/upload-menu-image', uploadMenuImg.single('image'), (req, res) => {
  const { displayId, itemId } = req.body;
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

  const fileUrl = `/assets/menu/${req.file.filename}`;
  const display = menuConfig.displays.find(d => d.display_id === Number(displayId));
  if (!display) return res.status(404).json({ error: 'Display not found' });

  const item = display.items.find(i => i.id === itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  item.image = fileUrl;
  saveConfig(menuConfig);

  broadcast({
    event: 'MENU_UPDATE',
    display_id: displayId,
    item_id: itemId,
    displays: menuConfig.displays,
    timestamp: Date.now()
  });

  res.json({ success: true, imageUrl: fileUrl, item });
});

// Upload promo video for a screen
app.post('/api/upload-promo', upload.single('video'), (req, res) => {
  const screenId = Number(req.body.screenId) || 1;
  if (!req.file) return res.status(400).json({ error: 'No video uploaded' });

  const fileUrl = `/uploads/${req.file.filename}`;
  const campaign = menuConfig.promotional_campaigns[0];
  if (campaign && campaign.videos) {
    campaign.videos[`screen_${screenId}`] = fileUrl;
    saveConfig(menuConfig);

    broadcast({
      event: 'CAMPAIGN_UPDATE',
      campaigns: menuConfig.promotional_campaigns,
      promo_mode: menuConfig.system.promo_mode,
      timestamp: Date.now()
    });
  }

  res.json({ success: true, videoUrl: fileUrl });
});

// Upload promo poster image for a screen
app.post('/api/upload-promo-image', uploadMenuImg.single('image'), (req, res) => {
  const screenId = Number(req.body.screenId) || 1;
  const posterKey = req.body.posterKey || 'images_poster_1';
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

  const fileUrl = `/assets/promo/${req.file.filename}`;
  const campaign = menuConfig.promotional_campaigns[0];
  if (!campaign) return res.status(500).json({ error: 'No campaign found' });
  if (!campaign[posterKey]) campaign[posterKey] = {};

  campaign[posterKey][`screen_${screenId}`] = fileUrl;
  saveConfig(menuConfig);

  broadcast({
    event: 'CAMPAIGN_UPDATE',
    campaigns: menuConfig.promotional_campaigns,
    timestamp: Date.now()
  });

  res.json({ success: true, imageUrl: fileUrl, posterKey });
});

// Toggle Promo Mode
app.post('/api/config/promo-mode', (req, res) => {
  const { promo_mode, promo_image_duration_sec } = req.body;
  if (promo_mode) menuConfig.system.promo_mode = promo_mode;
  if (promo_image_duration_sec) menuConfig.system.promo_image_duration_sec = Number(promo_image_duration_sec);

  saveConfig(menuConfig);

  broadcast({
    event: 'SIMULATION_UPDATE',
    system: menuConfig.system,
    timestamp: Date.now()
  });

  res.json({ success: true, system: menuConfig.system });
});

// Playlist Sequence Config Update
app.post('/api/config/playlist', (req, res) => {
  const { playlist_sequence } = req.body;
  if (playlist_sequence) {
    menuConfig.system.playlist_sequence = playlist_sequence;
    saveConfig(menuConfig);

    broadcast({
      event: 'SIMULATION_UPDATE',
      system: menuConfig.system,
      timestamp: Date.now()
    });
  }

  res.json({ success: true, playlist_sequence: menuConfig.system.playlist_sequence });
});

// Dynamic Sync State calculator for HTTP Polling & Vercel
let cycleElapsedSec = 0;

function calculateSyncState() {
  const config = loadConfig() || menuConfig;
  if (!config) return {};

  const isPaused = config.system ? config.system.is_paused : false;
  const speed = config.system ? config.system.speed_multiplier : 1;

  const rawSequence = (config.system && config.system.playlist_sequence) ? config.system.playlist_sequence : [
    { id: 'step_menu', type: 'MENU', name: '메뉴판', duration_sec: 40, enabled: true },
    { id: 'step_video', type: 'VIDEO', name: '프로모션 동영상', duration_sec: 20, enabled: true }
  ];
  const activeSteps = rawSequence.filter(s => s.enabled !== false);
  if (activeSteps.length === 0) {
    activeSteps.push({ id: 'fallback', type: 'MENU', name: '메뉴판', duration_sec: 40, enabled: true });
  }

  const totalCycleSec = activeSteps.reduce((sum, s) => sum + (s.duration_sec || 5), 0);
  const nowSec = Math.floor(Date.now() / 1000);
  const cycleSec = isPaused ? 0 : (nowSec % totalCycleSec);

  let accumulated = 0;
  let activeStep = activeSteps[0];
  let stepElapsedSec = 0;

  for (const step of activeSteps) {
    const stepDuration = step.duration_sec || 5;
    if (cycleSec >= accumulated && cycleSec < accumulated + stepDuration) {
      activeStep = step;
      stepElapsedSec = cycleSec - accumulated;
      break;
    }
    accumulated += stepDuration;
  }

  return {
    event: 'SYNC_STATE',
    timestamp: Date.now(),
    config: config,
    active_step: activeStep,
    step_elapsed_sec: Math.floor(stepElapsedSec),
    cycle_elapsed_sec: Math.floor(cycleSec),
    total_cycle_sec: totalCycleSec,
    speed_multiplier: speed,
    is_paused: isPaused,
    data_version: 'v1.1'
  };
}

// HTTP Sync State Endpoint
app.get('/api/sync-state', (req, res) => {
  res.json(calculateSyncState());
});

// WebSocket broadcast helper
const clients = new Map();

function broadcast(data) {
  if (process.env.VERCEL || !clients) return;
  const jsonStr = JSON.stringify(data);
  for (const [ws] of clients) {
    if (ws && ws.readyState === 1) {
      ws.send(jsonStr);
    }
  }
}

// ONLY initialize standalone HTTP Server & WebSocketServer when running locally (NOT on Vercel)
if (!process.env.VERCEL && WebSocketServer) {
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const displayId = urlParams.get('id') || '1';
    const clientType = urlParams.get('type') || 'display';

    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    clients.set(ws, { clientId, displayId, clientType, ip: req.socket.remoteAddress });

    console.log(`🔌 Client connected: [Type: ${clientType}, DisplayID: ${displayId}]`);

    ws.send(JSON.stringify({
      event: 'INIT_STATE',
      timestamp: Date.now(),
      config: menuConfig,
      cycle_elapsed_sec: cycleElapsedSec
    }));

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.event === 'PING') {
          ws.send(JSON.stringify({ event: 'PONG', timestamp: Date.now() }));
        }
      } catch (e) {
        console.error('Invalid WS payload:', e);
      }
    });

    ws.on('close', () => {
      console.log(`❌ Client disconnected: [ID: ${clientId}]`);
      clients.delete(ws);
    });
  });

  // Local state machine timer loop
  setInterval(() => {
    if (!menuConfig || menuConfig.system.is_paused) return;
    const speed = menuConfig.system.speed_multiplier || 1;
    const syncState = calculateSyncState();
    cycleElapsedSec = (cycleElapsedSec + 1 * speed) % (syncState.total_cycle_sec || 60);
    broadcast(syncState);
  }, 1000);

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🚀 Blu Shaak Signage WAS Server running on port ${PORT}`);
    console.log(`🖥️  Display screens: http://localhost:${PORT}/display?id=1..4`);
    console.log(`⚙️  Admin Dashboard: http://localhost:${PORT}/admin`);
    console.log(`=================================================`);
  });
}

module.exports = app;
