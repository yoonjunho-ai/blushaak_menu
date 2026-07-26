const { loadConfig, saveConfig } = require('../_lib/store');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { displayId, itemId, updates } = req.body || {};
  const config = await loadConfig();
  if (!config) return res.status(500).json({ error: 'Config not loaded' });

  const display = config.displays.find((d) => d.display_id === Number(displayId));
  if (!display) return res.status(404).json({ error: 'Display not found' });

  const item = display.items.find((i) => i.id === itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  Object.assign(item, updates);
  await saveConfig(config);

  res.status(200).json({ success: true, item });
};
