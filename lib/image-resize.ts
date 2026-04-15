/**
 * Client-side image resizing via canvas — no external deps.
 * Used by profile avatars, broadcast avatars/covers, and post images.
 */

/** Center-crop to a square then encode as JPEG. */
export async function resizeToSquareJpeg(
  file: File,
  size = 512,
  quality = 0.85,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const min = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - min) / 2;
  const sy = (bitmap.height - min) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, sx, sy, min, min, 0, 0, size, size);
  bitmap.close();

  return canvasToBlob(canvas, quality);
}

/** Fit into a fixed aspect-ratio box, center-crop if the input is off-ratio. */
export async function resizeToAspectJpeg(
  file: File,
  targetWidth: number,
  targetHeight: number,
  quality = 0.85,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const inputAspect = bitmap.width / bitmap.height;
  const targetAspect = targetWidth / targetHeight;

  let sx = 0;
  let sy = 0;
  let sw = bitmap.width;
  let sh = bitmap.height;
  if (inputAspect > targetAspect) {
    sw = bitmap.height * targetAspect;
    sx = (bitmap.width - sw) / 2;
  } else if (inputAspect < targetAspect) {
    sh = bitmap.width / targetAspect;
    sy = (bitmap.height - sh) / 2;
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  return canvasToBlob(canvas, quality);
}

/**
 * Preserve aspect ratio, but scale down so the longest edge is at most
 * `maxEdge`. Used for post images where we don't want to crop.
 */
export async function resizeToMaxEdgeJpeg(
  file: File,
  maxEdge = 1080,
  quality = 0.85,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return canvasToBlob(canvas, quality);
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to encode image"))),
      "image/jpeg",
      quality,
    );
  });
}
