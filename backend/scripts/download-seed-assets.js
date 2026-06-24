const fs = require('fs');
const path = require('path');
const https = require('https');

const root = path.join(__dirname, '..', '..');

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f5fb8"/>
      <stop offset="100%" stop-color="#137fec"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#brand)"/>
  <path d="M256 118c-46 0-82 36-82 82 0 26 13 49 32 61-19 12-32 35-32 61 0 46 36 82 82 82s82-36 82-82c0-26-13-49-32-61 19-12 32-35 32-61 0-46-36-82-82-82z" fill="#ffffff"/>
  <path d="M206 362c10 26 28 42 50 42s40-16 50-42" stroke="#ffffff" stroke-width="18" stroke-linecap="round"/>
</svg>`;

const downloads = [
  ['frontend/public/logo.svg', null, logoSvg],
  ['backend/uploads/clinic/logo.svg', null, logoSvg],
  [
    'frontend/public/images/hero-dental.jpg',
    'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=1400&h=1050&fit=crop&auto=format&q=85',
  ],
  [
    'frontend/public/images/login-bg.jpg',
    'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=1400&h=1800&fit=crop&auto=format&q=85',
  ],
  [
    'frontend/public/images/team-1.jpg',
    'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&auto=format&q=85',
  ],
  [
    'frontend/public/images/team-2.jpg',
    'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop&auto=format&q=85',
  ],
  [
    'frontend/public/images/team-3.jpg',
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&auto=format&q=85',
  ],
  [
    'backend/uploads/services/service-general.jpg',
    'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=900&h=675&fit=crop&auto=format&q=85',
  ],
  [
    'backend/uploads/services/service-cleaning.jpg',
    'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=900&h=675&fit=crop&auto=format&q=85',
  ],
  [
    'backend/uploads/services/service-whitening.jpg',
    'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=900&h=675&fit=crop&auto=format&q=85',
  ],
  [
    'backend/uploads/avatars/dentist-1.jpg',
    'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&h=600&fit=crop&auto=format&q=85',
  ],
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const request = (target) => {
      https
        .get(target, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            request(res.headers.location);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} for ${target}`));
            return;
          }
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        })
        .on('error', reject);
    };
    request(url);
  });
}

async function main() {
  for (const [relPath, url, inline] of downloads) {
    const filePath = path.join(root, relPath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    try {
      if (inline) {
        fs.writeFileSync(filePath, inline, 'utf8');
        console.log(`OK ${relPath} (svg)`);
        continue;
      }
      const data = await fetchUrl(url);
      if (data.length < 1024) {
        throw new Error('file too small');
      }
      fs.writeFileSync(filePath, data);
      console.log(`OK ${relPath} (${data.length} bytes)`);
    } catch (err) {
      console.error(`FAIL ${relPath}: ${err.message}`);
      process.exitCode = 1;
    }
  }
}

main();
