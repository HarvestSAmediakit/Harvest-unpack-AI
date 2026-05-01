const fs = require('fs');

try {
  let app = fs.readFileSync('src/App.tsx', 'utf-8');

  // The excised chunk was appended INSIDE CharacterCard, right before the FINAL `</div>\n  );\n}` of the file.
  // We can just find the LAST `</div>\n  );\n}` before the excised chunk.
  // Wait, no. The excised chunk starts at the <AnimatePresence> that has showSettings.
  
  const settingsMarker = '    <AnimatePresence>\n        {showSettings && (';
  let settingsIndex = app.indexOf(settingsMarker);
  
  if (settingsIndex === -1) {
    // try different indentation
    const altMarker = '<AnimatePresence>\n        {showSettings && (';
    settingsIndex = app.indexOf(altMarker);
  }
  if (settingsIndex === -1) {
    console.error("Could not find Settings Modal");
    const testSettings = app.indexOf('{showSettings && (');
    console.log("Found showSettings at:", testSettings);
    // Find the <AnimatePresence> before it
    settingsIndex = app.lastIndexOf('<AnimatePresence>', testSettings);
  }
  
  console.log("Settings index:", settingsIndex);
  
  // The excised chunk ends at the very end, just before `</div>\n  );\n}`.
  // Let's find the end of the file.
  const endMarker = '</div>\n  );\n}\n';
  let charCardEnd = app.lastIndexOf(endMarker);
  if (charCardEnd === -1) {
    charCardEnd = app.lastIndexOf('</div>\n  );\n}');
  }
  
  console.log("CharCard end:", charCardEnd);
  
  // The excised chunk is from settingsIndex to charCardEnd
  const excisedChunk = app.substring(settingsIndex, charCardEnd);
  
  console.log("Extracted chunk length:", excisedChunk.length);
  
  // Now we remove it from there.
  app = app.substring(0, settingsIndex) + app.substring(charCardEnd);
  
  // Now where does it belong?
  // Right after the header!
  const headerMarker = '</header>';
  const headerIndex = app.indexOf(headerMarker) + headerMarker.length;
  
  console.log("Header end index:", headerIndex);
  
  // We insert it right after the header
  app = app.substring(0, headerIndex) + '\n\n' + excisedChunk + '\n' + app.substring(headerIndex);
  
  fs.writeFileSync('src/App.tsx', app);
  console.log("Fixed App.tsx successfully!");
} catch(e) {
  console.error("Error:", e);
}
