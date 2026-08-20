// Convert an image File/Blob into a downscaled JPEG data URL, so it can be
// stored directly in IndexedDB and travel with JSON backups / GitHub sync
// without needing a server or external hosting.
export function imageFileToDataUrl(file: File | Blob, max = 480, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Not an image file'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas not supported'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      // PNG for images with transparency, JPEG otherwise (much smaller).
      const hasAlpha = /png|gif|webp/i.test(file.type);
      resolve(canvas.toDataURL(hasAlpha ? 'image/png' : 'image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image'));
    };
    img.src = url;
  });
}

/** Pull the first image out of a paste/drop DataTransfer, if any. */
export function extractImageFile(dt: DataTransfer | null): File | null {
  if (!dt) return null;
  if (dt.files && dt.files.length) {
    for (const f of Array.from(dt.files)) {
      if (f.type.startsWith('image/')) return f;
    }
  }
  if (dt.items && dt.items.length) {
    for (const it of Array.from(dt.items)) {
      if (it.kind === 'file' && it.type.startsWith('image/')) {
        const f = it.getAsFile();
        if (f) return f;
      }
    }
  }
  return null;
}
