# Translation Kernel v0.1.0

A small, composable TypeScript translation kernel and on-demand Chromium MV3 extension.

- Semantic HTML discovery with preserved inline nodes, links and listeners.
- Original / translation / bilingual rendering, below / inline placement, restore and SPA updates.
- Provider API with batches, bounded context, timeout, retry, fallback, cancellation and bounded cache.
- Google convenience, OpenAI-compatible and Ollama-compatible integrations.
- Typed events, safe custom URL actions, universal document adapters and example bridge projections.
- Portable versioned config/providers/rules/actions import/export; secrets omitted from exports.
- 21 unit/DOM/lifecycle tests and 11 Chromium extension E2E tests passed locally; deterministic examples and dependency audit passed.
- Actual English → Chinese → English samples on Wikipedia, GitHub README, MDN and React documentation passed.

## Downloads

`translation-kernel-chromium-v0.1.0.zip`: extract, open `chrome://extensions`, enable Developer mode and Load unpacked. Configure/save providers to grant their origins, then Translate. This is not a Chrome Web Store submission.

`translation-kernel-sdk-v0.1.0.zip`: reusable ESM library and TypeScript declarations. Public contracts are documented in the repository.

`SHA256SUMS.txt`: verify both downloaded ZIPs.

## Licensing and limits

Library/SDK: MPL-2.0. Full browser application: GPL-3.0-or-later. Complete license texts and notices are included; third-party materials retain their original terms. See README and docs/licensing.md for boundaries under the studio's license policy.

Chromium is validated. Firefox packaging, shadow DOM/iframes, first-time permission-dialog manual certification, real paid/local-model credentials and long-running memory-soak testing remain outside this validation. Google uses an unofficial convenience endpoint and may fail or throttle; real OpenAI-compatible/Ollama service availability depends on your endpoint/model. No chat, learning, media, sync, accounts or backend are included.

Full measurements, architecture, public APIs and limitations: [verification](https://github.com/styayur/translation-kernel/blob/v0.1.0/docs/verification.md) and [Chinese delivery report](https://github.com/styayur/translation-kernel/blob/v0.1.0/docs/DELIVERY_REPORT.zh-CN.md).
