// SPDX-License-Identifier: MPL-2.0
import { it, expect, vi } from 'vitest';
import { createProvider } from '../../examples/providers/src/index';
it('implements OpenAI-compatible and Ollama wire formats', async () => {
  for (const kind of ['openai', 'ollama'] as const) {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify(
          kind === 'openai'
            ? {
                choices: [
                  { message: { content: '[{"id":"x","text":"你好"}]' } },
                ],
              }
            : { message: { content: '[{"id":"x","text":"你好"}]' } },
        ),
      ),
    );
    const provider = createProvider({
      id: kind,
      kind,
      baseUrl: 'https://example.org',
      model: 'test',
      apiKey: 'key',
      headers: { 'X-Custom': 'value' },
      timeoutMs: 1000,
    });
    expect(
      await provider.translate([{ id: 'x', text: 'Hello' }], {
        targetLanguage: 'zh',
      }),
    ).toEqual([{ id: 'x', text: '你好' }]);
    const init = fetchMock.mock.calls[0][1]!;
    expect(init.credentials).toBe('omit');
    expect(init.redirect).toBe('error');
    expect(JSON.parse(init.body as string).stream).toBe(false);
    fetchMock.mockRestore();
  }
});
it('handles keyless Google responses and HTTP failures', async () => {
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(new Response(JSON.stringify([[['你好']]])))
    .mockResolvedValueOnce(new Response('', { status: 429 }));
  const provider = createProvider({
    id: 'google',
    kind: 'google',
    baseUrl: 'https://translate.googleapis.com',
    timeoutMs: 1000,
  });
  expect(
    await provider.translate([{ id: 'x', text: 'Hello' }], {
      targetLanguage: 'zh',
    }),
  ).toEqual([{ id: 'x', text: '你好' }]);
  await expect(
    provider.translate([{ id: 'x', text: 'Hello' }], { targetLanguage: 'zh' }),
  ).rejects.toThrow('429');
  fetchMock.mockRestore();
});
