const fs = require('fs');
const files = [
  'src/App.tsx',
  'src/services/geminiService.ts',
  'src/services/openaiService.ts',
  'src/services/audioIdentityService.ts',
  'src/hooks/useLiveRadio.ts',
  'src/utils/db.ts'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/DigiMag Podcasts AI/g, 'PressPlay AI Podcasts');
    content = content.replace(/DigiMag/g, 'PressPlay');
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
