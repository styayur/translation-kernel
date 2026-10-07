// SPDX-License-Identifier: MPL-2.0
import type { DocumentAdapter } from '../../../packages/adapter-api/src/index';
import type {
  DocumentNode,
  TranslationResult,
} from '../../../packages/shared/src/index';
export function memoryAdapter(
  text: string,
  onRender: (results: TranslationResult[]) => void,
): DocumentAdapter {
  const document: DocumentNode = {
    id: 'memory',
    type: 'document',
    children: [
      {
        id: 'block',
        type: 'block',
        children: [{ id: 'segment', type: 'segment', text }],
      },
    ],
  };
  return {
    id: 'memory-example',
    read: () => structuredClone(document),
    render: onRender,
    restore: () => onRender([]),
  };
}
