const { loadConfig, saveConfig } = require('../_lib/store');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { displayId, item } = req.body || {};
  const config = await loadConfig();

  const display = config.displays.find((d) => d.display_id === Number(displayId));
  if (!display) return res.status(404).json({ error: 'Display not found' });

  const newItem = {
    id: `item_${Date.now()}`,
    name_kr: (item && item.name_kr) || '새 메뉴',
    name_en: (item && item.name_en) || 'New Item',
    price: (item && item.price) || '0.0',
    image: '/assets/menu/shaak_latte.svg',
    badge: (item && item.badge) || null,
    is_sold_out: false,
  };

  display.items.push(newItem);
  await saveConfig(config);

  res.status(200).json({ success: true, item: newItem });
};
