// SPDX-License-Identifier: GPL-3.0-or-later
import './ui.css';
const status = document.querySelector<HTMLElement>('#status')!;
let providerOrigins: string[] = [];
const translateButton = document.getElementById(
  'translate',
) as HTMLButtonElement;
translateButton.disabled = true;
async function command(action: string, mode?: string): Promise<void> {
  try {
    const reply = await chrome.runtime.sendMessage({
      kind: 'control',
      action,
      mode,
    });
    if (!reply.ok) throw new Error(reply.error);
    status.textContent = reply.result.status;
    document.querySelector<HTMLSelectElement>('#mode')!.value =
      reply.result.mode;
  } catch (error) {
    status.textContent = (error as Error).message;
  }
}
for (const action of ['translate', 'stop', 'restore'])
  document.getElementById(action)!.addEventListener('click', () => {
    if (action !== 'translate') {
      void command(action);
      return;
    }
    void chrome.permissions
      .request({ origins: providerOrigins })
      .then(async (granted) => {
        if (!granted) throw new Error('Provider permission denied');
        await command(action);
      })
      .catch((error) => {
        status.textContent = error.message;
      });
  });
document
  .getElementById('mode')!
  .addEventListener(
    'change',
    (event) => void command('mode', (event.target as HTMLSelectElement).value),
  );
document
  .getElementById('settings')!
  .addEventListener('click', () => void chrome.runtime.openOptionsPage());
void chrome.runtime
  .sendMessage({ kind: 'config.get' })
  .then((reply) => {
    if (!reply.ok) return;
    providerOrigins = [
      ...new Set<string>(
        reply.result.providers.map(
          (p: { baseUrl: string }) => `${new URL(p.baseUrl).origin}/*`,
        ),
      ),
    ];
    translateButton.disabled = false;
    for (const action of reply.result.actions) {
      const button = document.createElement('button');
      button.textContent = action.name;
      button.addEventListener('click', () => {
        void chrome.runtime
          .sendMessage({ kind: 'action.run', id: action.id })
          .then((r) => {
            status.textContent = r.ok ? 'Opened' : r.error;
          });
      });
      document.getElementById('actions')!.append(button);
    }
  })
  .catch((error) => {
    status.textContent = error.message;
  });
void command('status');
const interval = setInterval(() => void command('status'), 1000);
window.addEventListener('pagehide', () => clearInterval(interval));
