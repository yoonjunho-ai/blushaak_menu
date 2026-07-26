const { put } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');
const { parseForm } = require('./_lib/parse-form');
const { loadConfig, saveConfig } = require('./_lib/store');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { fields, files } = await parseForm(req);
  const screenId = Number(fields.screenId) || 1;
  const posterKey = fields.posterKey || 'images_poster_1';
  const file = files.image;
  if (!file) return res.status(400).json({ error: 'No image uploaded' });

  const ext = path.extname(file.originalFilename || '') || '.png';
  const buffer = fs.readFileSync(file.filepath);
  const blob = await put(`promo/poster_${posterKey}_screen${screenId}_${Date.now()}${ext}`, buffer, {
    access: 'public',
    contentType: file.mimetype || 'application/octet-stream',
  });

  const config = await loadConfig();
  const campaign = config.promotional_campaigns[0];
  if (!campaign) return res.status(500).json({ error: 'No campaign found' });
  if (!campaign[posterKey]) campaign[posterKey] = {};

  campaign[posterKey][`screen_${screenId}`] = blob.url;
  await saveConfig(config);

  res.status(200).json({ success: true, imageUrl: blob.url, posterKey });
};
