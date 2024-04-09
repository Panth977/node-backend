import { z } from 'zod';

export function createEventNode<E extends z.ZodType>(eventSchema: E) {
    const cbs = new Set<(event: E['_output']) => void>();
    return {
        emit(_event: E['_input']) {
            const event = eventSchema.parse(_event);
            for (const cb of cbs) setTimeout(() => cb(event));
        },
        listen(cb: (event: E['_output']) => void) {
            cbs.add(cb);
            return () => cbs.delete(cb);
        },
    };
}
