# Provider API v1

`TranslationProvider` has `id`, `name`, and `translate(segments, context, options?)`. A segment is `{id,text,sourceLanguage?}`; a result is `{id,text,provider?}`. Return exactly one nonempty result for every input ID. Never mutate inputs. Honor `options.signal` and never execute source text as instructions. Router validates outputs, limits context, chunks batches and manages retry/fallback.

After `pnpm build`, run this with `node --input-type=module` from the repository root:

```js
import { ProviderRouter } from './dist/sdk/index.js';
const router = new ProviderRouter({ primary: 'demo', retries: 0 });
router.register({
  id: 'demo',
  name: 'Deterministic example',
  async translate(segments, context, options) {
    options?.signal?.throwIfAborted();
    return segments.map((s) => ({
      id: s.id,
      text: `${context.targetLanguage}: ${s.text}`,
    }));
  },
});
console.log(
  await router.translate(
    { id: 'one', text: 'Hello' },
    { targetLanguage: 'zh' },
  ),
);
```

For real services, `createProvider` is exported from `dist/examples/index.js`. OpenAI-compatible configuration uses `{id,kind:'openai',baseUrl:'https://your-endpoint/v1',apiKey,model,headers,timeoutMs}`. Ollama uses `kind:'ollama'`, a root base URL and `/api/chat`. Google is fixed to its convenience endpoint. All examples omit credentials, reject redirects and implement timeouts. Streaming is not enabled in 0.1; results remain full validated batches. Do not place service secrets in webpage code; the browser application runs networking in its service worker.

Context supports target/source language, page title/URL, previous/next segments and document language. Title is capped at 256 characters, URL at 2,048, adjacent segments at 512 each. HTML currently provides title/URL and configured languages; adjacency is available to external adapters/callers.
