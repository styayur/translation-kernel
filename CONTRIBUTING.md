# Contributing

Run `pnpm install`, `pnpm exec playwright install chromium`, `pnpm check` and `pnpm format:check` before opening a PR. Use deterministic tests for provider behavior; never commit API keys, real browsing content or paid service fixtures. Reproduce a DOM issue with a small local fixture including the expected restoration behavior.

## Core Feature Admission Rule

A feature enters the core only when required for webpage text extraction, translation execution, translation rendering, extension protocols, or core security/performance. Nice-to-have, learning, AI, media, sync and productivity features must be implemented as external extensions or adapters. Provider examples must not introduce vendor-specific behavior into the kernel.

Changes to public contracts need documentation, versioning consideration and compatibility tests. Event payloads must remain serializable; external consumers must not receive internal DOM anchors. Preserve cancellation and ownership cleanup for observers, timers, listeners and requests.

Each source file follows its directory's license boundary. Keep SPDX headers and third-party attribution. Contributions are licensed under those same terms; no copyright assignment is required. A release must pass CI, include SHA-256 checksums, disclose unverified platform/site behavior and link its source commit.
