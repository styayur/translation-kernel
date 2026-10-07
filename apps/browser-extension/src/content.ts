// SPDX-License-Identifier: GPL-3.0-or-later
import { HtmlAdapter } from '../../../packages/dom/src/index';
import { TranslationKernel } from '../../../packages/core/src/index';
import { ProviderRouter } from '../../../packages/provider-api/src/index';
import type { KernelConfig } from '../../../packages/config/src/index';
import type { RenderMode } from '../../../packages/shared/src/index';
declare global {
  interface Window {
    __translationKernelLoaded?: boolean;
  }
}
if (!window.__translationKernelLoaded) {
  window.__translationKernelLoaded = true;
  let kernel: TranslationKernel | undefined;
  let mode: RenderMode = 'bilingual';
  let status = 'Ready';
  let generation = 0;
  async function translate(): Promise<void> {
    const current = ++generation;
    kernel?.dispose();
    const reply = await chrome.runtime.sendMessage({ kind: 'config.public' });
    if (current !== generation) return;
    if (!reply.ok) throw new Error(reply.error);
    const config = reply.result as Omit<KernelConfig, 'providers'>;
    mode = config.mode;
    const router = new ProviderRouter({
      primary: 'background',
      timeoutMs: 300000,
      retries: 0,
    });
    router.register({
      id: 'background',
      name: 'Extension provider bridge',
      async translate(segments, _context, options) {
        const requestId = crypto.randomUUID();
        const cancel = () => {
          void chrome.runtime
            .sendMessage({ kind: 'translate.cancel', requestId })
            .catch(() => {});
        };
        options?.signal?.addEventListener('abort', cancel, { once: true });
        try {
          if (options?.signal?.aborted)
            throw new DOMException('Cancelled', 'AbortError');
          const response = await chrome.runtime.sendMessage({
            kind: 'translate.batch',
            requestId,
            segments,
            title: document.title,
          });
          if (!response.ok) throw new Error(response.error);
          return response.result;
        } finally {
          options?.signal?.removeEventListener('abort', cancel);
        }
      },
    });
    kernel = new TranslationKernel(
      new HtmlAdapter(document, config.rules),
      router,
      {
        sourceLanguage: config.sourceLanguage,
        targetLanguage: config.targetLanguage,
        title: document.title,
        url: location.href,
      },
      mode,
      config.placement,
    );
    kernel.events.on('translation.started', () => {
      status = 'Translating…';
    });
    kernel.events.on('translation.completed', ({ count }) => {
      status = `Translated ${count} segments`;
    });
    kernel.events.on('segment.translation.failed', ({ error }) => {
      status = error;
    });
    await kernel.translate();
  }
  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (
      sender.id !== chrome.runtime.id ||
      sender.tab ||
      message?.kind !== 'control'
    )
      return;
    if (message.action === 'translate') {
      status = 'Starting…';
      void translate().catch((error) => {
        status = error.message;
      });
    }
    if (message.action === 'stop') {
      generation++;
      kernel?.stop();
      status = 'Stopped';
    }
    if (message.action === 'restore') {
      generation++;
      kernel?.dispose();
      kernel = undefined;
      status = 'Restored';
    }
    if (message.action === 'bilingual') {
      mode = mode === 'bilingual' ? 'original' : 'bilingual';
      kernel?.setMode(mode);
    }
    if (
      message.action === 'mode' &&
      ['original', 'translation', 'bilingual'].includes(message.mode)
    ) {
      mode = message.mode;
      kernel?.setMode(mode);
    }
    if (message.action === 'selection') {
      reply({ text: window.getSelection()?.toString().slice(0, 2000) ?? '' });
      return;
    }
    reply({ status, mode, count: kernel?.getSegments().length ?? 0 });
  });
  window.addEventListener('pagehide', () => {
    generation++;
    kernel?.dispose();
  });
}
