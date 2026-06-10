// V3: enhanced hover
// TODO: performance testing, expand to more  sites, save hovered/clicked URLs for popup window history

// Robust regex looking for https:// or www., excluding whitespace, quotes, backticks, angle brackets, and asterisks
const urlRegex = /(https?:\/\/[^\s"'`<>*]+|www\.[^\s"'`<>*]+)/g;

// TODO: add console log & non-intrusive notification if valid/active PR page, currently uses badge on icon
function isCodeAwarePage() {
  const keywords = ['/pull/', '/commit/', '/blob/', '/changes/'];
  return keywords.some(keyword => window.location.href.includes(keyword));
}

// Global function to extract the full line of text beneath the mouse
function getFullLineUnderMouse(event) {
  // 1. Grab the element directly under the user's cursor
  const element = document.elementFromPoint(event.clientX, event.clientY);
  if (!element) return null;

  // 2a. Check if we're hovering over a textarea (code blob pages)
  const textareaElement = element.closest('textarea');
  if (textareaElement) {
    // Extract the line of text at the cursor position within the textarea
    const textContent = textareaElement.value;
    if (!textContent) return null;

    const lines = textContent.split('\n');

    // Calculate which line is under the cursor using scroll and element positioning
    const rect = textareaElement.getBoundingClientRect();
    const relativeY = event.clientY - rect.top;
    const lineHeight = parseInt(window.getComputedStyle(textareaElement).lineHeight);
    const scrollTop = textareaElement.scrollTop;

    const lineNumber = Math.floor((relativeY + scrollTop) / lineHeight);
    const line = lines[lineNumber] || '';

    return {
      element: textareaElement,
      text: line
    };
  }

  // 2b. Walk up to find the closest code container line used in GitHub diff pages
  // This targets JSON arrays, split diff layouts, and unified diff rows safely.
  const codeLineContainer = element.closest([
    'td',
    'span',
    '.blob-code-inner',
    '.react-file-line-composition',
    '[data-targets="react-diff-viewer.lines"]'
  ].join(','));

  if (!codeLineContainer) return null;

  // 3. Return both the row container element and its flat, unbroken text content
  return {
    element: codeLineContainer,
    text: codeLineContainer.textContent || ""
  };
}

// Helper function to apply highlight styles
function applyHighlight(element) {
  element.style.setProperty('cursor', 'pointer', 'important');
  element.style.setProperty('color', '#ff6b00', 'important');
  element.style.setProperty('text-decoration', 'underline', 'important');
  element.style.setProperty('text-decoration-color', '#ff6b00', 'important');
}

// Helper function to remove highlight styles
function removeHighlight(element) {
  element.style.removeProperty('cursor');
  element.style.removeProperty('color');
  element.style.removeProperty('text-decoration');
  element.style.removeProperty('text-decoration-color');
}

// 1. Global Mouse Tracking: Detect URLs anywhere on the page
document.addEventListener('mousemove', (event) => {
  if (!isCodeAwarePage()) return;

  const targetLine = getFullLineUnderMouse(event);

  // TODO: better edge detection of URLs, starting with http:// or www., ending with quote or *, brackets, etc.
  // removing * & /* from path when navigating to go to base URL, not highlighting entire commented line or tag with <a href="url">, etc.
  if (targetLine && urlRegex.test(targetLine.text)) {
    applyHighlight(targetLine.element);
  }
});

// 2. Reset mechanism when moving away from elements
document.addEventListener('mouseout', (event) => {
  const codeLineContainer = event.target.closest('td, span, .blob-code-inner, .react-file-line-composition');
  if (codeLineContainer) {
    removeHighlight(codeLineContainer);
  }
});

// 3. Global Click Capture
document.addEventListener('click', (event) => {
  if (!isCodeAwarePage()) return;

  const targetLine = getFullLineUnderMouse(event);
  if (!targetLine) return;

  // If they clicked an actual real HTML link GitHub generated, let it follow native behavior
  if (event.target.closest('a')) return;

  urlRegex.lastIndex = 0; // Reset state
  const matches = targetLine.text.match(urlRegex);

  if (matches && matches.length > 0) {
    let destination = matches[0]; // Isolate the first matched URL string

    // Clean up trailing characters commonly found in code syntax (like quotes or commas)
    destination = destination.replace(/["',;}\)]+$/, '');

    // Format protocol if it's a naked www string
    if (destination.startsWith('www.')) {
      destination = `https://${destination}`;
    }

    // Open target website securely in a new panel
    window.open(destination, '_blank', 'noopener,noreferrer');

    // Kill GitHub's click router to prevent code collapse actions
    event.preventDefault();
    event.stopPropagation();
  }
}, true); // The 'true' flag captures the click event before GitHub sweeps it away



