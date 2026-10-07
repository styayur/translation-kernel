// SPDX-License-Identifier: MPL-2.0
import { it, expect, vi, afterEach } from 'vitest';
import { HtmlAdapter } from '../../packages/dom/src/index';
import { segmentsOf } from '../../packages/shared/src/index';
afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
});
it('groups nested inline nodes and excludes controls, code, math and hidden content', () => {
  document.body.innerHTML =
    '<p>Hello <a href="#">linked <span>world</span></a>.</p><table><tr><td>Table cell</td></tr></table><nav>Menu text</nav><button>Click</button><form><label>Name</label></form><pre>code</pre><code>inline</code><p hidden>Hidden</p><div style="display:none"><p>CSS hidden</p></div><p aria-hidden="true">ARIA hidden</p><p contenteditable>Editable</p><math><mi>x</mi></math>';
  const adapter = new HtmlAdapter(document);
  expect(segmentsOf(adapter.read()).map((s) => s.text)).toEqual([
    'Hello linked world.',
    'Table cell',
  ]);
  adapter.dispose();
});
it('renders malicious translations as text and preserves element identity and listeners', () => {
  document.body.innerHTML = '<p>Hello <a href="#">world</a>.</p>';
  const link = document.querySelector('a')!;
  const click = vi.fn();
  link.addEventListener('click', click);
  const adapter = new HtmlAdapter(document);
  const segments = segmentsOf(adapter.read());
  adapter.render(
    segments.map((s) => ({ id: s.id, text: '<img src=x onerror=alert(1)>' })),
    'translation',
  );
  expect(document.querySelector('img')).toBeNull();
  expect(document.querySelector('a')).toBe(link);
  adapter.restore();
  expect(document.querySelector('p')!.textContent).toBe('Hello world.');
  link.click();
  expect(click).toHaveBeenCalledOnce();
  adapter.dispose();
});
it('batches dynamic mutations, avoids loops and removes stale anchors', async () => {
  document.body.innerHTML = '<article><p>First paragraph.</p></article>';
  const adapter = new HtmlAdapter(document);
  let changes = 0;
  const initial = segmentsOf(adapter.read());
  const stop = adapter.observe((model) => {
    changes++;
    adapter.render(
      segmentsOf(model).map((s) => ({ id: s.id, text: '译文' })),
      'bilingual',
    );
  });
  adapter.render(
    initial.map((s) => ({ id: s.id, text: '译文' })),
    'bilingual',
  );
  await new Promise((r) => setTimeout(r, 120));
  expect(changes).toBe(0);
  document
    .querySelector('article')!
    .insertAdjacentHTML(
      'beforeend',
      '<p>Second paragraph.</p><p>Third paragraph.</p>',
    );
  await new Promise((r) => setTimeout(r, 200));
  expect(changes).toBe(1);
  expect(document.querySelectorAll('[data-tk-translation]')).toHaveLength(3);
  document.querySelector('article')!.replaceChildren();
  await new Promise((r) => setTimeout(r, 200));
  expect(adapter.anchors.size).toBe(0);
  stop();
  adapter.dispose();
});
it('restores application edits without overwriting them', () => {
  document.body.innerHTML = '<p>Original prose.</p>';
  const adapter = new HtmlAdapter(document);
  const segments = segmentsOf(adapter.read());
  adapter.render(
    segments.map((s) => ({ id: s.id, text: '译文' })),
    'translation',
  );
  document.querySelector('p')!.firstChild!.textContent = 'Application update.';
  adapter.restore();
  expect(document.querySelector('p')!.textContent).toBe('Application update.');
  adapter.dispose();
});
