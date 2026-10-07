// SPDX-License-Identifier: MPL-2.0
import type {
  DocumentNode,
  TranslationResult,
  RenderMode,
} from '../../shared/src/index';
export interface DocumentAdapter {
  readonly id: string;
  read(): DocumentNode;
  render(
    results: TranslationResult[],
    mode: RenderMode,
    placement?: 'below' | 'inline',
  ): void;
  restore(): void;
  observe?(onChange: (document: DocumentNode) => void): () => void;
  dispose?(): void;
}
