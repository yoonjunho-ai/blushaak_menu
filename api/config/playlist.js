const { loadConfig, saveConfig } = require('../_lib/store');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { playlist_sequence } = req.body || {};
  const config = await loadConfig();

  if (playlist_sequence) {
    config.system.playlist_sequence = playlist_sequence;
    await saveConfig(config);
  }

  res.status(200).json({ success: true, playlist_sequence: config.system.playlist_sequence });
};
