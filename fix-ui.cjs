const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Remove font-serif everywhere just to be purely sans (Figtree)
app = app.replace(/font-serif/g, 'font-sans');

// 2. Main layout bg should be Spotify bg (#121212)
app = app.replace(/bg-\[\#181818\]( text-white font-sans selection:bg-\[\#00E5FF\])/g, 'bg-[#121212]$1');

// 3. Header bg update
app = app.replace(/bg-white\/50 backdrop-blur-md sticky/g, 'bg-[#121212]/90 backdrop-blur-xl sticky');

// 4. Update the active Tab button color (it's currently text-black because it was bg-white originally)
// But my previous script might have left text-black. Let's make it text-white.
app = app.replace(/text-black/g, 'text-white');

// 5. Let's make the "square cards with soft corners"
// We'll replace rounded-[32px], rounded-[24px], rounded-[40px] with rounded-lg or rounded-xl
app = app.replace(/rounded-\[32px\]/g, 'rounded-xl');
app = app.replace(/rounded-\[24px\]/g, 'rounded-xl');
app = app.replace(/rounded-\[40px\]/g, 'rounded-2xl');

// 6. Make progress bars use the accent color. We have "bg-[#00E5FF]" but let's make sure the background of the progress bar is darker
// Let's locate the audio player. It probably had a progress bar.

// Look for some specific classes:
// "bg-[#181818]/20" -> "bg-[#181818]"
app = app.replace(/bg-\[\#181818\]\/20/g, 'bg-[#181818]');

// bg-white/20 -> bg-white/5 for subtle player background
app = app.replace(/bg-white\/20/g, 'bg-white/5');

// text-[#181818]/X from previous f5f5f0 replacements... wait, f5f5f0 was light sand. 
// If it got replaced with #181818 for text, it'll look dark on dark.
// Let's replace text-[#181818] with text-[#B3B3B3]
app = app.replace(/text-\[\#181818\]/g, 'text-[#B3B3B3]');

// Let's check text opacity like text-white/40 -> text-[#B3B3B3]
app = app.replace(/text-white\/40/g, 'text-[#B3B3B3]');
app = app.replace(/text-white\/60/g, 'text-[#B3B3B3]');

fs.writeFileSync('src/App.tsx', app);
console.log('App.tsx UI fixes applied');
