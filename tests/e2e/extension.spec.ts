// SPDX-License-Identifier: MPL-2.0
import {
  test,
  expect,
  chromium,
  type BrowserContext,
  type Worker,
  type Page,
} from '@playwright/test';
import { resolve } from 'node:path';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import {
  defaultConfig,
  type KernelConfig,
} from '../../packages/config/src/index';
let context: BrowserContext, worker: Worker, id: string;
test.beforeAll(async () => {
  const path = resolve('.local/e2e-extension');
  await cp(resolve('dist/chromium'), path, { recursive: true });
  const manifest = JSON.parse(
    await readFile(resolve(path, 'manifest.json'), 'utf8'),
  );
  // Test-only grant avoids browser consent dialogs in headless CI. Release manifest is unchanged.
  manifest.host_permissions = ['http://127.0.0.1/*'];
  await writeFile(resolve(path, 'manifest.json'), JSON.stringify(manifest));
  context = await chromium.launchPersistentContext('', {
    headless: true,
    channel: 'chromium',
    executablePath: process.env.TK_CHROMIUM_PATH,
    args: [`--disable-extensions-except=${path}`, `--load-extension=${path}`],
  });
  worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent('serviceworker'));
  id = new URL(worker.url()).host;
});
test.afterAll(async () => {
  await context?.close();
});
test('capture real settings with no saved secrets', async () => {
  await worker.evaluate(async () => chrome.storage.local.clear());
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`chrome-extension://${id}/options.html`);
  await expect(
    page.getByRole('heading', { name: 'Translation Kernel', exact: true }),
  ).toBeVisible();
  await mkdir('docs/assets', { recursive: true });
  await page.screenshot({
    path: 'docs/assets/extension-settings-v0.1.0.png',
  });
  await page.close();
});
async function configure(failure = false, target = 'zh-CN') {
  await worker.evaluate(
    async ({ config, failure, target }) => {
      config.targetLanguage = target;
      config.primary = failure ? 'fail' : 'local';
      config.fallback = failure ? 'local' : undefined;
      config.providers = [
        {
          id: 'local',
          kind: 'ollama',
          baseUrl: 'http://127.0.0.1:4173',
          model: 'test',
          timeoutMs: 2000,
        },
        ...(failure
          ? [
              {
                id: 'fail',
                kind: 'ollama' as const,
                baseUrl: 'http://127.0.0.1:4173/fail',
                model: 'test',
                timeoutMs: 2000,
              },
            ]
          : []),
      ];
      await chrome.storage.local.set({ config });
    },
    { config: structuredClone(defaultConfig), failure, target },
  );
}
async function control(page: Page, action: string, mode?: string) {
  return worker.evaluate(
    async ({ url, action, mode }) => {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find((t) => t.url === url)!;
      await chrome.scripting.executeScript({
        target: { tabId: tab.id! },
        files: ['content.js'],
      });
      return chrome.tabs.sendMessage(tab.id!, {
        kind: 'control',
        action,
        mode,
      });
    },
    { url: page.url(), action, mode },
  );
}
for (const route of [
  'static',
  'wikipedia',
  'github',
  'spa',
  'dynamic',
  'large',
])
  test(`${route}: translate, restore, retranslate and preserve listeners`, async () => {
    await configure();
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:4173/${route}`);
    const original = await page.locator('article').textContent();
    await control(page, 'translate');
    await expect(page.locator('[data-tk-translation]').first()).toContainText(
      '中文译文',
    );
    const expected = route === 'large' ? 1002 : 5;
    await expect(page.locator('[data-tk-translation]')).toHaveCount(expected, {
      timeout: 30000,
    });
    await control(page, 'mode', 'translation');
    await control(page, 'mode', 'bilingual');
    await page.locator('a').first().click();
    expect(
      await page.evaluate(
        () => (window as unknown as { clicks: number }).clicks,
      ),
    ).toBe(1);
    await page.locator('#add').click();
    await expect(page.locator('[data-tk-translation]')).toHaveCount(
      expected + 1,
    );
    await page.locator('#edit').click();
    await expect(
      page.locator('p').first().locator('[data-tk-translation]'),
    ).toContainText('SPA updated paragraph');
    await control(page, 'restore');
    await expect(page.locator('[data-tk-translation]')).toHaveCount(0);
    expect(await page.locator('article').textContent()).toContain(
      'SPA updated paragraph',
    );
    expect(original).toContain('Paragraph 0');
    await control(page, 'translate');
    await expect(page.locator('[data-tk-translation]')).toHaveCount(
      expected + 1,
      { timeout: 30000 },
    );
    await control(page, 'restore');
    await page.close();
  });
test('fallback, reverse direction, stop and provider failure', async () => {
  await configure(true, 'en');
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/fallback');
  await control(page, 'translate');
  await expect(page.locator('[data-tk-translation]').first()).toContainText(
    'English translation',
  );
  await control(page, 'stop');
  await control(page, 'restore');
  await worker.evaluate(async () => {
    const stored = await chrome.storage.local.get('config');
    const config = stored.config as KernelConfig;
    config.fallback = undefined;
    await chrome.storage.local.set({ config });
  });
  await control(page, 'translate');
  await expect
    .poll(async () => (await control(page, 'status')).status)
    .toContain('503');
  await page.close();
});
test('settings import/export validation and safe key storage', async () => {
  await configure();
  const page = await context.newPage();
  await page.goto(`chrome-extension://${id}/options.html`);
  await expect(page.locator('#primary')).toHaveValue('local');
  await page.locator('#target').fill('en');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.locator('#status')).toHaveText('Settings saved');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export configuration' }).click();
  expect((await download).suggestedFilename()).toBe('config.json');
  await page.locator('#export-part').selectOption('rules');
  const rulesDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export configuration' }).click();
  expect((await rulesDownload).suggestedFilename()).toBe('rules.json');
  await page.locator('#import').setInputFiles({
    name: 'config.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({ ...defaultConfig, targetLanguage: 'ja' }),
    ),
  });
  await expect(page.locator('#target')).toHaveValue('ja');
  await expect(page.locator('#status')).toContainText('Imported for review');
  await page.locator('#import').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schemaVersion":999}'),
  });
  await expect(page.locator('#status')).toContainText('Unsupported');
  await page.screenshot({ path: 'test-results/settings.png', fullPage: true });
  await page.close();
});
test('content cannot read secrets and stop disables dynamic translation', async () => {
  await configure();
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/security');
  await worker.evaluate(async () => {
    const stored = await chrome.storage.local.get('config');
    const config = stored.config as KernelConfig;
    config.providers[0].apiKey = 'test-secret-only';
    await chrome.storage.local.set({ config });
  });
  await control(page, 'translate');
  await expect(page.locator('[data-tk-translation]')).toHaveCount(5);
  const probe = await worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({
      url: 'http://127.0.0.1:4173/security',
    });
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: async () => {
        const publicReply = await chrome.runtime.sendMessage({
          kind: 'config.public',
        });
        const privateReply = await chrome.runtime.sendMessage({
          kind: 'config.get',
        });
        let denied = false;
        try {
          await chrome.storage.local.get('config');
        } catch {
          denied = true;
        }
        return { publicReply, privateReply, denied };
      },
    });
    return result.result;
  });
  expect(JSON.stringify(probe)).not.toContain('test-secret-only');
  expect(probe?.privateReply.ok).toBe(false);
  expect(probe?.denied).toBe(true);
  await control(page, 'stop');
  await page.locator('#add').click();
  await page.waitForTimeout(150);
  await expect(page.locator('[data-tk-translation]')).toHaveCount(5);
  await control(page, 'restore');
  await page.close();
});
for (const framework of ['react', 'vue'])
  test(`${framework}: preserve framework updates and handlers`, async () => {
    await configure();
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:4173/${framework}`);
    await expect(page.locator('p')).toContainText('version 0');
    await control(page, 'translate');
    await expect(page.locator('[data-tk-translation]')).toContainText(
      'version 0',
    );
    await page.locator('a').click();
    await expect(page.locator('[data-tk-translation]')).toContainText(
      'version 1',
    );
    await control(page, 'restore');
    await expect(page.locator('p')).toHaveText(
      `${framework === 'react' ? 'React' : 'Vue'} paragraph version 1. Update ${framework === 'react' ? 'React' : 'Vue'}`,
    );
    await page.close();
  });
