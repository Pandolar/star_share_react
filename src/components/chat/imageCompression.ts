export async function compressImageFile(
  file: File,
  options: { max_edge: number; quality: number; max_compressed_mb: number }
): Promise<File> {
  if (!file.type.startsWith('image/') || !document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp'))
    return file;
  let bitmap: ImageBitmap | HTMLImageElement | null = null;
  let objectUrl = '';
  try {
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      objectUrl = URL.createObjectURL(file);
      bitmap = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('图片无法解析'));
        image.src = objectUrl;
      });
    }
    let edge = options.max_edge;
    let quality = options.quality;
    let smallest: Blob | null = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const sourceWidth = bitmap!.width;
      const sourceHeight = bitmap!.height;
      const scale = Math.min(1, edge / Math.max(sourceWidth, sourceHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) return file;
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality / 100));
      if (!blob) return file;
      smallest = blob;
      if (blob.size <= options.max_compressed_mb * 1024 * 1024) break;
      edge = Math.max(1, Math.round(edge * 0.85));
      quality = Math.max(1, quality - 8);
    }
    if (!smallest) return file;
    const name = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([smallest], `${name}.webp`, { type: 'image/webp', lastModified: file.lastModified });
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if (bitmap && 'close' in bitmap) bitmap.close();
  }
}
