// SPDX-License-Identifier: MPL-2.0
import { it, expect } from 'vitest';
import {
  defaultConfig,
  exportConfigPart,
  importConfig,
} from '../../packages/config/src/index';
import { HtmlAdapter } from '../../packages/dom/src/index';
import { TranslationKernel } from '../../packages/core/src/index';
import { ProviderRouter } from '../../packages/provider-api/src/index';
it('imports independent versioned configuration parts and redacts credentials', () => {
  const config = structuredClone(defaultConfig);
  config.providers[0].apiKey = 'private';
  config.rules = [{ match: ['*'], root: ['main'] }];
  for (const part of ['providers', 'rules', 'actions'] as const) {
    const text = exportConfigPart(config, part);
    expect(text).not.toContain('private');
    const restored = importConfig(JSON.parse(text), defaultConfig);
    expect(restored[part]).toEqual(JSON.parse(text)[part]);
  }
  expect(() =>
    importConfig({ schemaVersion: 1, rules: [], actions: [] }, defaultConfig),
  ).toThrow();
});
it('handles mutations while the first provider batch is pending and fully disposes anchors', async () => {
  document.body.innerHTML = '<main><p>First original paragraph.</p></main>';
  const adapter = new HtmlAdapter(document);
  const router = new ProviderRouter({ primary: 'slow', retries: 0 });
  router.register({
    id: 'slow',
    name: 'Slow test',
    async translate(segments) {
      await new Promise((r) => setTimeout(r, 150));
      return segments.map((s) => ({ id: s.id, text: 'Translated ' + s.text }));
    },
  });
  const kernel = new TranslationKernel(adapter, router, {
    targetLanguage: 'zh',
  });
  const first = kernel.translate();
  document
    .querySelector('main')!
    .insertAdjacentHTML('beforeend', '<p>Second pending paragraph.</p>');
  await first;
  await new Promise((r) => setTimeout(r, 250));
  expect(document.querySelectorAll('[data-tk-translation]')).toHaveLength(2);
  kernel.dispose();
  expect(adapter.anchors.size).toBe(0);
  expect(document.querySelectorAll('[data-tk-translation]')).toHaveLength(0);
  document.body.replaceChildren();
});
