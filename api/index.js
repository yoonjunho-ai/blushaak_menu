const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const CONFIG_PATH = path.join(__dirname, '..', 'menu_config.json');

function loadConfig() {
  try {
    const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return null;
  }
}

let menuConfig = loadConfig();

// REST APIs for Vercel Serverless
app.get('/api/config', (req, res) => {
  res.json(loadConfig() || menuConfig);
});

app.get('/api/sync-state', (req, res) => {
  const config = loadConfig() || menuConfig;
  if (!config) return res.status(500).json({ error: 'Config not loaded' });

  const isPaused = config.system.is_paused || false;
  const speed = config.system.speed_multiplier || 1;

  const rawSequence = config.system.playlist_sequence || [
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
  const config = loadConfig() || menuConfig;
  if (!config) return res.status(500).json({ error: 'Config not loaded' });

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
  const config = loadConfig() || menuConfig;
  if (!config.system.ticker) config.system.ticker = {};
  config.system.ticker.is_active = is_active;
  if (text !== undefined) config.system.ticker.text = text;
  menuConfig = config;
  res.json({ success: true, ticker: config.system.ticker });
});

app.post('/api/config/simulation', (req, res) => {
  const { speed_multiplier, is_paused } = req.body;
  const config = loadConfig() || menuConfig;
  if (speed_multiplier !== undefined) config.system.speed_multiplier = speed_multiplier;
  if (is_paused !== undefined) config.system.is_paused = is_paused;
  menuConfig = config;
  res.json({ success: true, system: config.system });
});

app.post('/api/config/playlist', (req, res) => {
  const { playlist_sequence } = req.body;
  const config = loadConfig() || menuConfig;
  if (playlist_sequence) {
    config.system.playlist_sequence = playlist_sequence;
  }
  menuConfig = config;
  res.json({ success: true, playlist_sequence: config.system.playlist_sequence });
});

module.exports = app;
