// SPDX-License-Identifier: MPL-2.0
import { createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createApp, h, ref } from 'vue';
function ReactArticle() {
  const [count, setCount] = useState(0);
  return createElement(
    'article',
    null,
    createElement(
      'p',
      null,
      `React paragraph version ${count}. `,
      createElement(
        'a',
        { href: '#', onClick: () => setCount((c) => c + 1) },
        'Update React',
      ),
    ),
  );
}
if (location.pathname === '/react')
  createRoot(document.getElementById('app')!).render(
    createElement(ReactArticle),
  );
else
  createApp({
    setup() {
      const count = ref(0);
      return () =>
        h('article', [
          h('p', [
            `Vue paragraph version ${count.value}. `,
            h('a', { href: '#', onClick: () => count.value++ }, 'Update Vue'),
          ]),
        ]);
    },
  }).mount('#app');
