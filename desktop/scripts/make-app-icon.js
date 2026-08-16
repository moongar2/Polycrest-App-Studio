const fs = require('fs');
const path = require('path');

const logoPngBase64 = fs.readFileSync(
  path.join(__dirname, '..', 'assets', 'polycrest-logo.png')
).toString('base64');

const svgContent = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <radialGradient id="bgGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#E83D63" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#121316" stop-opacity="0"/>
    </radialGradient>
  </defs>
  
  <!-- Sleek rounded squircle background -->
  <rect width="512" height="512" rx="112" fill="#121316"/>
  <rect x="8" y="8" width="496" height="496" rx="104" stroke="#2A2C36" stroke-width="6"/>
  <rect x="14" y="14" width="484" height="484" rx="98" fill="url(#bgGlow)"/>
  
  <!-- Centered Official Logo -->
  <image href="data:image/png;base64,${logoPngBase64}" xlink:href="data:image/png;base64,${logoPngBase64}" x="76" y="76" width="360" height="360" />
</svg>`;

const assetsDir = path.join(__dirname, '..', 'assets');
fs.writeFileSync(path.join(assetsDir, 'icon.svg'), svgContent);
console.log('Written desktop/assets/icon.svg');
