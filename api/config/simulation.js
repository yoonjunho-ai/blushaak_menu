const { loadConfig, saveConfig } = require('../_lib/store');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { speed_multiplier, is_paused, force_phase } = req.body || {};
  const config = await loadConfig();

  if (speed_multiplier !== undefined) config.system.speed_multiplier = speed_multiplier;
  if (is_paused !== undefined) config.system.is_paused = is_paused;

  // force_phase is a fire-once nudge; since sync state is derived statelessly
  // from the wall clock, forcing a phase here would immediately be overwritten
  // by the next state calculation, so it's a no-op signal that's acknowledged
  // but not persisted (matches the fact playlist timing is clock-derived).
  void force_phase;

  await saveConfig(config);

  res.status(200).json({ success: true, system: config.system });
};
