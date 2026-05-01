const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

// #1a1a1a is black text in light mode. Change to pure white #FFFFFF
app = app.replace(/text-\[\#1a1a1a\]/gi, 'text-white');
app = app.replace(/bg-\[\#1a1a1a\]/gi, 'bg-white');
app = app.replace(/border-\[\#1a1a1a\]/gi, 'border-white');

// #5A5A40 was the harvest olive (brand accent). Change to electric cyan
app = app.replace(/\[\#5A5A40\]/gi, '[#00E5FF]');

// #f5f5f0 was light sand. Change to Surface/Card #181818
app = app.replace(/\[\#f5f5f0\]/gi, '[#181818]');

// bg-white was for cards. Change to #181818
// Be careful not to replace something like text-white (we already replaced above but that's text-)
// Also replace bg-white, but bg-white/something is fine as an overlay.
// Actually, `bg-white ` followed by a space or quote:
app = app.replace(/bg-white(\s|")/g, 'bg-[#181818]$1');

// Other specific changes for Spotify aesthetics:
// - border-dashed border-white/10 etc... it should just work.
// - Drop shadows might need tweaking but can be handled later.

fs.writeFileSync('src/App.tsx', app);
console.log('App.tsx transformed successfully');
