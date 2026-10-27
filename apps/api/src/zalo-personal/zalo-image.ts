const IMAGE_URL_KEYS = ['url', 'href', 'thumb', 'thumbnail', 'imageUrl', 'photoUrl', 'fullUrl', 'originUrl'];

function isImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol)
      && (/\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(url.pathname) || url.hostname.endsWith('.zdn.vn'));
  } catch {
    return false;
  }
}

export function getZaloImageUrl(value: unknown, depth = 0): string | null {
  if (depth > 4 || value == null) return null;
  if (typeof value === 'string') return isImageUrl(value.trim()) ? value.trim() : null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const url = getZaloImageUrl(item, depth + 1);
      if (url) return url;
    }
    return null;
  }
  if (typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  for (const key of IMAGE_URL_KEYS) {
    const url = getZaloImageUrl(record[key], depth + 1);
    if (url) return url;
  }
  for (const key of ['attachments', 'photo', 'image', 'data']) {
    const url = getZaloImageUrl(record[key], depth + 1);
    if (url) return url;
  }
  return null;
}

export function isZaloImageMessage(messageType: unknown, content: unknown): boolean {
  const type = String(messageType ?? '').toLowerCase();
  return type.includes('photo') || type.includes('image') || Boolean(getZaloImageUrl(content));
}
