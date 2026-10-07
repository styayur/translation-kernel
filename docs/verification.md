# v0.1.0 verification

Release date: 2026-10-08 (Asia/Singapore). Local validation uses Windows, Node 26.7.0 and Chromium 153.0.8010.12. These are measured results, not cross-platform guarantees.

## Automated checks

- ESLint, strict TypeScript and production builds passed.
- 21 unit/DOM/lifecycle tests passed across four files.
- 11 actual Chromium extension E2E tests passed: static article, Wikipedia-like, GitHub-like, SPA, dynamic insertion, 1,000-paragraph large document, failure/fallback, reverse target, stop, restore/retranslate, import/export, secret access boundaries, and real React/Vue component updates.
- Built provider/action/event/adapter/bridge examples executed successfully.
- Full dependency audit reported no known vulnerabilities; production has no installed runtime dependencies.
- Settings screenshot was visually reviewed for layout, keyboard controls and readable validation status.

E2E runs the built extension in a persistent Chromium context. A separate, ignored test copy of the manifest grants only the deterministic localhost provider origin, avoiding headless browser permission dialogs. The released manifest has **no required host permissions**; provider access is optional and requested by a user gesture. Tests cover permission request calls when permission is already granted; first-time browser consent UI still needs human interaction.

## Live website verification

[Raw live results](live-verification.json) record isolated Chromium visits to Wikipedia Translation, the Microsoft TypeScript GitHub README, MDN MutationObserver and React's learning site. The built HTML adapter discovered 633, 21, 34 and 79 segments respectively in that run. Three segments per site were translated using the real keyless Google endpoint; a translated sample was then translated Chinese → English. All four samples rendered and restored successfully, with no observed page JavaScript errors.

The live harness uses CSP bypass solely to import the test SDK; the production extension does not alter page CSP. These are online integration samples, not exhaustive full-site manual certification or evidence of semantic translation accuracy. Deterministic local long-article/large-DOM and actual React/Vue E2E cover the full extension lifecycle separately. No real OpenAI-compatible account or Ollama model was supplied; their protocol behavior is verified with mocks/local HTTP endpoints.

## Performance and size

Single local run; see [raw benchmark](benchmark.json). Nodes count text and elements. API/network latency is excluded from deterministic kernel measurements.

| DOM nodes | Segments | Scan ms | Render ms | Restore ms | Scheduling overhead ms | Dynamic model callback ms |
| --------- | -------- | ------- | --------- | ---------- | ---------------------- | ------------------------- |
| 1,001     | 200      | 20.7    | 3.0       | 0.4        | 2.6                    | 81.5                      |
| 10,001    | 2,000    | 75.9    | 11.3      | 2.0        | 6.7                    | 94.5                      |
| 50,001    | 10,000   | 462.5   | 82.6      | 3.5        | 52.9                   | 284.7                     |

Dynamic callback includes 80 ms debounce plus dirty-subtree processing, pruning and construction of the full document snapshot. It does not mean the whole DOM was rescanned. Scheduling overhead subtracts measured scanning, rendering and deterministic provider execution from total kernel duration. Estimated UTF-16 source-text storage is 14,980 / 153,780 / 777,780 bytes; this excludes engine, objects and DOM memory and is not a heap measurement. Tests confirm cleanup and bounded cache behavior; a long-running heap/leak soak has not been conducted.

Extension JavaScript + CSS: **42,532 bytes (41.5 KiB)**. All installable files including complete licenses/notices: **209,454 bytes (204.5 KiB)**. SDK ESM: about **30.2 kB** before compression, plus declarations and MPL license. React/Vue test fixtures are not included in either release artifact. ZIP files use DEFLATE and include SHA-256 checksums.

## CI and release gate

[GitHub Actions](https://github.com/styayur/translation-kernel/actions) runs formatting, lint, typecheck, unit/DOM, E2E, examples, build, dependency audit and packaging. Publication is gated on a successful CI run for the release commit. The Release page links the tagged source and supplies the installable Chromium ZIP, SDK ZIP and checksums. CI status and exact release commit are reported in the delivery message.

## Known limitations

- Chromium MV3 is validated; Firefox is a reserved architecture target and has no tested release package.
- No shadow DOM, cross-origin iframe, PDF/EPUB/media/OCR reader or cloud synchronization.
- Language detection is conservative script recognition, not probabilistic multilingual classification; Latin-script text returns `und` and the provider can auto-detect.
- Anchor IDs are stable within a session, not across reloads. Original DOM nodes/listeners are preserved, but arbitrary hostile/custom rendering frameworks and continuously rewriting pages need site-specific verification.
- Translation-only mode blanks original mapped Text nodes. Links retain their identity/handlers but their original text is hidden until restore; generated translation is grouped at the block level rather than rebuilding link semantics in translated prose.
- Google uses an unofficial convenience endpoint and sequential requests; availability/rate limits are not guaranteed. OpenAI/Ollama examples use complete non-streaming batches.
- Existing optional permissions are not revoked by reset; revoke them in browser extension settings. Keys are local and unencrypted.
- No Chrome Web Store submission, account-backed provider credentials, manual first-time consent certification, or long-running memory-soak certification is claimed.
