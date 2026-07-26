const { loadConfig, saveConfig } = require('../_lib/store');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { is_active, text } = req.body || {};
  const config = await loadConfig();
  if (!config.system.ticker) config.system.ticker = {};
  config.system.ticker.is_active = is_active;
  if (text !== undefined) config.system.ticker.text = text;

  await saveConfig(config);

  res.status(200).json({ success: true, ticker: config.system.ticker });
};
