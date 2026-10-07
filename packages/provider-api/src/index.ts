// SPDX-License-Identifier: MPL-2.0
import {
  abortError,
  boundedContext,
  type TranslationContext,
  type TranslationOptions,
  type TranslationResult,
  type TranslationSegment,
} from '../../shared/src/index';
export interface TranslationProvider {
  readonly id: string;
  readonly name: string;
  translate(
    segments: TranslationSegment[],
    context: TranslationContext,
    options?: TranslationOptions,
  ): Promise<TranslationResult[]>;
}
export function validateResults(
  segments: TranslationSegment[],
  results: TranslationResult[],
): void {
  if (!Array.isArray(results) || results.length !== segments.length)
    throw new Error('Provider returned an incomplete batch');
  const ids = new Set(segments.map((s) => s.id));
  for (const result of results) {
    if (
      !result ||
      !ids.delete(result.id) ||
      typeof result.text !== 'string' ||
      !result.text.trim() ||
      result.text.length > 32000
    )
      throw new Error('Invalid provider result');
  }
}
export interface RouterOptions {
  primary: string;
  fallback?: string;
  timeoutMs?: number;
  retries?: number;
  batchSize?: number;
}
export class ProviderRouter {
  private providers = new Map<string, TranslationProvider>();
  private health = new Map<
    string,
    { failures: number; lastSuccess?: number }
  >();
  constructor(private options: RouterOptions) {}
  register(provider: TranslationProvider): () => void {
    if (this.providers.has(provider.id))
      throw new Error('Provider already registered');
    this.providers.set(provider.id, provider);
    return () => this.providers.delete(provider.id);
  }
  getHealth(id: string) {
    return { ...(this.health.get(id) ?? { failures: 0 }) };
  }
  async translate(
    segment: TranslationSegment,
    context: TranslationContext,
    options: TranslationOptions = {},
  ): Promise<TranslationResult> {
    return (await this.translateBatch([segment], context, options))[0];
  }
  async translateBatch(
    segments: TranslationSegment[],
    context: TranslationContext,
    options: TranslationOptions = {},
  ): Promise<TranslationResult[]> {
    const output: TranslationResult[] = [];
    const size = Math.max(1, Math.min(64, this.options.batchSize ?? 16));
    for (let start = 0; start < segments.length; start += size)
      output.push(
        ...(await this.route(
          segments.slice(start, start + size),
          boundedContext(context),
          options,
        )),
      );
    return output;
  }
  private async route(
    segments: TranslationSegment[],
    context: TranslationContext,
    options: TranslationOptions,
  ): Promise<TranslationResult[]> {
    let last: unknown = new Error('No provider configured');
    for (const id of [
      ...new Set(
        [this.options.primary, this.options.fallback].filter(
          (x): x is string => !!x,
        ),
      ),
    ]) {
      const provider = this.providers.get(id);
      if (!provider) continue;
      for (
        let attempt = 0;
        attempt <= Math.min(3, this.options.retries ?? 1);
        attempt++
      ) {
        if (options.signal?.aborted) throw abortError();
        const controller = new AbortController();
        const cancel = () => controller.abort();
        options.signal?.addEventListener('abort', cancel, { once: true });
        let timer: ReturnType<typeof setTimeout> | undefined;
        let onAbort: () => void = () => {};
        try {
          const interruption = new Promise<never>((_, reject) => {
            onAbort = () =>
              reject(
                options.signal?.aborted
                  ? abortError()
                  : new Error('Provider timeout'),
              );
            controller.signal.addEventListener('abort', onAbort, {
              once: true,
            });
            timer = setTimeout(
              () => controller.abort(),
              this.options.timeoutMs ?? 20000,
            );
          });
          const results = await Promise.race([
            provider.translate(segments, context, {
              signal: controller.signal,
            }),
            interruption,
          ]);
          validateResults(segments, results);
          this.health.set(id, { failures: 0, lastSuccess: Date.now() });
          return results.map((r) => ({ ...r, provider: id }));
        } catch (error) {
          if (options.signal?.aborted) throw abortError();
          last = error;
          this.health.set(id, {
            ...this.getHealth(id),
            failures: this.getHealth(id).failures + 1,
          });
        } finally {
          clearTimeout(timer);
          options.signal?.removeEventListener('abort', cancel);
          controller.signal.removeEventListener('abort', onAbort);
        }
      }
    }
    throw last;
  }
}
