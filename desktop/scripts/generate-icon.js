const fs = require('fs');
const path = require('path');

// SVG Icon definition
const svgContent = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="115" fill="#121316"/>
  <rect x="8" y="8" width="496" height="496" rx="107" stroke="#2A2C36" stroke-width="8"/>
  <circle cx="256" cy="256" r="180" fill="url(#glow)" opacity="0.4"/>
  
  <!-- Outer Shield -->
  <path d="M256 70L416 150V270C416 366 339 432 256 450C173 432 96 366 96 270V150L256 70Z" fill="#1A1B20" stroke="#E83D63" stroke-width="16" stroke-linejoin="round"/>
  
  <!-- Inner Shield -->
  <path d="M256 120L370 178V264C370 335 315 385 256 400C197 385 142 335 142 264V178L256 120Z" fill="#121316"/>
  
  <!-- Crest Diamond Emblems -->
  <polygon points="256,160 330,256 256,352 182,256" fill="#E83D63"/>
  <polygon points="256,196 300,256 256,316 212,256" fill="#38BDF8"/>
  <circle cx="256" cy="256" r="22" fill="#FFFFFF"/>
  
  <defs>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#E83D63" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#E83D63" stop-opacity="0"/>
    </radialGradient>
  </defs>
</svg>
`;

const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

fs.writeFileSync(path.join(assetsDir, 'icon.svg'), svgContent.trim());
console.log('Generated assets/icon.svg successfully');
