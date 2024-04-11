import { z } from 'zod';
import { Context } from '../functions';

export function createEventNode<C extends Context, E extends z.ZodType>(eventSchema: E) {
    type CB = (context: C, event: E['_output']) => void;
    const cbs = new Set<CB>();
    return {
        publish(context: C, _event: E['_input']) {
            const event = eventSchema.parse(_event);
            for (const cb of cbs) setTimeout(() => cb(context, event));
        },
        subscribe(cb: CB) {
            cbs.add(cb);
            return {
                unsubscribe() {
                    cbs.delete(cb);
                },
            };
        },
    };
}
