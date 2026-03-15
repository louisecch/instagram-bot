/**
 * Patches instauto's like-button selector after every `yarn install`.
 *
 * Fix 1: Click the post link before waiting for the dialog (was missing),
 *         and use svg[aria-label="Like"] directly instead of section-based search.
 *
 * Fix 2: Add a 2-second wait before scanning for post links so Instagram's
 *         SPA has time to render the post grid after navigation.
 */
const fs = require('node:fs');
const path = require('node:path');

const filePath = path.join(__dirname, '..', 'node_modules', 'instauto', 'dist', 'index.js');
let src = fs.readFileSync(filePath, 'utf8');

let changed = false;

// Fix 1 — add image.click(), drop section search, use svg[aria-label="Like"] directly
const oldSelector = `const section = [...dialog.querySelectorAll('section')].find((s) => s.querySelectorAll('*[aria-label="Like"]')[0] && s.querySelectorAll('*[aria-label="Comment"]')[0]);
            if (!section)
                throw new Error('Like button section not found');
            const likeButtonChild = section.querySelectorAll('*[aria-label="Like"]')[0];
            if (!likeButtonChild)
                throw new Error('Like button not found (aria-label)');`;

// The patched form already in node_modules (intermediate state)
const intermediateSelector = `const section = [...dialog.querySelectorAll('section')].find((s) => s.querySelectorAll('*[aria-label="Like"]')[0] && s.querySelectorAll('*[aria-label="Comment"]')[0]);
            const likeButtonChild = section
                ? section.querySelectorAll('*[aria-label="Like"]')[0]
                : dialog.querySelector('[aria-label="Like"]');
            if (!likeButtonChild)
                throw new Error('Like button not found (aria-label)');`;

const newSelector = `// Find the Like SVG directly — works regardless of DOM nesting
            const likeButtonChild = dialog.querySelector('svg[aria-label="Like"]');
            if (!likeButtonChild)
                throw new Error('Like button not found (svg[aria-label="Like"])');`;

// Old loop header (no click)
const oldLoopHeader = `window.instautoLog(\`Clicking post: \${image.href}\`);
            await window.instautoSleep(3000);`;

const newLoopHeader = `window.instautoLog(\`Clicking post: \${image.href}\`);
            image.click?.();
            await window.instautoSleep(3000);`;

// Apply selector fix (handle both original and intermediate forms)
if (src.includes(oldSelector)) {
  src = src.replace(oldSelector, newSelector);
  changed = true;
  console.log('[patch-instauto] ✓ Applied Fix 1a: svg like-button selector (from original)');
} else if (src.includes(intermediateSelector)) {
  src = src.replace(intermediateSelector, newSelector);
  changed = true;
  console.log('[patch-instauto] ✓ Applied Fix 1a: svg like-button selector (from intermediate)');
} else if (src.includes(newSelector)) {
  console.log('[patch-instauto] Fix 1a already applied, skipping');
} else {
  console.warn('[patch-instauto] ⚠ Could not locate Fix 1a target — instauto may have updated');
}

// Apply click fix
if (src.includes(oldLoopHeader) && !src.includes(newLoopHeader)) {
  src = src.replace(oldLoopHeader, newLoopHeader);
  changed = true;
  console.log('[patch-instauto] ✓ Applied Fix 1b: image.click() before sleep');
} else if (src.includes(newLoopHeader)) {
  console.log('[patch-instauto] Fix 1b already applied, skipping');
} else {
  console.warn('[patch-instauto] ⚠ Could not locate Fix 1b target — instauto may have updated');
}

// Fix 2 — 2-second sleep + link count log before scanning post links
const oldScan = String.raw`const allImages = [...document.getElementsByTagName('a')].filter((el) => typeof el.href === 'string' && /instagram.com\/p\//.test(el.href));`;
const newScan = `await window.instautoSleep(2000);
        const allImages = [...document.getElementsByTagName('a')].filter((el) => typeof el.href === 'string' && /instagram\\.com\\/[^/]+\\/p\\//.test(el.href));
        window.instautoLog(\`Found \${allImages.length} post link(s) on profile\`);`;

if (src.includes(oldScan)) {
  src = src.replace(oldScan, newScan);
  changed = true;
  console.log('[patch-instauto] ✓ Applied Fix 2: SPA render wait + link count log');
} else if (src.includes(newScan)) {
  console.log('[patch-instauto] Fix 2 already applied, skipping');
} else {
  console.warn('[patch-instauto] ⚠ Could not locate Fix 2 target — instauto may have updated');
}

if (changed) {
  fs.writeFileSync(filePath, src, 'utf8');
  console.log('[patch-instauto] Patch written successfully');
}
