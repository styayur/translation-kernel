# Document Adapter API v1

An adapter implements `id`, `read():DocumentNode`, `render(results,mode,placement?)`, `restore()`, optional `observe(onChange):unsubscribe` and optional `dispose()`. Observe sends the current complete model; the kernel requests only untranslated IDs. Restore must preserve original document behavior and dispose must release owned resources. IDs must be unique, stable for unchanged content and replaced for changed content.

The model is `{id,type:'document'|'block'|'segment',text?,children?,metadata?}`. Adapters retain their own platform anchors; the model has no DOM objects. Modes are original, translation, bilingual. Placement is below or inline.

After `pnpm build`, run with `node --input-type=module`:

```js
import { TranslationKernel, ProviderRouter } from './dist/sdk/index.js';
const router = new ProviderRouter({ primary: 'demo' });
router.register({
  id: 'demo',
  name: 'Demo',
  async translate(s) {
    return s.map((x) => ({ id: x.id, text: '你好' }));
  },
});
const adapter = {
  id: 'memory',
  read: () => ({
    id: 'd',
    type: 'document',
    children: [
      {
        id: 'b',
        type: 'block',
        children: [{ id: 's', type: 'segment', text: 'Hello' }],
      },
    ],
  }),
  render: (results) => console.log(results),
  restore: () => console.log('restored'),
};
const kernel = new TranslationKernel(adapter, router, { targetLanguage: 'zh' });
await kernel.translate();
console.log(kernel.exportDocument());
kernel.dispose();
```

For a browser-controlled document use `new HtmlAdapter(document, userRules)`. Future external adapters may implement PDF, EPUB, Markdown, subtitles or OCR, but those readers are explicitly outside this repository's product scope. The example memory adapter demonstrates independence without shipping any reader.
