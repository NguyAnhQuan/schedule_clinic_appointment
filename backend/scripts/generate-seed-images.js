const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');

const files = {
  'frontend/public/images/hero-dental.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#dbeafe"/>
      <stop offset="100%" stop-color="#eff6ff"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="900" fill="url(#bg)"/>
  <circle cx="980" cy="160" r="120" fill="#137fec" opacity="0.12"/>
  <circle cx="180" cy="760" r="160" fill="#137fec" opacity="0.1"/>
  <rect x="220" y="180" width="760" height="520" rx="36" fill="#ffffff" stroke="#cbd5e1"/>
  <rect x="280" y="250" width="300" height="380" rx="24" fill="#137fec" opacity="0.12"/>
  <rect x="620" y="250" width="300" height="120" rx="18" fill="#e2e8f0"/>
  <rect x="620" y="400" width="300" height="90" rx="18" fill="#e2e8f0"/>
  <rect x="620" y="530" width="300" height="100" rx="18" fill="#e2e8f0"/>
  <path d="M410 360c-28 0-50 22-50 50 0 16 8 30 20 38-12 8-20 22-20 38 0 28 22 50 50 50s50-22 50-50c0-16-8-30-20-38 12-8 20-22 20-38 0-28-22-50-50-50z" fill="#137fec"/>
  <text x="600" y="820" text-anchor="middle" fill="#64748b" font-family="Arial,sans-serif" font-size="28">Phòng khám nha khoa hiện đại</text>
</svg>`,
  'frontend/public/images/login-bg.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1600" fill="none">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f5fb8"/>
      <stop offset="100%" stop-color="#137fec"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="1600" fill="url(#g)"/>
  <circle cx="200" cy="300" r="180" fill="#ffffff" opacity="0.08"/>
  <circle cx="1000" cy="1300" r="240" fill="#ffffff" opacity="0.06"/>
  <path d="M600 520c-70 0-126 56-126 126 0 40 20 76 50 96-30 20-50 56-50 96 0 70 56 126 126 126s126-56 126-126c0-40-20-76-50-96 30-20 50-56 50-96 0-70-56-126-126-126z" fill="#ffffff" opacity="0.9"/>
</svg>`,
  'frontend/public/images/team-1.svg': avatarSvg('#137fec', 'BS'),
  'frontend/public/images/team-2.svg': avatarSvg('#0ea5e9', 'BS'),
  'frontend/public/images/team-3.svg': avatarSvg('#14b8a6', 'YT'),
  'backend/uploads/services/service-general.svg': serviceSvg('#137fec', 'Khám tổng quát'),
  'backend/uploads/services/service-cleaning.svg': serviceSvg('#0ea5e9', 'Cạo vôi'),
  'backend/uploads/services/service-whitening.svg': serviceSvg('#8b5cf6', 'Tẩy trắng'),
  'backend/uploads/avatars/dentist-1.svg': avatarSvg('#137fec', 'NA'),
  'backend/uploads/clinic/logo.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <rect width="120" height="120" rx="24" fill="#137fec"/>
  <path d="M60 22c-8 0-14 6-14 14 0 4 2 8 5 10-3 2-5 6-5 10 0 8 6 14 14 14s14-6 14-14c0-4-2-8-5-10 3-2 5-6 5-10 0-8-6-14-14-14z" fill="white"/>
  <path d="M48 78c2 6 6 10 12 10s10-4 12-10" stroke="white" stroke-width="4" stroke-linecap="round"/>
</svg>`,
};

function avatarSvg(color, text) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
  <rect width="200" height="200" fill="${color}"/>
  <circle cx="100" cy="78" r="42" fill="#ffffff" opacity="0.92"/>
  <ellipse cx="100" cy="168" rx="58" ry="44" fill="#ffffff" opacity="0.92"/>
  <text x="100" y="108" text-anchor="middle" fill="${color}" font-family="Arial,sans-serif" font-size="34" font-weight="700">${text}</text>
</svg>`;
}

function serviceSvg(color, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" fill="none">
  <rect width="800" height="600" fill="#f8fafc"/>
  <rect x="40" y="40" width="720" height="520" rx="28" fill="${color}" opacity="0.12"/>
  <path d="M400 180c-48 0-86 38-86 86 0 28 14 52 36 66-22 14-36 38-36 66 0 48 38 86 86 86s86-38 86-86c0-28-14-52-36-66 22-14 36-38 36-66 0-48-38-86-86-86z" fill="${color}"/>
  <text x="400" y="500" text-anchor="middle" fill="#334155" font-family="Arial,sans-serif" font-size="36" font-weight="700">${label}</text>
</svg>`;
}

for (const [relPath, content] of Object.entries(files)) {
  const filePath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Wrote ${relPath}`);
}
