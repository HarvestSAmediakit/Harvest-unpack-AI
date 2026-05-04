const fs = require('fs');
const files = [
  'index.html',
  'server.ts',
  'public/manifest.json'
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
