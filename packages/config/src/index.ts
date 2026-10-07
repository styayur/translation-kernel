// SPDX-License-Identifier: MPL-2.0
import type { RenderMode } from '../../shared/src/index';
import type { SiteRule } from '../../rules/src/index';
import { actionUrl, type UrlActionConfig } from '../../action-api/src/index';
export interface ProviderConfig {
  id: string;
  kind: 'google' | 'openai' | 'ollama';
  baseUrl: string;
  apiKey?: string;
  model?: string;
  headers?: Record<string, string>;
  timeoutMs: number;
}
export interface KernelConfig {
  schemaVersion: 1;
  sourceLanguage: string;
  targetLanguage: string;
  mode: RenderMode;
  placement: 'below' | 'inline';
  primary: string;
  fallback?: string;
  providers: ProviderConfig[];
  rules: SiteRule[];
  actions: UrlActionConfig[];
}
export const defaultConfig: KernelConfig = {
  schemaVersion: 1,
  sourceLanguage: 'auto',
  targetLanguage: 'zh-CN',
  mode: 'bilingual',
  placement: 'below',
  primary: 'google',
  providers: [
    {
      id: 'google',
      kind: 'google',
      baseUrl: 'https://translate.googleapis.com',
      timeoutMs: 20000,
    },
  ],
  rules: [],
  actions: [],
};
export function endpointUrl(value: string): URL {
  const url = new URL(value);
  if (url.username || url.password || url.hash || url.search)
    throw new Error('Endpoint must not contain credentials, query or fragment');
  if (
    url.protocol !== 'https:' &&
    !(
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    )
  )
    throw new Error('Use HTTPS, or HTTP on loopback only');
  return url;
}
const language = /^(auto|[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*)$/u;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected object');
  return value as Record<string, unknown>;
}
function string(value: unknown, max = 2048): string {
  if (typeof value !== 'string' || value.length > max)
    throw new Error('Invalid string');
  return value;
}
function strings(value: unknown, max = 100): string[] {
  if (!Array.isArray(value) || value.length > max)
    throw new Error('Invalid array');
  return value.map((v) => string(v, 2048));
}
export function parseConfig(value: unknown): KernelConfig {
  const c = object(value);
  if (c.schemaVersion !== 1) throw new Error('Unsupported schema version');
  const sourceLanguage = string(c.sourceLanguage, 32),
    targetLanguage = string(c.targetLanguage, 32);
  if (
    !language.test(sourceLanguage) ||
    !language.test(targetLanguage) ||
    targetLanguage === 'auto'
  )
    throw new Error('Invalid language');
  if (
    !['original', 'translation', 'bilingual'].includes(String(c.mode)) ||
    !['below', 'inline'].includes(String(c.placement))
  )
    throw new Error('Invalid rendering mode');
  if (
    !Array.isArray(c.providers) ||
    !c.providers.length ||
    c.providers.length > 16
  )
    throw new Error('Configure 1–16 providers');
  const providers: ProviderConfig[] = c.providers.map((value) => {
    const p = object(value);
    const id = string(p.id, 64),
      kind = p.kind;
    if (
      !/^[a-z0-9_-]+$/u.test(id) ||
      !['google', 'openai', 'ollama'].includes(String(kind))
    )
      throw new Error('Invalid provider');
    const baseUrl = endpointUrl(string(p.baseUrl)).href.replace(/\/$/u, '');
    if (kind === 'google' && baseUrl !== 'https://translate.googleapis.com')
      throw new Error('Google provider endpoint is fixed');
    if (
      typeof p.timeoutMs !== 'number' ||
      p.timeoutMs < 100 ||
      p.timeoutMs > 120000
    )
      throw new Error('Invalid timeout');
    const headers: Record<string, string> = {};
    if (p.headers)
      for (const [key, value] of Object.entries(object(p.headers))) {
        if (
          !/^[A-Za-z0-9-]+$/u.test(key) ||
          ['host', 'cookie', 'origin', 'referer', 'content-length'].includes(
            key.toLowerCase(),
          )
        )
          throw new Error('Unsafe header');
        headers[key] = string(value, 4096);
        if (/[\r\n]/u.test(headers[key]))
          throw new Error('Invalid header value');
      }
    const apiKey = p.apiKey === undefined ? undefined : string(p.apiKey, 4096),
      model = p.model === undefined ? undefined : string(p.model, 256);
    if (kind !== 'google' && !model?.trim())
      throw new Error('Provider model required');
    return {
      id,
      kind: kind as ProviderConfig['kind'],
      baseUrl,
      timeoutMs: p.timeoutMs,
      apiKey,
      model,
      headers,
    };
  });
  if (new Set(providers.map((p) => p.id)).size !== providers.length)
    throw new Error('Duplicate provider');
  const primary = string(c.primary, 64),
    fallback = c.fallback ? string(c.fallback, 64) : undefined;
  if (
    !providers.some((p) => p.id === primary) ||
    (fallback && !providers.some((p) => p.id === fallback))
  )
    throw new Error('Unknown primary/fallback provider');
  if (
    !Array.isArray(c.rules) ||
    c.rules.length > 100 ||
    !Array.isArray(c.actions) ||
    c.actions.length > 32
  )
    throw new Error('Invalid rules/actions');
  const rules: SiteRule[] = c.rules.map((value) => {
    const r = object(value);
    return {
      match: strings(r.match),
      ...(r.include ? { include: strings(r.include) } : {}),
      ...(r.exclude ? { exclude: strings(r.exclude) } : {}),
      ...(r.root ? { root: strings(r.root) } : {}),
    };
  });
  const actions: UrlActionConfig[] = c.actions.map((value) => {
    const a = object(value);
    const urlTemplate = string(a.urlTemplate);
    actionUrl(urlTemplate, 'test');
    if (!['tab', 'window'].includes(String(a.openMode)))
      throw new Error('Invalid open mode');
    return {
      id: string(a.id, 64),
      name: string(a.name, 128),
      urlTemplate,
      openMode: a.openMode as 'tab' | 'window',
    };
  });
  if (new Set(actions.map((a) => a.id)).size !== actions.length)
    throw new Error('Duplicate action');
  return {
    schemaVersion: 1,
    sourceLanguage,
    targetLanguage,
    mode: c.mode as RenderMode,
    placement: c.placement as 'below' | 'inline',
    primary,
    fallback,
    providers,
    rules,
    actions,
  };
}
export function exportConfig(
  config: KernelConfig,
  includeSecrets = false,
): string {
  const copy = structuredClone(config);
  if (!includeSecrets)
    copy.providers.forEach((p) => {
      delete p.apiKey;
      p.headers = {};
    });
  return JSON.stringify(copy, null, 2);
}
export function publicConfig(
  config: KernelConfig,
): Omit<KernelConfig, 'providers'> {
  const { providers: _, ...rest } = config;
  void _;
  return structuredClone(rest);
}
export type ConfigPart = 'config' | 'providers' | 'rules' | 'actions';
export function exportConfigPart(
  config: KernelConfig,
  part: ConfigPart,
): string {
  const safe = JSON.parse(exportConfig(config)) as KernelConfig;
  if (part === 'config') return JSON.stringify(safe, null, 2);
  return JSON.stringify(
    {
      schemaVersion: 1,
      [part]: safe[part],
      ...(part === 'providers'
        ? { primary: safe.primary, fallback: safe.fallback }
        : {}),
    },
    null,
    2,
  );
}
export function importConfig(value: unknown, base: KernelConfig): KernelConfig {
  const input = object(value);
  if (input.schemaVersion !== 1) throw new Error('Unsupported schema version');
  if ('sourceLanguage' in input) return parseConfig(input);
  const parts = ['providers', 'rules', 'actions'].filter((key) => key in input);
  if (parts.length !== 1)
    throw new Error('Import a complete config or a single configuration part');
  const key = parts[0];
  return parseConfig({
    ...base,
    [key]: input[key],
    ...(key === 'providers'
      ? { primary: input.primary, fallback: input.fallback }
      : {}),
  });
}
