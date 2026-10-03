/**
 * Compress images (and rasterize large photos) before upload to save storage.
 * PDFs are left as-is but size-capped; images are resized + JPEG-compressed.
 */

export type CompressOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0–1 for JPEG/WebP
  maxBytes?: number;
};

const DEFAULTS: Required<CompressOptions> = {
  maxWidth: 1280,
  maxHeight: 1280,
  quality: 0.72,
  maxBytes: 900_000, // ~900 KB
};

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      type,
      quality,
    );
  });
}

/** Compress a File/Blob. Non-images (e.g. PDF resume) pass through if under maxBytes. */
export async function compressUploadFile(
  file: File,
  opts: CompressOptions = {},
): Promise<File> {
  const cfg = { ...DEFAULTS, ...opts };
  const isImage = file.type.startsWith('image/');

  if (!isImage) {
    if (file.size <= cfg.maxBytes) return file;
    throw new Error(
      `File is too large (${Math.round(file.size / 1024)} KB). Max ${Math.round(cfg.maxBytes / 1024)} KB. Compress or use a smaller file.`,
    );
  }

  try {
    const img = await loadImage(file);
    let { width, height } = img;
    const scale = Math.min(1, cfg.maxWidth / width, cfg.maxHeight / height);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    let quality = cfg.quality;
    let blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    // Progressive quality drop until under maxBytes
    while (blob.size > cfg.maxBytes && quality > 0.35) {
      quality -= 0.08;
      blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    }

    const name = file.name.replace(/\.\w+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}

/** Quick data-URL compress for avatars stored in profile. */
export async function compressImageToDataUrl(
  file: File,
  maxEdge = 512,
  quality = 0.7,
): Promise<string> {
  const compressed = await compressUploadFile(file, {
    maxWidth: maxEdge,
    maxHeight: maxEdge,
    quality,
    maxBytes: 400_000,
  });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(compressed);
  });
}
