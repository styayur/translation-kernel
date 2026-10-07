// SPDX-License-Identifier: MPL-2.0
import type { TranslationKernel } from '../../../packages/core/src/index';
// These are data projections, not clients. No network, sync, database or account logic.
export function exportJson(kernel: TranslationKernel): string {
  return JSON.stringify(kernel.exportDocument(), null, 2);
}
export function ankiRows(kernel: TranslationKernel): [string, string][] {
  return kernel
    .getSegments()
    .filter((s) => s.translation)
    .map((s) => [s.text, s.translation!]);
}
export function archiveboxEnvelope(kernel: TranslationKernel) {
  const d = kernel.exportDocument();
  return { url: d.url, title: d.title, translationDocument: d };
}
export function dictionaryQuery(text: string): { text: string } {
  return { text: text.slice(0, 2000) };
}
