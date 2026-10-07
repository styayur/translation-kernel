# License boundaries

The studio policy categorizes reusable engines as MPL-2.0 and full applications as GPL/AGPL. Translation Kernel deliberately has both categories:

| Path/artifact                                                                 | License                                                                 |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/**`, `examples/**`                                                  | MPL-2.0 reusable engine and integration examples                        |
| `apps/browser-extension/**`                                                   | GPL-3.0-or-later full application                                       |
| root project documents, `docs/**`, `tests/**`, `scripts/**`, CI/configuration | MPL-2.0 supporting the reusable software project                        |
| `translation-kernel-sdk-*.zip`                                                | MPL-2.0; bundled ESM reusable library                                   |
| `translation-kernel-chromium-*.zip`                                           | GPL-3.0-or-later combined application, with included MPL-source notices |
| third-party files/dependencies                                                | Original upstream terms                                                 |

MPL-covered files are not designated Incompatible With Secondary Licenses. MPL Section 3.3 permits their inclusion in the GPL application; the original reusable source files remain available under MPL. Release source is the tagged public repository. There is no proprietary dual-license exception, CLA or reassignment of third-party rights. Original independent content works are not bundled; these technical project documents accompany the software rather than forming a separately licensed knowledge product.
