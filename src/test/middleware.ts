import { z } from 'zod';
import { FUNCTIONS, ROUTES } from '..';

const pass = ROUTES.createMiddleware({
    options: z.object({ isValid: z.boolean() }),
    tags: ['NNN'],
    reqHeader: z.object({}).passthrough(),
    wrappers: (params) => [
        //
        FUNCTIONS.WRAPPER.SafeParse(params),
        FUNCTIONS.WRAPPER.Debug(params),
    ],
    async func(context, input) {
        context.log('input-middleware', input);
        return {
            options: { isValid: true },
        };
    },
});
const unsafePass = ROUTES.createMiddleware({
    options: z.object({ isValid: z.boolean() }),
    tags: ['NNN'],
    reqHeader: z.object({}).passthrough(),
    wrappers: (params) => [
        //
        FUNCTIONS.WRAPPER.Debug(params),
    ],
    async func(context, input) {
        context.log('input-middleware', input);
        return {
            options: { isValid: true },
        };
    },
});
export const middlewares = { pass, unsafePass };

// sanity
// ensure all middlewares are safe-parsed;
for (const key in middlewares) {
    const safeParserWrappers = middlewares[key as keyof typeof middlewares].wrappers.filter(FUNCTIONS.WRAPPER.isSafeParse);
    if (!safeParserWrappers.length) {
        console.error(new Error(`Safe Parser not found for middleware: [${key}]`));
    }
}
