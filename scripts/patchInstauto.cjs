/* eslint-disable @typescript-eslint/no-require-imports */
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

// Fix 1 — rewrite the per-post loop body:
//   - add image.click() before sleeping
//   - use svg[aria-label="Like"].closest('[role="button"]') to click the right element
//   - add logging at every step
//   - simplify close button the same way

const oldLoopBody = `window.instautoLog(\`Clicking post: \${image.href}\`);
            await window.instautoSleep(3000);
            const dialog = document.querySelector('*[role=dialog]');
            if (!dialog)
                throw new Error('Dialog not found');
            const section = [...dialog.querySelectorAll('section')].find((s) => s.querySelectorAll('*[aria-label="Like"]')[0] && s.querySelectorAll('*[aria-label="Comment"]')[0]);
            if (!section)
                throw new Error('Like button section not found');
            const likeButtonChild = section.querySelectorAll('*[aria-label="Like"]')[0];
            if (!likeButtonChild)
                throw new Error('Like button not found (aria-label)');`;

const newLoopBody = `window.instautoLog(\`Clicking post: \${image.href}\`);
            image.click?.();
            await window.instautoSleep(3000);
            const dialog = document.querySelector('*[role=dialog]');
            window.instautoLog(dialog ? 'Dialog found' : 'Dialog NOT found');
            if (!dialog)
                throw new Error('Dialog not found');
            // Find the Like SVG then walk up to its role="button" wrapper
            const likeSvg = dialog.querySelector('svg[aria-label="Like"]');
            window.instautoLog(likeSvg ? 'Found Like SVG' : 'Like SVG NOT found in dialog');
            if (!likeSvg)
                throw new Error('Like SVG not found (svg[aria-label="Like"])');
            const likeButton = likeSvg.closest('[role="button"]');
            window.instautoLog(likeButton ? 'Found Like role=button parent' : 'Like role=button parent NOT found');
            if (!likeButton)
                throw new Error('Like button (role=button parent) not found');`;

if (src.includes(oldLoopBody)) {
  src = src.replace(oldLoopBody, newLoopBody);
  changed = true;
  console.log('[patch-instauto] ✓ Applied Fix 1: like loop body rewrite');
} else if (src.includes(newLoopBody)) {
  console.log('[patch-instauto] Fix 1 already applied, skipping');
} else {
  console.warn('[patch-instauto] ⚠ Could not locate Fix 1 target — instauto may have updated');
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
