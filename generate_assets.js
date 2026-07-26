import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dirs = [
  'public/css',
  'public/js',
  'public/assets/menu',
  'public/assets/video',
  'public/assets/promo',
  'uploads'
];

console.log('📁 Creating directory structure...');
dirs.forEach(d => {
  const dirPath = path.join(__dirname, d);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Generate clean SVG placeholders for menu items without inner card boxes or background effects
console.log('🎨 Creating clean drink visual assets without background boxes...');
const svgTemplate = (name, badge, color) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="300" height="400">
  <defs>
    <linearGradient id="cupGrad_${name.replace(/\s+/g, '')}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${color}"/>
      <stop offset="100%" stop-color="#002B49"/>
    </linearGradient>
  </defs>
  
  <!-- Pure Cup Base (No background box or inner card) -->
  <g>
    <!-- Cup body -->
    <path d="M 80 110 L 220 110 L 202 360 L 98 360 Z" fill="url(#cupGrad_${name.replace(/\s+/g, '')})" rx="10"/>
    <!-- Cream / Top Layer -->
    <ellipse cx="150" cy="110" rx="70" ry="30" fill="#FFFFFF"/>
    <path d="M 85 110 Q 150 75 215 110 Q 150 90 85 110" fill="#FFF8E7"/>
    <!-- Logo on Cup -->
    <path d="M 138 220 L 162 220 L 150 195 Z" fill="#0066CC"/>
    <text x="150" y="255" font-family="'Pretendard', sans-serif" font-size="16" font-weight="bold" fill="#FFFFFF" text-anchor="middle" letter-spacing="2">BLU SHAAK</text>
  </g>

  <!-- Straw for Cold Drinks -->
  <line x1="170" y1="35" x2="155" y2="105" stroke="#0066CC" stroke-width="10" stroke-linecap="round"/>
</svg>
`;

const menuAssets = [
  { file: 'shaak_latte.png', name: 'Shaak Latte', badge: 'BEST', color: '#8B5A2B' },
  { file: 'peanut_latte.png', name: 'Peanut Latte', badge: 'BEST', color: '#D2B48C' },
  { file: 'americano.png', name: 'Americano', badge: null, color: '#3B2F2F' },
  { file: 'white_americano.png', name: 'White Americano', badge: null, color: '#4A3B32' },
  { file: 'peanut_coldbrew.png', name: 'Peanut Cold Brew', badge: null, color: '#2C1D11' },
  { file: 'cafe_latte.png', name: 'Cafe Latte', badge: null, color: '#C49A45' },
  { file: 'cafe_mocha.png', name: 'Cafe Mocha', badge: null, color: '#4E3629' },
  { file: 'zero_vanilla.png', name: 'Zero Vanilla Latte', badge: 'NEW', color: '#EEDC82' },
  { file: 'matcha_cafe_latte.png', name: 'Matcha Cafe Latte', badge: null, color: '#556B2F' },
  { file: 'vanilla_bean_latte.png', name: 'Vanilla Bean Latte', badge: null, color: '#F3E5AB' },
  { file: 'cold_brew.png', name: 'Cold Brew', badge: null, color: '#1B1411' },
  { file: 'espresso.png', name: 'Espresso', badge: null, color: '#2B1B17' },
  { file: 'decaf_americano.png', name: 'Decaf Americano', badge: 'NEW', color: '#2E221F' },
  { file: 'decaf_latte.png', name: 'Decaf Latte', badge: null, color: '#A88B68' },
  { file: 'dolce_latte.png', name: 'Dolce Latte', badge: 'POPULAR', color: '#E8D5B7' },
  { file: 'dolce_coldbrew.png', name: 'Dolce Cold Brew', badge: null, color: '#3A271D' },
  { file: 'einspanner.png', name: 'Einspanner', badge: 'BEST', color: '#1F1511' },
  { file: 'caramel_macchiato.png', name: 'Caramel Macchiato', badge: null, color: '#C88B36' },
  { file: 'cinnamon_latte.png', name: 'Cinnamon Latte', badge: null, color: '#8A4A29' },
  { file: 'coldbrew_latte.png', name: 'Cold Brew Latte', badge: null, color: '#3A2A1E' },
  { file: 'cafe_citrus.png', name: 'Cafe Citrus', badge: 'NEW', color: '#F4A261' },
  { file: 'cafe_pieno.png', name: 'Cafe Pieno', badge: null, color: '#2B1A0E' },
  { file: 'ashatchu.png', name: 'Ashatchu Iced Tea', badge: 'BEST', color: '#8B4513' },
  { file: '1l_americano.png', name: '1L Americano', badge: 'POPULAR', color: '#1B120E' },
  { file: 'valrhona_choco.png', name: 'Valrhona Chocolate', badge: 'BEST', color: '#3E1C11' },
  { file: 'misutgaru_latte.png', name: 'Misutgaru Latte', badge: null, color: '#D4B886' },
  { file: 'shinemuscat_ade.png', name: 'Shine Muscat Ade', badge: 'NEW', color: '#A8DADC' },
  { file: 'hallabong_ade.png', name: 'Hallabong Ade', badge: null, color: '#F9844A' },
  { file: '1l_iced_tea.png', name: '1L Iced Tea', badge: null, color: '#E76F51' },
  { file: '1l_cafe_latte.png', name: '1L Cafe Latte', badge: null, color: '#C49A45' },
  { file: 'chamomile_tea.png', name: 'Chamomile Tea', badge: null, color: '#E9C46A' },
  { file: 'peppermint_tea.png', name: 'Peppermint Tea', badge: null, color: '#2A9D8F' },
  { file: 'yuja_grapefruit_tea.png', name: 'Yuja Grapefruit Tea', badge: null, color: '#F4A261' },
  { file: 'peach_oolong_tea.png', name: 'Peach Oolong Tea', badge: null, color: '#E76F51' },
  { file: 'milkshake_blended.png', name: 'Milkshake Blended', badge: null, color: '#F8F9FA' },
  { file: 'coconut_frappe.png', name: 'Coconut Frappe', badge: 'NEW', color: '#F1FAEE' },
  { file: 'pearl_salt_financier.png', name: 'Pearl Salt Financier', badge: 'BAKERY', color: '#D4A373' },
  { file: 'macadamia_financier.png', name: 'Macadamia Financier', badge: 'BAKERY', color: '#E9D8A6' },
  { file: 'honey_crispy_financier.png', name: 'Honey Crispy Financier', badge: 'BAKERY', color: '#FCBF49' },
  { file: 'earlgrey_financier.png', name: 'Earl Grey Financier', badge: 'BAKERY', color: '#A5A58D' },
  { file: 'fig_creamcheese_financier.png', name: 'Fig Cream Cheese Financier', badge: 'BAKERY', color: '#B5838D' },
  { file: 'salt_bread.png', name: 'Salt Bread', badge: 'POPULAR', color: '#F4A261' },
  { file: 'valrhona_cookie.png', name: 'Valrhona Levain Cookie', badge: 'BAKERY', color: '#6B705C' },
  { file: 'shallot_choco.png', name: 'Shallot Choco', badge: 'BEST', color: '#3D2314' },
  { file: 'strawberry_latte.png', name: 'Strawberry Latte', badge: 'BEST', color: '#E63946' },
  { file: 'mango_latte.png', name: 'Mango Latte', badge: null, color: '#FFB703' },
  { file: 'matcha_latte.png', name: 'Matcha Latte', badge: null, color: '#2A9D8F' },
  { file: 'earlgrey_vanilla_latte.png', name: 'Earl Grey Vanilla', badge: null, color: '#BC6C25' },
  { file: 'royal_milk_tea.png', name: 'Royal Milk Tea', badge: null, color: '#DDA15E' },
  { file: 'toffeenut_latte.png', name: 'Toffee Nut Latte', badge: null, color: '#A3B18A' },
  { file: 'sweet_potato_latte.png', name: 'Sweet Potato Latte', badge: null, color: '#9B5DE5' },
  { file: 'grapefruit_ade.png', name: 'Grapefruit Ade', badge: null, color: '#F72585' },
  { file: 'greengrape_ade.png', name: 'Green Grape Ade', badge: null, color: '#70E000' },
  { file: 'lemon_ade.png', name: 'Lemon Ade', badge: null, color: '#FFD166' },
  { file: 'double_choco_latte.png', name: 'Double Choco Latte', badge: null, color: '#2B1E1A' },
  { file: 'lemon_earlgrey_tea.png', name: 'Lemon Earl Grey Tea', badge: null, color: '#F4A261' },
  { file: 'strawberry_iced_tea.png', name: 'Strawberry Iced Tea', badge: null, color: '#E76F51' },
  { file: 'applemango_iced_tea.png', name: 'Apple Mango Iced Tea', badge: 'BEST', color: '#FCBF49' },
  { file: 'cup_bingsu.png', name: 'Cup Bingsu', badge: 'SEASONAL', color: '#8E9AAF' },
  { file: 'mint_choco_frappe.png', name: 'Mint Choco Frappe', badge: null, color: '#06D6A0' },
  { file: 'matcha_frappe.png', name: 'Matcha Frappe', badge: null, color: '#38B000' },
  { file: 'plain_smoothie.png', name: 'Plain Smoothie', badge: null, color: '#F8F9FA' },
  { file: 'greengrape_smoothie.png', name: 'Green Grape Smoothie', badge: null, color: '#9EF01A' },
  { file: 'strawberry_yogurt_smoothie.png', name: 'Strawberry Yogurt', badge: null, color: '#FF70A6' },
  { file: 'blueberry_yogurt_smoothie.png', name: 'Blueberry Yogurt', badge: null, color: '#7209B7' },
  { file: 'mango_banana_smoothie.png', name: 'Mango Banana Smoothie', badge: null, color: '#FFB703' },
  { file: 'choco_banana_smoothie.png', name: 'Choco Banana Smoothie', badge: null, color: '#6B705C' },
  { file: 'milk_shake.png', name: 'Milk Shake', badge: null, color: '#EDF2F4' },
  { file: 'coffee_shake.png', name: 'Coffee Shake', badge: null, color: '#B08968' },
  { file: 'choco_shake.png', name: 'Choco Shake', badge: null, color: '#582F0E' },
  { file: 'real_strawberry_juice.png', name: 'Real Strawberry Juice', badge: null, color: '#D90429' },
  { file: 'jeju_hojicha.png', name: 'Jeju Hojicha Tea', badge: null, color: '#7F5539' },
  { file: 'brownsugar_bubble_tea.png', name: 'Brown Sugar Bubble Tea', badge: 'BEST', color: '#3D2612' },
  { file: 'double_choco_bubble_tea.png', name: 'Double Choco Bubble Tea', badge: null, color: '#251605' },
  { file: 'matcha_bubble_tea.png', name: 'Matcha Bubble Tea', badge: null, color: '#4361EE' },
  { file: 'financier.png', name: 'Financier', badge: 'BAKERY', color: '#D4A373' },
  { file: 'scone.png', name: 'Scone', badge: 'BAKERY', color: '#FAEDCD' },
  { file: 'butter_tteok.png', name: 'Butter Rice Cake', badge: 'POPULAR', color: '#CCD5AE' },
  { file: 'canele.png', name: 'Canelé', badge: 'BAKERY', color: '#6A040F' },
  { file: 'biscotti.png', name: 'Biscotti', badge: 'BAKERY', color: '#E9D8A6' }
];

menuAssets.forEach(asset => {
  const filePath = path.join(__dirname, 'public/assets/menu', asset.file.replace('.png', '.svg'));
  const svgContent = svgTemplate(asset.name, asset.badge, asset.color);
  fs.writeFileSync(filePath, svgContent, 'utf-8');
});

// Create Brand Logo SVG
const logoSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="200" height="60">
  <path d="M 20 45 L 35 15 L 50 45 Z" fill="#0066CC"/>
  <text x="60" y="40" font-family="'Pretendard', sans-serif" font-size="24" font-weight="900" fill="#FFFFFF" letter-spacing="1">Blu Shaak</text>
</svg>
`;
fs.writeFileSync(path.join(__dirname, 'public/assets/logo.svg'), logoSvg, 'utf-8');

// Generate 4 Promotional Poster SVGs
const promoPosterSvg = (screenNum, title, subtitle, color) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="bgGrad${screenNum}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${color}"/>
      <stop offset="100%" stop-color="#001524"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#bgGrad${screenNum})"/>
  <circle cx="960" cy="540" r="400" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="60"/>
  <path d="M 960 250 L 1050 420 L 870 420 Z" fill="#0066CC" opacity="0.9"/>
  <text x="960" y="520" font-family="'Pretendard', sans-serif" font-size="80" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="2">SCREEN #${screenNum} - ${title}</text>
  <text x="960" y="600" font-family="'Pretendard', sans-serif" font-size="44" font-weight="700" fill="#FFD166" text-anchor="middle" letter-spacing="1">${subtitle}</text>
  <rect x="760" y="680" width="400" height="70" rx="35" fill="#0066CC"/>
  <text x="960" y="728" font-family="'Pretendard', sans-serif" font-size="28" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="2">SEASONAL SPECIAL CAMPAIGN</text>
</svg>
`;

const promoConfigs = [
  { num: 1, title: 'SIGNATURE SHAAK LATTE', sub: '시그니처 샥 라떼 & 피넛 라떼 포스터', color: '#002B49' },
  { num: 2, title: 'FRESH STRAWBERRY LATTE', sub: '설향 딸기 라떼 & 에이드 계절 포스터', color: '#0066CC' },
  { num: 3, title: 'SEASONAL TEA & CUP BINGSU', sub: '여름 컵빙수 & 애플망고 아이스티', color: '#004B87' },
  { num: 4, title: 'PREMIUM BAKERY DESSERT', sub: '갓 구운 휘낭시에 & 스콘 디저트 라인업', color: '#001A2C' }
];

promoConfigs.forEach(p => {
  const filePath = path.join(__dirname, `public/assets/promo/promo_screen_${p.num}.svg`);
  fs.writeFileSync(filePath, promoPosterSvg(p.num, p.title, p.sub, p.color), 'utf-8');
});

// Generate 4 synchronized MP4 videos using ffmpeg
console.log('🎥 Generating 4 synchronized 20-second MP4 video loops using ffmpeg...');

const generateVideo = (screenNum, title, bgHex) => {
  const videoPath = path.join(__dirname, `public/assets/video/promo_screen_${screenNum}.mp4`);
  
  if (fs.existsSync(videoPath)) {
    console.log(`- Video promo_screen_${screenNum}.mp4 already exists. Skipping.`);
    return;
  }

  // FFmpeg command generating a 20-second 1920x1080 video clip with moving colors/patterns
  const cmd = `ffmpeg -y -f lavfi -i testsrc=size=1920x1080:rate=30:duration=20 -vf "hue=h=${screenNum * 90}:s=1,drawtext=text='BLU SHAAK SCREEN ${screenNum} - ${title}':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=(h-text_h)/2-50,drawtext=text='SUMMER SIGNATURE CAMPAIGN':fontcolor=yellow:fontsize=40:x=(w-text_w)/2:y=(h-text_h)/2+40" -c:v libx264 -pix_fmt yuv420p "${videoPath}"`;

  try {
    console.log(`  Generating Screen ${screenNum} video...`);
    execSync(cmd, { stdio: 'ignore' });
    console.log(`  ✅ Screen ${screenNum} video generated successfully.`);
  } catch (err) {
    console.error(`  ❌ Failed to generate video for Screen ${screenNum}:`, err.message);
  }
};

generateVideo(1, 'SIGNATURE SHAAK LATTE', '#002B49');
generateVideo(2, 'FRESH BEVERAGE LINEUP', '#0066CC');
generateVideo(3, 'SEASONAL TEA & BLENDED', '#004B87');
generateVideo(4, 'PREMIUM BAKERY DESSERT', '#001A2C');

console.log('✨ All assets generated successfully!');
