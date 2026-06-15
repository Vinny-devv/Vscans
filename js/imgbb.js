/**
 * imgbb.js
 * Handles image uploads to ImgBB API.
 * Returns the hosted URL for each uploaded image.
 */

import { IMGBB_API_KEY } from "./firebase-config.js";

const IMGBB_ENDPOINT = "https://api.imgbb.com/1/upload";

/**
 * Upload a single File object to ImgBB.
 *
 * @param {File} file          - The image file to upload
 * @param {Function} onProgress - Optional (percent: number) => void callback
 * @returns {Promise<string>}  - Resolves with the hosted image URL
 */
export async function uploadToImgBB(file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("key", IMGBB_API_KEY);
    formData.append("image", file);

    const xhr = new XMLHttpRequest();

    // Track upload progress if a callback was provided
    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
    }

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.success) {
            resolve(data.data.url);
          } else {
            reject(new Error("ImgBB upload failed: " + (data.error?.message || "Unknown error")));
          }
        } catch {
          reject(new Error("Failed to parse ImgBB response."));
        }
      } else {
        reject(new Error(`ImgBB HTTP error: ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error during image upload.")));
    xhr.addEventListener("abort", () => reject(new Error("Image upload aborted.")));

    xhr.open("POST", IMGBB_ENDPOINT);
    xhr.send(formData);
  });
}

/**
 * Upload multiple files to ImgBB sequentially.
 * Shows per-file progress via the progressEl element.
 *
 * @param {FileList|File[]} files
 * @param {HTMLElement|null} progressEl  - Element to update with status text
 * @returns {Promise<string[]>}  - Array of hosted image URLs in order
 */
export async function uploadManyToImgBB(files, progressEl) {
  const urls = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];

    if (progressEl) {
      progressEl.textContent = `Uploading image ${i + 1} of ${total}: ${file.name}…`;
    }

    try {
      const url = await uploadToImgBB(file, (pct) => {
        if (progressEl) {
          progressEl.textContent = `Uploading image ${i + 1} of ${total} (${pct}%)…`;
        }
      });
      urls.push(url);
    } catch (err) {
      console.error(`Failed to upload ${file.name}:`, err);
      throw new Error(`Failed to upload "${file.name}": ${err.message}`);
    }
  }

  if (progressEl) {
    progressEl.textContent = `All ${total} images uploaded successfully!`;
  }

  return urls;
}
