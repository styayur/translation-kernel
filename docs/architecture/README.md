# Architecture evidence

Source review: `6a221457670b7a3871d00ff4ca40ae8952d32252` (2026-10-09).

The marked Mermaid block in [README](../../README.md) is the only maintained diagram source. GitHub renders it natively in the reader's theme. No duplicate SVG or independent `.mmd` is committed; extracted Mermaid and SVG files are disposable verification artifacts.

This is the Chromium extension composition. A standalone SDK consumer supplies its own DocumentAdapter and ProviderRouter; it does not require an extension worker. HtmlAdapter applies site rules, segments eligible text and observes DOM changes. The kernel batches up to 16 segments and caches translations in memory.

The content bridge sends batches and cancellation messages to the worker. The worker validates extension identity, top-frame origin, batch limits and request IDs before invoking providers with retry/fallback. Stored credentials remain in trusted extension contexts, but are not encrypted at rest. DomRenderer assigns textContent rather than executing provider markup. Restore aborts work, disconnects observation and restores original text; it is not a persistent page-history system.

## Source map

- [packages/core/src/index.ts](../../packages/core/src/index.ts): `class TranslationKernel`, `restore(): void`, `offset += 16`
- [packages/dom/src/index.ts](../../packages/dom/src/index.ts): `class HtmlAdapter`, `MutationObserver`, `segmentText`
- [packages/renderer/src/index.ts](../../packages/renderer/src/index.ts): `class DomRenderer`, `translated.textContent`, `restore(): void`
- [packages/provider-api/src/index.ts](../../packages/provider-api/src/index.ts): `class ProviderRouter`
- [apps/browser-extension/src/content.ts](../../apps/browser-extension/src/content.ts): `translate.cancel`, `config.public`
- [apps/browser-extension/src/background.ts](../../apps/browser-extension/src/background.ts): `TRUSTED_CONTEXTS`, `sender.frameId !== 0`, `retries: 1`
- [tests/unit/lifecycle.test.ts](../../tests/unit/lifecycle.test.ts): `restore`

The anchors in `evidence.json` catch renamed/deleted source symbols; they do not prove call semantics. The source review above checked the actual call sites and boundaries. A significant change to data flow, persistence, authentication, recovery or process boundaries requires reviewing this diagram and updating the evidence. Routine edits do not require redrawing it.

## Verification

Requires Python 3, Node.js 22+ and network access for the documentation-only Mermaid CLI. From the repository root:

```sh
python docs/architecture/verify.py --render
```

This checks local README image references and source anchors, extracts the authoritative block, renders it twice with Mermaid CLI 11.12.0 using deterministic IDs, compares SVG bytes, validates SVG XML, and also renders the dark theme. If the bundled browser is unavailable, pass `--chrome /absolute/path/to/chrome` (or set `PUPPETEER_EXECUTABLE_PATH`). The CLI version is pinned; its transitive npm dependencies and the browser are environment-dependent, so the byte comparison proves repeatability within the same installed toolchain. Output goes to a temporary directory, never application runtime dependencies. GitHub Markdown/browser rendering still requires visual review; CLI validation alone is not evidence of GitHub rendering.

GitDiagram returned an initial diagram on 2026-10-09 for the public repository as a discovery aid. Its generated output is not imported as authoritative architecture or licensed artwork. No private source, config or credentials were submitted.

Existing repository licenses and third-party notices continue to apply. These diagrams are documentation authored from this repository's public source; no app icons, installer assets or third-party marks are replaced.
