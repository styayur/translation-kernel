# README screenshot provenance

`assets/extension-settings-v0.1.0.png` is the actual built Chromium extension's
settings page, captured on 2026-10-08 by the [CI E2E run](https://github.com/styayur/translation-kernel/actions/runs/37753274713)
at commit `e99a77b0db8322c010bd6c1a21c68eaa9f22f2a5`, built from the v0.1.0 source,
in a temporary Playwright browser profile with cleared extension storage. No provider keys,
private article or saved user configuration are used. The page is not mocked
and no translated content is fabricated. It demonstrates the configuration UI.

Repeat from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm exec playwright install chromium
pnpm e2e
```

The E2E capture loads the real built extension, waits for the heading and captures
a 1280×900 viewport. The shared E2E harness grants loopback access in a test-only
manifest copy for its functional tests; the release manifest is unchanged.
The settings capture itself clears storage and does not call any provider.
An optional independent Python capture is available in `scripts/capture-readme.py`.
Local Chromium launch returned `spawn UNKNOWN` on this Windows host; the documented
image was captured in the successful Linux CI run, not fabricated to bypass that failure.
For functional translate/restore evidence, run `pnpm e2e`; those tests explicitly
use a deterministic local test provider, not a production translation service.
Existing software and documentation license boundaries remain unchanged.
