const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Directly require menu_config.json to guarantee Vercel NFT bundling
let initialConfig;
try {
  initialConfig = require('../menu_config.json');
} catch (e) {
  initialConfig = { displays: [], system: {}, promotional_campaigns: [] };
}

let menuConfig = initialConfig;

function getActiveConfig() {
  try {
    const configPath = path.join(process.cwd(), 'menu_config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (e) {
    // fallback to bundled in-memory config
  }
  return menuConfig || initialConfig;
}

// REST APIs for Vercel Serverless
app.get('/api/config', (req, res) => {
  res.json(getActiveConfig());
});

app.get('/api/sync-state', (req, res) => {
  const config = getActiveConfig();
  if (!config) return res.status(500).json({ error: 'Config not loaded' });

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

  res.json({
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
  });
});

app.post('/api/config/item', (req, res) => {
  const { displayId, itemId, updates } = req.body;
  const config = getActiveConfig();
  if (!config || !config.displays) return res.status(500).json({ error: 'Config not loaded' });

  const display = config.displays.find(d => d.display_id === Number(displayId));
  if (!display) return res.status(404).json({ error: 'Display not found' });

  const item = display.items.find(i => i.id === itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  Object.assign(item, updates);
  menuConfig = config;
  res.json({ success: true, item });
});

app.post('/api/config/ticker', (req, res) => {
  const { is_active, text } = req.body;
  const config = getActiveConfig();
  if (!config.system) config.system = {};
  if (!config.system.ticker) config.system.ticker = {};
  config.system.ticker.is_active = is_active;
  if (text !== undefined) config.system.ticker.text = text;
  menuConfig = config;
  res.json({ success: true, ticker: config.system.ticker });
});

app.post('/api/config/simulation', (req, res) => {
  const { speed_multiplier, is_paused } = req.body;
  const config = getActiveConfig();
  if (!config.system) config.system = {};
  if (speed_multiplier !== undefined) config.system.speed_multiplier = speed_multiplier;
  if (is_paused !== undefined) config.system.is_paused = is_paused;
  menuConfig = config;
  res.json({ success: true, system: config.system });
});

app.post('/api/config/playlist', (req, res) => {
  const { playlist_sequence } = req.body;
  const config = getActiveConfig();
  if (!config.system) config.system = {};
  if (playlist_sequence) {
    config.system.playlist_sequence = playlist_sequence;
  }
  menuConfig = config;
  res.json({ success: true, playlist_sequence: config.system.playlist_sequence });
});

module.exports = app;
