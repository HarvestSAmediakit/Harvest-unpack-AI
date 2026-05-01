export async function scrapeUrl(url: string): Promise<string> {
  try {
    // We use allorigins as a CORS proxy
    const response = await fetch(
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }
    const data = await response.json();
    const html = data.contents;

    // Simple HTML to text extraction (since this runs in browser)
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Remove scripts, styles, etc.
    const scripts = doc.querySelectorAll(
      "script, style, nav, footer, header, iframe, noscript",
    );
    scripts.forEach((s) => s.remove());

    // Attempt spatial sorting for in5 magazines or absolute positioned layouts
    const textNodes: { text: string; top: number; left: number }[] = [];

    // Helper to get raw coordinates from style strings, fallback to 0
    const parseCoord = (styleString: string | null, prop: "left" | "top") => {
      if (!styleString) return 0;
      const regex = new RegExp(`${prop}\\s*:\\s*([0-9.-]+)px`, "i");
      const match = styleString.match(regex);
      return match ? parseFloat(match[1]) : 0;
    };

    // If it's an in5 magazine or has lots of span/divs with absolute positioning
    const elements = doc.querySelectorAll(
      "div, span, p, h1, h2, h3, h4, h5, h6",
    );
    let hasAbsolutePositioning = false;

    elements.forEach((el) => {
      const style = el.getAttribute("style");
      if (style && /position\s*:\s*absolute/i.test(style)) {
        hasAbsolutePositioning = true;
      }
    });

    if (hasAbsolutePositioning) {
      // Collect leaf elements (elements with mostly text directly inside)
      elements.forEach((el) => {
        // Only get elements that have actual direct text content, ignoring children elements
        // or we can simply get elements with text, but we must avoid duplicating text from parents.
        // A simple heuristic: if it has absolute positioning and text content.
        if (!el.children.length && el.textContent?.trim()) {
          const style = el.getAttribute("style") || "";
          const top = parseCoord(style, "top");
          const left = parseCoord(style, "left");

          // If parent has absolute positioning and we don't, we might inherit parent's top/left
          // but parsing the DOM deeply can be complex. We'll use the element's or its closest absolute parent's top/left.
          let resolvedTop = top;
          let resolvedLeft = left;

          if (!/position\s*:\s*absolute/i.test(style)) {
            const absParent = el.closest('[style*="position: absolute"]');
            if (absParent) {
              const pStyle = absParent.getAttribute("style") || "";
              resolvedTop = parseCoord(pStyle, "top");
              resolvedLeft = parseCoord(pStyle, "left");
            }
          }

          textNodes.push({
            text: el.textContent.trim(),
            top: resolvedTop,
            left: resolvedLeft,
          });
        }
      });

      // Sort spatially: primarily by top (with a tolerance for line heights), then by left
      const Y_TOLERANCE = 10; // Assume elements within 10px vertically are on the same line
      textNodes.sort((a, b) => {
        if (Math.abs(a.top - b.top) <= Y_TOLERANCE) {
          return a.left - b.left;
        }
        return a.top - b.top;
      });

      let text = textNodes.map((node) => node.text).join(" ");
      // Clean up excessive whitespace
      text = text.replace(/\s+/g, " ").trim();
      return text;
    } else {
      // Standard flow extraction
      let text = doc.body.textContent || "";
      // Clean up excessive whitespace
      text = text.replace(/\s+/g, " ").trim();

      return text;
    }
  } catch (error) {
    console.error("Scraping error:", error);
    throw error;
  }
}
