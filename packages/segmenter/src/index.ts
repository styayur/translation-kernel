// SPDX-License-Identifier: MPL-2.0
export function detectLanguage(text: string): string {
  if (/[\u3040-\u30ff]/u.test(text)) return 'ja';
  if (/[\uac00-\ud7af]/u.test(text)) return 'ko';
  if (/[\u3400-\u9fff]/u.test(text)) return 'zh';
  if (/[\u0400-\u04ff]/u.test(text)) return 'ru';
  if (/[\u0600-\u06ff]/u.test(text)) return 'ar';
  return 'und';
}
export function isTranslatable(text: string): boolean {
  return (
    text.trim().length >= 2 &&
    /\p{L}/u.test(text) &&
    !/^(?:https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.)\S+$/u.test(text.trim())
  );
}
export function segmentText(text: string, maxLength = 1200): string[] {
  if (maxLength < 16) throw new Error('Segment limit must be at least 16');
  const normalized = text.replace(/\s+/gu, ' ').trim();
  if (!isTranslatable(normalized)) return [];
  const result: string[] = [];
  const sentences = [
    ...new Intl.Segmenter(undefined, { granularity: 'sentence' }).segment(
      normalized,
    ),
  ].map((s) => s.segment);
  let buffer = '';
  for (const sentence of sentences) {
    if (buffer.length + sentence.length > maxLength && buffer) {
      result.push(buffer.trim());
      buffer = '';
    }
    const chars = Array.from(sentence);
    while (chars.length && chars.join('').length > maxLength) {
      let piece = '';
      while (
        chars.length &&
        piece.length + (chars[0]?.length ?? 0) <= maxLength
      )
        piece += chars.shift();
      result.push(piece.trim());
    }
    buffer += chars.join('');
  }
  if (buffer.trim()) result.push(buffer.trim());
  return result;
}
