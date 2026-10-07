// SPDX-License-Identifier: MPL-2.0
export const API_VERSION = 1 as const;
export type RenderMode = 'original' | 'translation' | 'bilingual';
export interface DocumentNode {
  id: string;
  type: 'document' | 'block' | 'segment';
  text?: string;
  children?: DocumentNode[];
  metadata?: Record<string, unknown>;
}
export interface TranslationSegment {
  id: string;
  text: string;
  sourceLanguage?: string;
}
export interface TranslationResult {
  id: string;
  text: string;
  provider?: string;
}
export interface TranslationContext {
  targetLanguage: string;
  sourceLanguage?: string;
  title?: string;
  url?: string;
  previousSegment?: string;
  nextSegment?: string;
  documentLanguage?: string;
}
export interface TranslationOptions {
  signal?: AbortSignal;
}
export interface ExportDocument {
  url: string;
  title: string;
  sourceLanguage: string;
  targetLanguage: string;
  segments: { id: string; source: string; translation?: string }[];
}
export function segmentsOf(node: DocumentNode): TranslationSegment[] {
  const result: TranslationSegment[] = [];
  const walk = (n: DocumentNode) => {
    if (n.type === 'segment' && n.text) result.push({ id: n.id, text: n.text });
    n.children?.forEach(walk);
  };
  walk(node);
  if (new Set(result.map((s) => s.id)).size !== result.length)
    throw new Error('Duplicate segment ID');
  return result;
}
export function boundedContext(
  context: TranslationContext,
): TranslationContext {
  return {
    ...context,
    title: context.title?.slice(0, 256),
    url: context.url?.slice(0, 2048),
    previousSegment: context.previousSegment?.slice(0, 512),
    nextSegment: context.nextSegment?.slice(0, 512),
  };
}
export function abortError(): DOMException {
  return new DOMException('Translation cancelled', 'AbortError');
}
