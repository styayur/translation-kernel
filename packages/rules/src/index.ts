// SPDX-License-Identifier: MPL-2.0
export interface SiteRule {
  match: string[];
  include?: string[];
  exclude?: string[];
  root?: string[];
}
export interface ResolvedRule {
  include: string[];
  exclude: string[];
  root: string[];
}
export const defaultRules: SiteRule[] = [
  {
    match: ['*'],
    exclude: [
      'nav',
      'header',
      'footer',
      'button',
      'form',
      '[role="navigation"]',
      '[role="button"]',
      'math',
      '.katex',
      '.MathJax',
    ],
  },
];
export const communityRules: SiteRule[] = [
  {
    match: ['https://*.wikipedia.org/*'],
    root: ['#mw-content-text'],
    exclude: ['.mw-editsection', '.navbox'],
  },
  {
    match: ['https://github.com/*'],
    root: ['article.markdown-body', '.markdown-body'],
    exclude: ['.highlight', '[data-testid="repos-header"]'],
  },
  {
    match: ['https://developer.mozilla.org/*'],
    root: ['main'],
    exclude: ['.code-example'],
  },
];
export function matches(pattern: string, url: string): boolean {
  const escaped = pattern
    .split('*')
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${escaped}$`, 'u').test(url);
}
export function resolveRules(url: string, user: SiteRule[] = []): ResolvedRule {
  const result: ResolvedRule = { include: [], exclude: [], root: [] };
  for (const rule of [...defaultRules, ...communityRules, ...user])
    if (rule.match.some((p) => matches(p, url))) {
      for (const key of ['include', 'exclude', 'root'] as const)
        if (rule[key]) result[key] = [...rule[key]];
    }
  return result;
}
export function validateSelectors(
  rule: ResolvedRule,
  document: Document,
): void {
  for (const selector of [...rule.root, ...rule.include, ...rule.exclude])
    document.querySelector(selector);
}
