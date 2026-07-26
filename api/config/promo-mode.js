const { loadConfig, saveConfig } = require('../_lib/store');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { promo_mode, promo_image_duration_sec } = req.body || {};
  const config = await loadConfig();

  if (promo_mode) config.system.promo_mode = promo_mode;
  if (promo_image_duration_sec) config.system.promo_image_duration_sec = Number(promo_image_duration_sec);

  await saveConfig(config);

  res.status(200).json({ success: true, system: config.system });
};
