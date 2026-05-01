const { createRequire } = require("module");
const requireLocal = createRequire(__filename);
try {
  const pdf = requireLocal("pdf-parse");
  console.log("pdf type:", typeof pdf);
  console.log("pdf keys:", Object.keys(pdf));
  if (typeof pdf !== "function") {
    console.log("pdf.default type:", typeof pdf.default);
  }
} catch (e) {
  console.error(e);
}
