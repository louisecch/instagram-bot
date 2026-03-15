/**
 * Patched replacement for instauto's likeCurrentUserImagesPageCode.
 *
 * Fix: Instagram no longer wraps the action bar in a <section> element.
 * The original code required a <section> with both [aria-label="Like"] and
 * [aria-label="Comment"] inside the dialog, which fails on the current DOM.
 * This version falls back to querying [aria-label="Like"] anywhere in the
 * dialog when no matching <section> is found.
 *
 * This function is serialised and run inside the browser via page.evaluate(),
 * so it must be entirely self-contained — no imports, no Node.js APIs.
 */
// eslint-disable-next-line import/prefer-default-export
export async function patchedLikeCurrentUserImagesPageCode({
  dryRun: dryRunIn,
  likeImagesMin,
  likeImagesMax,
  shouldLikeMedia: shouldLikeMediaIn,
}) {
  /* eslint-disable no-undef */

  // Give Instagram's SPA time to render the post grid after navigation.
  await window.instautoSleep(2000);

  const allImages = [...document.getElementsByTagName("a")].filter(
    (el) =>
      typeof el.href === "string" && /instagram.com\/p\//.test(el.href),
  );
  window.instautoLog(`Found ${allImages.length} post link(s) on profile`);

  function shuffleArray(arrayIn) {
    const array = [...arrayIn];
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = array[i];
      if (temp === undefined || array[j] === undefined) {
        throw new Error("Invalid shuffle index");
      }
      array[i] = array[j]; // eslint-disable-line no-param-reassign
      array[j] = temp; // eslint-disable-line no-param-reassign
    }
    return array;
  }

  const imagesShuffled = shuffleArray(allImages);
  const numImagesToLike = Math.floor(
    Math.random() * (likeImagesMax + 1 - likeImagesMin) + likeImagesMin,
  );
  window.instautoLog(`Liking ${numImagesToLike} image(s)`);
  const images = imagesShuffled.slice(0, numImagesToLike);

  if (images.length === 0) {
    window.instautoLog("No images to like");
    return;
  }

  for (const image of images) {
    image.click?.();
    await window.instautoSleep(3000);

    const dialog = document.querySelector("*[role=dialog]");
    if (!dialog) throw new Error("Dialog not found");

    // Try the original section-based approach first (backward compat),
    // then fall back to finding the Like button anywhere in the dialog.
    const section = [...dialog.querySelectorAll("section")].find(
      (s) =>
        s.querySelectorAll('*[aria-label="Like"]')[0] &&
        s.querySelectorAll('*[aria-label="Comment"]')[0],
    );
    const likeButtonChild = section
      ? section.querySelectorAll('*[aria-label="Like"]')[0]
      : dialog.querySelector('[aria-label="Like"]');

    if (!likeButtonChild) throw new Error("Like button not found (aria-label)");

    function findClickableParent(el) {
      let elAt = el ?? undefined;
      while (elAt) {
        if ("click" in elAt && typeof elAt.click === "function") return elAt;
        elAt = elAt.parentElement ?? undefined;
      }
      return undefined;
    }

    const foundClickable = findClickableParent(likeButtonChild);
    if (!foundClickable) throw new Error("Like button not found");

    const instautoLog2 = window.instautoLog;

    function likeImage() {
      const dialogResolved = dialog;
      if (!dialogResolved) throw new Error("Dialog not found");

      if (
        shouldLikeMediaIn !== null &&
        typeof shouldLikeMediaIn === "function"
      ) {
        const presentation = dialogResolved.querySelector(
          "article[role=presentation]",
        );
        if (!presentation) {
          instautoLog2("Presentation element not found");
          return;
        }
        const img = presentation.querySelector('img[alt^="Photo by "]');
        const video = presentation.querySelector('video[type="video/mp4"]');
        const menuItem = presentation.querySelector("[role=menuitem] h2 ~ div");
        const mediaDesc = menuItem?.textContent ?? "";
        let mediaType = "unknown";
        let src;
        let alt;
        let poster;
        if (img) {
          mediaType = "image";
          src = img.src;
          alt = img.alt;
        } else if (video) {
          mediaType = "video";
          poster = video.poster;
          src = video.src;
        } else {
          instautoLog2("Could not determine mediaType");
        }
        if (!shouldLikeMediaIn({ mediaType, mediaDesc, src, alt, poster })) {
          instautoLog2(
            `shouldLikeMedia returned false for ${image.href}, skipping`,
          );
          return;
        }
      }

      foundClickable?.click?.();
      if (image.href) window.instautoOnImageLiked(image.href);
    }

    if (!dryRunIn) likeImage();

    await window.instautoSleep(3000);

    const closeButtonChild = document.querySelector('svg[aria-label="Close"]');
    if (!closeButtonChild)
      throw new Error("Close button not found (aria-label)");
    const closeButton = findClickableParent(closeButtonChild);
    if (!closeButton) throw new Error("Close button not found");
    closeButton?.click?.();

    await window.instautoSleep(5000);
  }

  window.instautoLog("Done liking images");
  /* eslint-enable no-undef */
}
