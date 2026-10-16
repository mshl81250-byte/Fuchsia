export const MAX_PRODUCT_IMAGES = 8;
const MAX_IMAGE_URL_LENGTH = 2000;

export function normalizeProductImageList(value: unknown): string {
  let parsed: unknown;
  if (Array.isArray(value)) {
    parsed = value;
  } else if (typeof value === "string") {
    try { parsed = JSON.parse(value); } catch { throw new Error("حقل images يجب أن يكون قائمة JSON صحيحة"); }
  } else {
    throw new Error("حقل images يجب أن يكون قائمة صور");
  }
  if (!Array.isArray(parsed)) throw new Error("حقل images يجب أن يكون قائمة صور");
  if (parsed.length > MAX_PRODUCT_IMAGES) throw new Error(`يمكن إضافة ${MAX_PRODUCT_IMAGES} صور كحد أقصى للمنتج`);

  const urls = parsed.map((item) => {
    if (typeof item !== "string") throw new Error("روابط الصور يجب أن تكون نصوصًا");
    const url = item.trim();
    if (!url || url.length > MAX_IMAGE_URL_LENGTH) throw new Error("رابط الصورة غير صالح");
    try {
      const parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("unsupported protocol");
    } catch { throw new Error("رابط الصورة يجب أن يكون HTTP أو HTTPS"); }
    return url;
  });
  return JSON.stringify([...new Set(urls)]);
}
