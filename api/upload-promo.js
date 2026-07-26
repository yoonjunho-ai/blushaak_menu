const { put } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');
const { parseForm } = require('./_lib/parse-form');
const { loadConfig, saveConfig } = require('./_lib/store');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Vercel Serverless Functions cap request bodies at 4.5MB, so promo videos
  // must stay under that. Larger files need a client-side direct-to-blob
  // upload flow instead of this server-side route.
  const { fields, files } = await parseForm(req, { maxFileSize: 4.4 * 1024 * 1024 });
  const screenId = Number(fields.screenId) || 1;
  const file = files.video;
  if (!file) return res.status(400).json({ error: 'No video uploaded' });

  const ext = path.extname(file.originalFilename || '') || '.mp4';
  const buffer = fs.readFileSync(file.filepath);
  const blob = await put(`promo/video_screen${screenId}_${Date.now()}${ext}`, buffer, {
    access: 'public',
    contentType: file.mimetype || 'video/mp4',
  });

  const config = await loadConfig();
  const campaign = config.promotional_campaigns[0];
  if (campaign && campaign.videos) {
    campaign.videos[`screen_${screenId}`] = blob.url;
    await saveConfig(config);
  }

  res.status(200).json({ success: true, videoUrl: blob.url });
};
