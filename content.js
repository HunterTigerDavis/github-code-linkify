// V0.6: Match real URLs including browser scheme URLs like chrome://extensions/ while excluding file names and version labels
console.log("Debug: Content script loaded");
// Matches: https://example.com, www.example.com, gitlab.com/example, chrome://extensions/
// Excludes: V0.4, plan.md, plan.txt
const urlRegex = /([a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s"'`<>]+|www\.[^\s"'`<>]+|(?<![A-Za-z0-9])(?:[a-z0-9-]+\.)+(?:com|org|net|io|dev|app|edu|gov|info|ai|co|uk|us|ca|ly|me|biz|tv|de|fr|nl|jp|au|in|cn|xyz|online|shop|pro)(?:[/?#][^\s"'`<>]*)?)/gi;

function normalizeUrlDestination(rawUrl) {
  let destination = rawUrl.trim().replace(/["',;}\)\]]+$/, '');
  if (!destination) return '';

  // Simplified wildcard handling:
  // - remove leading "*." from domain prefixes like *.github.com
  // - stop at the first wildcard in the path, so config patterns never open as invalid URLs
  destination = destination.replace(/^\*\./, '');

  const wildcardIndex = destination.indexOf('*');
  if (wildcardIndex !== -1) {
    destination = destination.slice(0, wildcardIndex);
  }

  // Preserve already-absolute URLs exactly as written, including browser schemes like chrome://
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(destination)) {
    return destination;
  }

  // Treat valid host-like values as their own absolute URL instead of a relative path.
  // This excludes file names like plan.md and plan.txt.
  if (/^(?:[a-z0-9-]+\.)+(?:com|org|net|io|dev|app|edu|gov|info|ai|co|xyz|us|uk|ca|ly|me|biz|tv|de|fr|nl|jp|au|in|cn|online|shop|pro)(?:[/:?#].*)?$/i.test(destination)) {
    return `https://${destination}`;
  }

  // Support common bare www form.
  if (destination.startsWith('www.')) {
    return `https://${destination}`;
  }

  // Keep non-host text as-is so it doesn't accidentally resolve against the current repo URL.
  return destination;
}

// Create a unique global Highlight object for our extension [1, 3]
const urlHighlight = new Highlight();
CSS.highlights.set("ext-url-highlight", urlHighlight);[1, 3]

// Inject a tiny stylesheet dynamically to color only our highlighted ranges
const style = document.createElement('style');
style.textContent = `
  ::highlight(ext-url-highlight) {
    color: #ff6b00 !important;
    text-decoration: underline !important;
    font-weight: bold !important;
  }
`;
document.head.appendChild(style);

async function getCodeAwareSettings() {
  const settings = await ExtensionSettings.readSettings();
  return ExtensionSettings.normalizeSettings(settings);
}

// TODO: add console log & non-intrusive notification if valid/active PR page, currently uses badge on icon
async function isCodeAwarePage() {
  const settings = await getCodeAwareSettings();
  const awareBaseUrls = settings.awareBaseUrls.length
    ? settings.awareBaseUrls
    : ExtensionSettings.DEFAULT_AWARE_BASE_URLS;
  const awareKeywords = settings.awareKeywords.length
    ? settings.awareKeywords
    : ExtensionSettings.DEFAULT_AWARE_KEYWORDS;
  let isCodeAware = false;

  if (settings.enableBaseUrlCheck) {
    isCodeAware = isCodeAware || awareBaseUrls.some((host) => window.location.href.includes(host));
  }

  if (settings.enableKeywordCheck) {
    isCodeAware = isCodeAware || awareKeywords.some((keyword) => window.location.href.includes(keyword));
  }

  console.log('Page URL:', window.location.href, 'Is codeAware page:', isCodeAware, 'settings:', settings);
  return isCodeAware;
}

// Scan text nodes under `root` and add highlights for all URL matches
function highlightUrlsInTextNodes(root = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
  const added = [];
  let node;
  while ((node = walker.nextNode())) {
    const text = node.nodeValue || '';
    const positions = findUrlPositions(text);
    positions.forEach(pos => {
      try {
        const range = document.createRange();
        range.setStart(node, pos.start);
        range.setEnd(node, pos.end);
        urlHighlight.add(range);
        added.push({ node, pos });
      } catch (e) {
        // ignore nodes that cannot be ranged
      }
    });
  }
  return added;
}

// Global function to find the exact text node and character index under the cursor
function getCharIndexUnderMouse(event) {
  // Use modern caretPositionFromPoint or caretRangeFromPoint to pinpoint the text node [4]
  let range;
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(event.clientX, event.clientY);[4]
  } else if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(event.clientX, event.clientY);
    if (position) {
      range = document.createRange();
      range.setStart(position.offsetNode, position.offset);
      range.setEnd(position.offsetNode, position.offset);
    }
  }

  if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) return null;

  // FIX: Access parentElement because text nodes do not support .closest()
  const parentElement = range.startContainer.parentElement;
  if (!parentElement) return null;

  // Extended selectors to support README paragraphs, code blocks, markdown content, and various GitHub layouts
  const container = parentElement.closest('td, span, p, li, div, .blob-code-inner, .react-file-line-composition, code, pre');
  if (!container) return null;

  return {
    textNode: range.startContainer,
    offset: range.startOffset,
    container: container
  };
}

// 1. Global Mouse Tracking: Highlight ONLY the URL text range under the cursor
document.addEventListener('mousemove', async (event) => {
  if (!(await isCodeAwarePage())) {
    urlHighlight.clear();[2]
    return;
  }

  const pointInfo = getCharIndexUnderMouse(event);
  if (!pointInfo) {
    urlHighlight.clear();[2]
    return;
  }

  const textNode = pointInfo.textNode;
  const nodeText = textNode.nodeValue || "";

  urlRegex.lastIndex = 0;
  let match;
  let foundMatch = false;

  // Scan all URLs in this immediate text fragment to see if the mouse is directly over one
  while ((match = urlRegex.exec(nodeText)) !== null) {
    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;

    // Is the user's cursor character index mathematically inside the URL string boundary?
    if (pointInfo.offset >= matchStart && pointInfo.offset <= matchEnd) {
      console.log('Found URL match:', match[0], 'at', matchStart, matchEnd, 'in container:', pointInfo.container);
      urlHighlight.clear();[2] // Reset previous highlights

      // Create a virtual text selection range exactly over the URL [2]
      const highlightRange = document.createRange();
      highlightRange.setStart(textNode, matchStart);
      highlightRange.setEnd(textNode, matchEnd);

      // Add the range to our orange CSS highlight register [1, 2]
      urlHighlight.add(highlightRange);[2]
      pointInfo.container.style.setProperty('cursor', 'pointer', 'important');
      foundMatch = true;
      break;
    }
  }

  // Clear highlight if mouse moves away from the URL string
  if (!foundMatch) {
    console.log('No URL under cursor — clearing highlight');
    urlHighlight.clear();[2]
    pointInfo.container.style.removeProperty('cursor');
  }
});

// 2. Global Click Capture
document.addEventListener('click', async (event) => {
  console.log('Click event detected');
  if (!(await isCodeAwarePage())) return;

  const pointInfo = getCharIndexUnderMouse(event);
  if (!pointInfo) return;

  if (event.target.closest('a')) return;

  const textNode = pointInfo.textNode;
  const nodeText = textNode.nodeValue || "";

  urlRegex.lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(nodeText)) !== null) {
    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;

    if (pointInfo.offset >= matchStart && pointInfo.offset <= matchEnd) {
      console.log('Click - URL matches:', match[0]);
      const destination = normalizeUrlDestination(match[0]);

      if (!destination) {
        break;
      }

      saveUrlToStorage(destination);
      window.open(destination, '_blank', 'noopener,noreferrer');

      event.preventDefault();
      event.stopPropagation();
      break;
    }
  }
}, true);

// Fixed Helper Function: Uses message passing to bypass content script environment limits
function saveUrlToStorage(url) {
  try {
    chrome.runtime.sendMessage({ action: "saveUrl", url: url });
  } catch (error) {
    console.error("Extension pipeline disconnected:", error);
  }
}

console.log("Debug: Content script initialized");

