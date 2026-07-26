const { loadConfig, saveConfig } = require('../_lib/store');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { displayId, itemId } = req.body || {};
  const config = await loadConfig();

  const display = config.displays.find((d) => d.display_id === Number(displayId));
  if (!display) return res.status(404).json({ error: 'Display not found' });

  const idx = display.items.findIndex((i) => i.id === itemId);
  if (idx === -1) return res.status(404).json({ error: 'Item not found' });

  display.items.splice(idx, 1);
  await saveConfig(config);

  res.status(200).json({ success: true });
};
