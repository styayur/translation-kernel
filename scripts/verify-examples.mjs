// SPDX-License-Identifier: MPL-2.0
import {
  TranslationKernel,
  ProviderRouter,
  ActionRegistry,
  actionUrl,
  EventBus,
  resolveRules,
} from '../dist/sdk/index.js';
import {
  memoryAdapter,
  customUrlAction,
  exportJson,
  ankiRows,
  archiveboxEnvelope,
} from '../dist/examples/index.js';
import assert from 'node:assert/strict';
const router = new ProviderRouter({ primary: 'example' });
router.register({
  id: 'example',
  name: 'Example',
  async translate(segments) {
    return segments.map((s) => ({ id: s.id, text: '你好' }));
  },
});
const kernel = new TranslationKernel(
  memoryAdapter('Hello', () => {}),
  router,
  { targetLanguage: 'zh' },
);
await kernel.translate();
assert.equal(JSON.parse(exportJson(kernel)).segments[0].translation, '你好');
assert.equal(ankiRows(kernel)[0][0], 'Hello');
assert.equal(
  archiveboxEnvelope(kernel).translationDocument.targetLanguage,
  'zh',
);
const actions = new ActionRegistry();
let opened;
actions.register(
  customUrlAction(
    {
      id: 'lookup',
      name: 'Lookup',
      urlTemplate: 'https://example.org/{text}',
      openMode: 'tab',
    },
    async (url) => {
      opened = url;
    },
  ),
);
await actions.run('lookup', {
  text: 'two words',
  title: '',
  url: '',
  targetLanguage: 'zh',
});
assert.equal(opened, actionUrl('https://example.org/{text}', 'two words'));
const events = new EventBus();
let count = 0;
const off = events.on('translation.started', () => count++);
events.emit('translation.started', { count: 1 });
off();
assert.equal(count, 1);
assert.deepEqual(
  resolveRules('https://example.org', [{ match: ['*'], root: ['main'] }]).root,
  ['main'],
);
kernel.dispose();
console.log('Provider, action, event, adapter and bridge examples passed.');
