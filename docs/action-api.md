# Action API v1

Actions are independent `{id,title,run(context):Promise<void>}` tools. Context provides selected `text`, surrounding `paragraph?`, `title`, `url`, `sourceLanguage?`, and `targetLanguage`. Registry limits text and paragraph to 2,000 characters. Registration returns an unregister function. An action owns its external workflow; no AI chat or dictionary engine enters the core.

After `pnpm build`, run with `node --input-type=module`:

```js
import { ActionRegistry, actionUrl } from './dist/sdk/index.js';
const actions = new ActionRegistry();
const unregister = actions.register({
  id: 'lookup',
  title: 'Wiktionary',
  async run(context) {
    console.log(
      actionUrl('https://en.wiktionary.org/wiki/{text}', context.text),
    );
  },
});
await actions.run('lookup', {
  text: 'kernel',
  title: 'Demo',
  url: 'https://example.org',
  targetLanguage: 'zh',
});
unregister();
```

`customUrlAction` in `dist/examples/index.js` accepts a portable `{id,name,urlTemplate,openMode}` and an injected async opener. `openMode` is tab or window. The browser's popup is the trusted opener. User actions are configured in settings and intentionally absent from default config. Text replacements are percent-encoded; JavaScript/data/file protocols and URL credentials are rejected. Open with ChatGPT/Claude examples navigate to their external URLs only.
