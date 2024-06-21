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
        context.logger('input-middleware', input);
        return {
            options: { isValid: true },
        };
    },
});
const unsafePass = route.createMiddleware({
    options: z.object({ isValid: z.boolean() }),
    tags: ['NNN'],
    reqHeader: z.object({}).passthrough(),
    wrappers: (params) => [
        //
        functions.wrapper.Debug(params),
    ],
    async func(context, input) {
        context.logger('input-middleware', input);
        return {
            options: { isValid: true },
        };
    },
});
export const middlewares = { pass, unsafePass };

// sanity
// ensure all middlewares are safe-parsed;
for (const key in middlewares) {
    const safeParserWrappers = middlewares[key as keyof typeof middlewares].wrappers.filter(functions.wrapper.isSafeParse);
    if (!safeParserWrappers.length) {
        console.error(new Error(`Safe Parser not found for middleware: [${key}]`));
    }
}
