// SPDX-License-Identifier: MPL-2.0
export interface SelectionContext {
  text: string;
  paragraph?: string;
  title: string;
  url: string;
  sourceLanguage?: string;
  targetLanguage: string;
}
export interface TextAction {
  id: string;
  title: string;
  run(context: SelectionContext): Promise<void>;
}
export interface UrlActionConfig {
  id: string;
  name: string;
  urlTemplate: string;
  openMode: 'tab' | 'window';
}
export function actionUrl(template: string, text: string): string {
  if (!template.includes('{text}'))
    throw new Error('URL template must contain {text}');
  const url = new URL(
    template.replaceAll('{text}', encodeURIComponent(text.slice(0, 2000))),
  );
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error('Only HTTP(S) action URLs are allowed');
  return url.href;
}
export class ActionRegistry {
  private actions = new Map<string, TextAction>();
  register(action: TextAction): () => void {
    if (this.actions.has(action.id)) throw new Error('Duplicate action');
    this.actions.set(action.id, action);
    return () => this.actions.delete(action.id);
  }
  list(): { id: string; title: string }[] {
    return [...this.actions.values()].map(({ id, title }) => ({ id, title }));
  }
  async run(id: string, context: SelectionContext): Promise<void> {
    const action = this.actions.get(id);
    if (!action) throw new Error('Unknown action');
    await action.run({
      ...context,
      text: context.text.slice(0, 2000),
      paragraph: context.paragraph?.slice(0, 2000),
    });
  }
}
