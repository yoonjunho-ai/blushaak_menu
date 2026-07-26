const { put } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');
const { parseForm } = require('./_lib/parse-form');
const { loadConfig, saveConfig } = require('./_lib/store');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { fields, files } = await parseForm(req);
  const { displayId, itemId } = fields;
  const file = files.image;
  if (!file) return res.status(400).json({ error: 'No image uploaded' });

  const ext = path.extname(file.originalFilename || '') || '.png';
  const buffer = fs.readFileSync(file.filepath);
  const blob = await put(`menu/${itemId}_${Date.now()}${ext}`, buffer, {
    access: 'public',
    contentType: file.mimetype || 'application/octet-stream',
  });

  const config = await loadConfig();
  const display = config.displays.find((d) => d.display_id === Number(displayId));
  if (!display) return res.status(404).json({ error: 'Display not found' });

  const item = display.items.find((i) => i.id === itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  item.image = blob.url;
  await saveConfig(config);

  res.status(200).json({ success: true, imageUrl: blob.url, item });
};
