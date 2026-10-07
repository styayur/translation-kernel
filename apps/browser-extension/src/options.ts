// SPDX-License-Identifier: GPL-3.0-or-later
import './ui.css';
import {
  parseConfig,
  exportConfigPart,
  importConfig,
  type ConfigPart,
  type KernelConfig,
  type ProviderConfig,
} from '../../../packages/config/src/index';
let current: KernelConfig;
const input = (id: string) => document.getElementById(id) as HTMLInputElement;
const status = document.getElementById('status')!;
async function send(message: unknown) {
  const r = await chrome.runtime.sendMessage(message);
  if (!r.ok) throw new Error(r.error);
  return r.result;
}
function choices(): void {
  const ids = [
    ...document.querySelectorAll<HTMLInputElement>('[data-field="id"]'),
  ].map((i) => i.value);
  for (const name of ['primary', 'fallback']) {
    const select = input(name) as unknown as HTMLSelectElement;
    const selected = select.value;
    select.replaceChildren();
    if (name === 'fallback') select.add(new Option('None', ''));
    ids.forEach((id) => select.add(new Option(id, id)));
    if (ids.includes(selected)) select.value = selected;
  }
}
function provider(p: ProviderConfig): void {
  const row = document.createElement('div');
  row.className = 'provider';
  const fields: [string, string, string][] = [
    ['id', 'Provider ID', p.id],
    ['kind', 'Kind', p.kind],
    ['baseUrl', 'Base URL', p.baseUrl],
    ['model', 'Model', p.model ?? ''],
    ['apiKey', 'API key', p.apiKey ?? ''],
    ['timeoutMs', 'Timeout (ms)', String(p.timeoutMs)],
    ['headers', 'Custom headers JSON', JSON.stringify(p.headers ?? {})],
  ];
  const grid = document.createElement('div');
  grid.className = 'grid';
  for (const [key, title, value] of fields) {
    const label = document.createElement('label');
    label.append(title);
    let field: HTMLInputElement | HTMLSelectElement;
    if (key === 'kind') {
      field = document.createElement('select');
      ['google', 'openai', 'ollama'].forEach((kind) =>
        (field as HTMLSelectElement).add(new Option(kind, kind)),
      );
    } else {
      field = document.createElement('input');
      field.type =
        key === 'apiKey' ? 'password' : key === 'timeoutMs' ? 'number' : 'text';
    }
    field.dataset.field = key;
    field.value = value;
    label.append(field);
    grid.append(label);
    if (key === 'id') field.addEventListener('input', choices);
  }
  row.append(grid);
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = 'Remove provider';
  remove.addEventListener('click', () => {
    row.remove();
    choices();
  });
  row.append(remove);
  document.getElementById('providers')!.append(row);
  choices();
}
function fill(c: KernelConfig): void {
  current = c;
  input('source').value = c.sourceLanguage;
  input('target').value = c.targetLanguage;
  input('mode').value = c.mode;
  input('placement').value = c.placement;
  document.getElementById('providers')!.replaceChildren();
  c.providers.forEach(provider);
  input('primary').value = c.primary;
  input('fallback').value = c.fallback ?? '';
  input('rules').value = JSON.stringify(c.rules, null, 2);
  input('actions').value = JSON.stringify(c.actions, null, 2);
}
function read(): KernelConfig {
  const providers = [...document.querySelectorAll('.provider')].map((row) =>
    Object.fromEntries(
      [...row.querySelectorAll<HTMLInputElement>('[data-field]')].map(
        (field) => [
          field.dataset.field,
          field.dataset.field === 'headers'
            ? JSON.parse(field.value)
            : field.dataset.field === 'timeoutMs'
              ? Number(field.value)
              : field.value,
        ],
      ),
    ),
  );
  const value = parseConfig({
    ...current,
    sourceLanguage: input('source').value,
    targetLanguage: input('target').value,
    mode: input('mode').value,
    placement: input('placement').value,
    primary: input('primary').value,
    fallback: input('fallback').value || undefined,
    providers,
    rules: JSON.parse(input('rules').value),
    actions: JSON.parse(input('actions').value),
  });
  for (const r of value.rules)
    for (const selector of [
      ...(r.root ?? []),
      ...(r.include ?? []),
      ...(r.exclude ?? []),
    ])
      document.querySelector(selector);
  return value;
}
async function save(c: KernelConfig): Promise<void> {
  const origins = [
    ...new Set(c.providers.map((p) => `${new URL(p.baseUrl).origin}/*`)),
  ];
  if (!(await chrome.permissions.request({ origins })))
    throw new Error('Provider host permission was denied');
  await send({ kind: 'config.set', config: c });
  fill(c);
  status.textContent = 'Settings saved';
}
function failure(error: unknown): void {
  status.textContent =
    error instanceof Error ? error.message : 'Invalid configuration';
}
document.getElementById('config')!.addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    void save(read()).catch(failure);
  } catch (error) {
    failure(error);
  }
});
document.getElementById('add-provider')!.addEventListener('click', () =>
  provider({
    id: `provider-${document.querySelectorAll('.provider').length}`,
    kind: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: '',
    timeoutMs: 20000,
  }),
);
document.getElementById('export')!.addEventListener('click', () => {
  try {
    const url = URL.createObjectURL(
      new Blob(
        [exportConfigPart(read(), input('export-part').value as ConfigPart)],
        { type: 'application/json' },
      ),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `${input('export-part').value}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    failure(error);
  }
});
input('import').addEventListener('change', () => {
  const file = input('import').files?.[0];
  if (!file) return;
  if (file.size > 262144) {
    failure(new Error('Configuration exceeds 256 KiB'));
    return;
  }
  void file
    .text()
    .then((text) => {
      fill(importConfig(JSON.parse(text), current));
      status.textContent = 'Imported for review. Save settings to apply.';
    })
    .catch(failure);
});
document.getElementById('reset')!.addEventListener('click', () => {
  void send({ kind: 'config.reset' })
    .then(() => send({ kind: 'config.get' }))
    .then(fill)
    .then(() => {
      status.textContent = 'Configuration reset';
    })
    .catch(failure);
});
void send({ kind: 'config.get' }).then(fill).catch(failure);
