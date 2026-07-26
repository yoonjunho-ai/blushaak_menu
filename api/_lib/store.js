const { put, list } = require('@vercel/blob');

const CONFIG_PATHNAME = 'config/menu_config.json';

async function loadConfig() {
  try {
    const { blobs } = await list({ prefix: CONFIG_PATHNAME, limit: 1 });
    const match = blobs.find((b) => b.pathname === CONFIG_PATHNAME);
    if (match) {
      const res = await fetch(match.url, { cache: 'no-store' });
      if (res.ok) return await res.json();
    }
  } catch (err) {
    console.warn('Blob config load failed, falling back to bundled default:', err.message);
  }
  // First run (blob not seeded yet) or blob unreachable: use the bundled seed file.
  delete require.cache[require.resolve('../../menu_config.json')];
  return require('../../menu_config.json');
}

async function saveConfig(config) {
  await put(CONFIG_PATHNAME, JSON.stringify(config, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
}

// Ported from server_local.js so /api/sync-state and the polling fallback
// in admin.js / display.js compute the exact same playlist timing.
function calculateSyncState(config) {
  if (!config) return {};

  const isPaused = config.system ? config.system.is_paused : false;
  const speed = config.system ? config.system.speed_multiplier : 1;

  const rawSequence = (config.system && config.system.playlist_sequence) ? config.system.playlist_sequence : [
    { id: 'step_menu', type: 'MENU', name: '메뉴판', duration_sec: 40, enabled: true },
    { id: 'step_video', type: 'VIDEO', name: '프로모션 동영상', duration_sec: 20, enabled: true },
  ];
  const activeSteps = rawSequence.filter((s) => s.enabled !== false);
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
    config,
    active_step: activeStep,
    step_elapsed_sec: Math.floor(stepElapsedSec),
    cycle_elapsed_sec: Math.floor(cycleSec),
    total_cycle_sec: totalCycleSec,
    speed_multiplier: speed,
    is_paused: isPaused,
    data_version: 'v1.1',
  };
}

module.exports = { loadConfig, saveConfig, calculateSyncState };
