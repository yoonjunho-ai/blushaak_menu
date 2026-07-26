const { loadConfig, calculateSyncState } = require('./_lib/store');

module.exports = async (req, res) => {
  const config = await loadConfig();
  res.status(200).json(calculateSyncState(config));
};
