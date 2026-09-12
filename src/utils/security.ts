export function sanitizeHomeKitName(value: string): string {
  const cleaned = value.replace(/[^\p{L}\p{N} ._'()-]/gu, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned.slice(0, 64) : 'SofaBaton Activity';
}
