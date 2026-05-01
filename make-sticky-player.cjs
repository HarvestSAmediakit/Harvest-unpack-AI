const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

// The player starts at `{/* Audio Player */}` and ends with `<audio ... />` and `</motion.section>`.
const playerStart = app.indexOf('{/* Audio Player */}');
if (playerStart > -1) {
  const playerEnd = app.indexOf('</motion.section>', playerStart) + '</motion.section>'.length;
  // wait we need to include the AnimatePresence around it
  const animateStart = app.lastIndexOf('<AnimatePresence>', playerStart);
  let animateEnd = app.indexOf('</AnimatePresence>', playerEnd);
  if (animateEnd > -1) {
    animateEnd += '</AnimatePresence>'.length;
    let playerCode = app.substring(animateStart, animateEnd);
    
    // We want to move this code just before the final `</div>` of the main div.
    // The main div ends right before `return (` ... wait.
    app = app.substring(0, animateStart) + app.substring(animateEnd);
    
    // Make the player sticky:
    // We'll replace the motion.section className.
    playerCode = playerCode.replace(/className="relative [^"]+"/, `className="fixed bottom-0 left-0 right-0 z-50 bg-[#181818] border-t border-white/5 text-white flex items-center justify-between px-6 py-3 shadow-2xl backdrop-blur-xl"`);
    // And remove the gradient:
    playerCode = playerCode.replace(/<div className="absolute inset-0 bg-gradient-to-br[^>]+><\/div>/, '');
    playerCode = playerCode.replace(/<div className="absolute inset-0 bg-gradient-to-br[^>]+\/>/, '');
    
    // Now we need to append the player at the very end of the app.
    const lastDiv = app.lastIndexOf('</div>');
    app = app.substring(0, lastDiv) + playerCode + "\n" + app.substring(lastDiv);
    
    // Add pb-24 to the main content container to account for the sticky player
    // The main container is after the Header
    app = app.replace(/<main className="max-w-5xl mx-auto px-6 py-12">/, '<main className="max-w-5xl mx-auto px-6 py-12 pb-32">');

    fs.writeFileSync('src/App.tsx', app);
    console.log('Player made sticky');
  } else {
    console.log('Could not find </AnimatePresence>');
  }
} else {
  console.log('Could not find {/* Audio Player */}');
}
