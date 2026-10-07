// SPDX-License-Identifier: GPL-3.0-or-later
import {
  defaultConfig,
  parseConfig,
  publicConfig,
  type KernelConfig,
} from '../../../packages/config/src/index';
import { ProviderRouter } from '../../../packages/provider-api/src/index';
import { createProvider } from '../../../examples/providers/src/index';
import { actionUrl } from '../../../packages/action-api/src/index';
import type { TranslationSegment } from '../../../packages/shared/src/index';
const ready = chrome.storage.local.setAccessLevel({
  accessLevel: 'TRUSTED_CONTEXTS',
});
const jobs = new Map<string, AbortController>();
async function config(): Promise<KernelConfig> {
  await ready;
  const value = await chrome.storage.local.get('config');
  return value.config
    ? parseConfig(value.config)
    : structuredClone(defaultConfig);
}
function trustedPage(sender: chrome.runtime.MessageSender): boolean {
  return (
    sender.id === chrome.runtime.id &&
    [
      chrome.runtime.getURL('popup.html'),
      chrome.runtime.getURL('options.html'),
    ].includes(sender.url ?? '')
  );
}
async function command(action: string, mode?: string): Promise<unknown> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https?:/u.test(tab.url ?? ''))
    throw new Error('Open an ordinary HTTP(S) page first');
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js'],
  });
  return chrome.tabs.sendMessage(tab.id, { kind: 'control', action, mode });
}
chrome.commands.onCommand.addListener((action) => {
  void command(action).catch(() => {});
});
chrome.tabs.onRemoved.addListener((tabId) => {
  for (const [key, controller] of jobs)
    if (key.startsWith(`${tabId}:`)) {
      controller.abort();
      jobs.delete(key);
    }
});
chrome.runtime.onMessage.addListener((message: unknown, sender, reply) => {
  void (async () => {
    if (
      sender.id !== chrome.runtime.id ||
      !message ||
      typeof message !== 'object'
    )
      throw new Error('Untrusted message');
    const m = message as Record<string, unknown>;
    if (trustedPage(sender)) {
      if (m.kind === 'config.get') return config();
      if (m.kind === 'config.set') {
        const value = parseConfig(m.config);
        await ready;
        await chrome.storage.local.set({ config: value });
        return { ok: true };
      }
      if (m.kind === 'config.reset') {
        await ready;
        await chrome.storage.local.remove('config');
        return { ok: true };
      }
      if (
        m.kind === 'control' &&
        [
          'translate',
          'stop',
          'restore',
          'mode',
          'bilingual',
          'status',
          'selection',
        ].includes(String(m.action))
      )
        return command(
          String(m.action),
          typeof m.mode === 'string' ? m.mode : undefined,
        );
      if (m.kind === 'action.run') {
        const c = await config();
        const action = c.actions.find((a) => a.id === m.id);
        if (!action) throw new Error('Unknown action');
        const selection = (await command('selection')) as { text: string };
        const url = actionUrl(action.urlTemplate, selection.text);
        if (action.openMode === 'window')
          await chrome.windows.create({ url, type: 'popup' });
        else await chrome.tabs.create({ url });
        return { ok: true };
      }
    }
    if (
      !sender.tab?.id ||
      sender.frameId !== 0 ||
      !/^https?:/u.test(sender.url ?? '')
    )
      throw new Error('Content message must come from an HTTP(S) top frame');
    if (m.kind === 'config.public') return publicConfig(await config());
    if (
      typeof m.requestId !== 'string' ||
      !/^[a-zA-Z0-9-]{1,80}$/u.test(m.requestId)
    )
      throw new Error('Invalid request ID');
    const key = `${sender.tab.id}:${m.requestId}`;
    if (m.kind === 'translate.cancel') {
      jobs.get(key)?.abort();
      return { ok: true };
    }
    if (m.kind !== 'translate.batch') throw new Error('Unknown message');
    if (
      jobs.has(key) ||
      [...jobs.keys()].filter((k) => k.startsWith(`${sender.tab!.id}:`))
        .length >= 2 ||
      jobs.size >= 16
    )
      throw new Error('Too many active requests');
    if (!Array.isArray(m.segments) || m.segments.length > 16)
      throw new Error('Invalid batch');
    const segments: TranslationSegment[] = m.segments.map((s: unknown) => {
      if (!s || typeof s !== 'object') throw new Error('Invalid segment');
      const value = s as Record<string, unknown>;
      if (
        typeof value.id !== 'string' ||
        value.id.length > 80 ||
        typeof value.text !== 'string' ||
        value.text.length > 1200
      )
        throw new Error('Invalid segment');
      return { id: value.id, text: value.text };
    });
    if (new Set(segments.map((s) => s.id)).size !== segments.length)
      throw new Error('Duplicate segment');
    const controller = new AbortController();
    jobs.set(key, controller);
    try {
      const c = await config();
      controller.signal.throwIfAborted();
      const router = new ProviderRouter({
        primary: c.primary,
        fallback: c.fallback,
        timeoutMs: Math.max(...c.providers.map((p) => p.timeoutMs)),
        retries: 1,
      });
      for (const p of c.providers) router.register(createProvider(p));
      return await router.translateBatch(
        segments,
        {
          sourceLanguage: c.sourceLanguage,
          targetLanguage: c.targetLanguage,
          title: typeof m.title === 'string' ? m.title.slice(0, 256) : '',
          url: sender.url,
        },
        { signal: controller.signal },
      );
    } finally {
      jobs.delete(key);
    }
  })().then(
    (result) => reply({ ok: true, result }),
    (error) =>
      reply({
        ok: false,
        error: error instanceof Error ? error.message : 'Request failed',
      }),
  );
  return true;
});
