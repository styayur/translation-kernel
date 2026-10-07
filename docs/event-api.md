# Event API v1

`events.on(name, handler)` returns unsubscribe. Events are synchronous, each handler receives a separate structured-clone snapshot, and exceptions are isolated. Core internal state and DOM anchors are never delivered.

| Event                                                                   | Payload                |
| ----------------------------------------------------------------------- | ---------------------- |
| `document.detected`, `document.changed`                                 | Universal DocumentNode |
| `segment.detected`, `segment.translation.started`                       | TranslationSegment     |
| `segment.translated`                                                    | TranslationResult      |
| `segment.translation.failed`                                            | `{id,error}`           |
| `selection.changed`                                                     | SelectionContext       |
| `translation.started`, `translation.completed`, `translation.cancelled` | `{count}`              |

After `pnpm build`, run with `node --input-type=module`:

```js
import { EventBus } from './dist/sdk/index.js';
const events = new EventBus((error) => console.error(error));
const off = events.on('segment.translated', (result) =>
  console.log(result.id, result.text),
);
events.emit('segment.translated', { id: 'one', text: '你好' });
off();
```

Kernel runs publish started, segment events and completed/cancelled. Failed runs publish failure events, not completed. Dynamic changes form subsequent batch runs on the same kernel. Selection events are an integration hook; browser popup actions read selections on demand, and the application does not continuously track or export selections.
