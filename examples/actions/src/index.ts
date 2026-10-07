// SPDX-License-Identifier: MPL-2.0
import {
  actionUrl,
  type TextAction,
  type UrlActionConfig,
} from '../../../packages/action-api/src/index';
export function customUrlAction(
  config: UrlActionConfig,
  open: (url: string, mode: 'tab' | 'window') => Promise<void>,
): TextAction {
  return {
    id: config.id,
    title: config.name,
    async run(context) {
      await open(actionUrl(config.urlTemplate, context.text), config.openMode);
    },
  };
}
export const exampleActions: UrlActionConfig[] = [
  {
    id: 'wiktionary',
    name: 'Wiktionary',
    urlTemplate: 'https://en.wiktionary.org/wiki/{text}',
    openMode: 'tab',
  },
  {
    id: 'chatgpt',
    name: 'Open with ChatGPT',
    urlTemplate: 'https://chatgpt.com/?q={text}',
    openMode: 'tab',
  },
  {
    id: 'claude',
    name: 'Open with Claude',
    urlTemplate: 'https://claude.ai/new?q={text}',
    openMode: 'tab',
  },
  {
    id: 'google',
    name: 'Search Google',
    urlTemplate: 'https://www.google.com/search?q={text}',
    openMode: 'tab',
  },
  {
    id: 'wikipedia',
    name: 'Search Wikipedia',
    urlTemplate: 'https://en.wikipedia.org/w/index.php?search={text}',
    openMode: 'tab',
  },
];
