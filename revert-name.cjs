const fs = require('fs');
const files = [
  'src/App.tsx',
  'src/services/geminiService.ts',
  'src/services/openaiService.ts',
  'src/services/audioIdentityService.ts',
  'src/hooks/useLiveRadio.ts',
  'src/utils/db.ts',
  'index.html',
  'server.ts',
  'public/manifest.json',
  'metadata.json'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/PressPlay AI Podcasts/g, 'DigiMag Podcasts AI');
    content = content.replace(/PressPlay/g, 'DigiMag');
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
