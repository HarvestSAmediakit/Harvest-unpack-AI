const fs = require('fs');
const files = [
  'src/services/geminiService.ts',
  'src/services/aiEngine.ts',
  'src/services/audioIdentityService.ts',
  'src/services/aiRouter.ts',
  'src/hooks/useLiveRadio.ts',
  'src/App.tsx',
  'server.ts'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/gemini-2\.0-flash/g, 'gemini-3-flash-preview');
    content = content.replace(/gemini-2\.5-flash/g, 'gemini-3-flash-preview');
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
