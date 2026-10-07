// SPDX-License-Identifier: MPL-2.0
import type { DocumentAdapter } from '../../adapter-api/src/index';
import { ActionRegistry } from '../../action-api/src/index';
import { EventBus } from '../../event-api/src/index';
import { ProviderRouter } from '../../provider-api/src/index';
import {
  segmentsOf,
  type DocumentNode,
  type TranslationContext,
  type TranslationResult,
  type RenderMode,
  type ExportDocument,
} from '../../shared/src/index';
import { TranslationCache } from './cache';
export { TranslationCache };
export class TranslationKernel {
  readonly events = new EventBus();
  readonly actions = new ActionRegistry();
  private controller?: AbortController;
  private unsubscribe?: () => void;
  private document?: DocumentNode;
  private results = new Map<string, TranslationResult>();
  private revision = 0;
  private queue: Promise<void> = Promise.resolve();
  constructor(
    private adapter: DocumentAdapter,
    private router: ProviderRouter,
    private context: TranslationContext,
    private mode: RenderMode = 'bilingual',
    private placement: 'below' | 'inline' = 'below',
    private cache = new TranslationCache(),
  ) {}
  getSegments() {
    return this.document
      ? segmentsOf(this.document).map((s) => ({
          ...s,
          translation: this.results.get(s.id)?.text,
        }))
      : [];
  }
  exportDocument(): ExportDocument {
    return {
      url: this.context.url ?? '',
      title: this.context.title ?? '',
      sourceLanguage: this.context.sourceLanguage ?? 'auto',
      targetLanguage: this.context.targetLanguage,
      segments: this.getSegments().map((s) => ({
        id: s.id,
        source: s.text,
        translation: s.translation,
      })),
    };
  }
  async translate(): Promise<void> {
    this.stop();
    const controller = new AbortController();
    this.controller = controller;
    const revision = ++this.revision;
    const document = this.adapter.read();
    this.events.emit('document.detected', document);
    this.unsubscribe = this.adapter.observe?.((document) => {
      this.events.emit('document.changed', document);
      this.queue = this.queue
        .catch(() => {})
        .then(() => this.execute(document, controller, revision))
        .catch(() => {});
    });
    const initial = this.execute(document, controller, revision);
    this.queue = initial.catch(() => {});
    await initial;
  }
  private async execute(
    document: DocumentNode,
    controller: AbortController,
    revision: number,
  ): Promise<void> {
    if (controller.signal.aborted || revision !== this.revision) return;
    this.document = document;
    const segments = segmentsOf(document);
    const current = new Set(segments.map((s) => s.id));
    for (const id of this.results.keys())
      if (!current.has(id)) this.results.delete(id);
    const missing = segments.filter((s) => !this.results.has(s.id));
    if (!missing.length) return;
    this.events.emit('translation.started', { count: missing.length });
    let translated = 0;
    let failed = false;
    try {
      for (let offset = 0; offset < missing.length; offset += 16) {
        if (controller.signal.aborted) break;
        const batch = missing.slice(offset, offset + 16);
        const requests = [];
        const cached: TranslationResult[] = [];
        for (const segment of batch) {
          this.events.emit('segment.detected', segment);
          this.events.emit('segment.translation.started', segment);
          const text = this.cache.get(this.cacheKey(segment.text));
          if (text) cached.push({ id: segment.id, text });
          else requests.push(segment);
        }
        try {
          const results = [
            ...cached,
            ...(await this.router.translateBatch(requests, this.context, {
              signal: controller.signal,
            })),
          ];
          if (controller.signal.aborted || revision !== this.revision) break;
          for (const result of results) {
            this.results.set(result.id, result);
            this.cache.set(
              this.cacheKey(batch.find((s) => s.id === result.id)!.text),
              result.text,
            );
            translated++;
            this.events.emit('segment.translated', result);
          }
          this.adapter.render(results, this.mode, this.placement);
        } catch (error) {
          if (controller.signal.aborted) break;
          failed = true;
          batch.forEach((s) =>
            this.events.emit('segment.translation.failed', {
              id: s.id,
              error: error instanceof Error ? error.message : 'Provider failed',
            }),
          );
          throw error;
        }
      }
    } finally {
      if (controller.signal.aborted)
        this.events.emit('translation.cancelled', { count: translated });
      else if (!failed)
        this.events.emit('translation.completed', { count: translated });
    }
  }
  private cacheKey(text: string): string {
    return JSON.stringify([this.context, text]);
  }
  setMode(mode: RenderMode): void {
    this.mode = mode;
    this.adapter.render([...this.results.values()], mode, this.placement);
  }
  stop(): void {
    this.controller?.abort();
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }
  restore(): void {
    this.stop();
    this.revision++;
    this.adapter.restore();
    this.results.clear();
    this.document = undefined;
  }
  dispose(): void {
    this.restore();
    this.cache.clear();
    this.events.clear();
    this.adapter.dispose?.();
  }
}
