import { z } from 'zod';
import { functions, route } from '..';

const pass = route.createMiddleware({
    options: z.object({ isValid: z.boolean() }),
    tags: ['NNN'],
    reqHeader: z.object({}).passthrough(),
    wrappers: (params) => [
        //
        functions.wrapper.SafeParse(params),
        functions.wrapper.Debug(params),
    ],
    async func(context, input) {
        context.logger.debug('input-middleware', input);
        return {
            options: { isValid: true },
        };
    },
});
export const middlewares = { pass };
