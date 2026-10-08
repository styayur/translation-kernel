# README screenshot provenance

`assets/extension-settings-v0.1.0.png` is the actual built Chromium extension's
settings page, captured on 2026-10-08 from source commit
`69474a5a0d` in a fresh, temporary Playwright browser profile. No provider keys,
private article or saved user configuration are used. The page is not mocked
and no translated content is fabricated. It demonstrates the configuration UI.

Repeat from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build
python -m pip install playwright
python -m playwright install chromium
python scripts/capture-readme.py
```

The screenshot script loads the built extension without changing its manifest,
waits for the real heading and captures a 1280×900 viewport. It does not grant
provider permissions, call a provider, or use an existing browser profile.
For functional translate/restore evidence, run `pnpm e2e`; those tests explicitly
use a deterministic local test provider, not a production translation service.
Existing software and documentation license boundaries remain unchanged.
