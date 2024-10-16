import { AsyncGenerator, Context, asyncGenerator } from '../functions';
import { z } from 'zod';
import { ZodOpenApiOperationObject } from 'zod-openapi';
import { Middleware } from './middleware';
import { SecuritySchemeObject } from '../type/zod-openapi';

export namespace SseEndpoint {
    export type Method = 'get';
    export type _Params<
        //
        I extends z.AnyZodObject,
        Y extends z.ZodString,
        L = unknown,
        C extends Context = Context,
        Opt extends Record<never, never> = Record<never, never>,
    > = Pick<ZodOpenApiOperationObject, 'tags' | 'summary' | 'description'> & { security?: Record<string, SecuritySchemeObject> } & Omit<
            AsyncGenerator._Params<I, Y, z.ZodVoid, z.ZodVoid, L, C & { options: Opt }>,
            '_output' | '_next'
        >;
    export type Params = Pick<ZodOpenApiOperationObject, 'tags' | 'summary' | 'description'> & {
        security?: Record<string, SecuritySchemeObject>;
        resWrite?: z.ZodType<string>;
        path: string;
        method: Method;
        endpoint: 'sse';
        middlewares: Middleware.Build[];
    };

    export type Build<
        //
        I extends z.AnyZodObject = z.ZodObject<{ path?: z.AnyZodObject; query?: z.AnyZodObject }>,
        Y extends z.ZodString = z.ZodString,
        L = unknown,
        C extends Context = Context,
        Opt extends Record<never, never> = Record<never, never>,
    > = Params & AsyncGenerator.Build<I, Y, z.ZodVoid, z.ZodVoid, L, C & { options: Opt }>;
}

export function createSse<
    //
    I extends z.AnyZodObject,
    Y extends z.ZodString,
    L,
    C extends Context,
    Opt extends Record<never, never>,
>(
    middlewares: Middleware.Build[],
    method: SseEndpoint.Method,
    path: string,
    _params: SseEndpoint._Params<I, Y, L, C, Opt>
): SseEndpoint.Build<I, Y, L, C, Opt> {
    const params: SseEndpoint.Params = {
        endpoint: 'sse',
        middlewares,
        path: path,
        method: method,
        description: _params.description,
        security: _params.security,
        summary: _params.summary,
        tags: _params.tags,
    };
    return Object.assign(asyncGenerator(Object.assign(_params, { _output: z.void(), _next: z.void() })), params) as never;
}
