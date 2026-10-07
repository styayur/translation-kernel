# Site rules v1

`SiteRule` contains `match:string[]` and optional CSS selector arrays `include`, `exclude`, `root`. URL matching is an anchored literal glob where `*` is the only wildcard; this is not regex or a full WebExtension match-pattern parser. Default rules apply first, community rules next, user rules last. Explicit fields replace the previous layer's field; omitted fields preserve it. Hard exclusions for script/code/editable/hidden/translation nodes cannot be overridden. Empty exclude arrays can override soft defaults.

After `pnpm build`, run with `node --input-type=module`:

```js
import { resolveRules, matches } from './dist/sdk/index.js';
const rules = [
  { match: ['https://example.org/*'], root: ['main'], exclude: ['.toolbar'] },
];
console.log(matches(rules[0].match[0], 'https://example.org/article'));
console.log(resolveRules('https://example.org/article', rules));
```

Example settings Rules JSON:

```json
[
  {
    "match": ["https://example.org/*"],
    "root": ["main"],
    "include": ["article"],
    "exclude": [".toolbar"]
  }
]
```

Selectors are validated in settings and adapter construction. Invalid selectors fail explicitly. A specified root that does not exist yields no segments rather than broadening access silently. Dynamic scanning respects the same roots. Community rules target Wikipedia content, GitHub markdown and MDN main content; actual site markup may change, so users can override rules. No remote rule marketplace or remote selector download is included.
