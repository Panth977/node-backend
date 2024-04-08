import { AsyncGenerator, Context, asyncGenerator } from '../functions';
import { z } from 'zod';
import { ZodOpenApiOperationObject } from 'zod-openapi';
import { Middleware } from './middleware';
import { TakeIfDefined, takeIfDefined } from './_helper';

export namespace SseEndpoint {
    export type _Params<
        //
        P extends string = string,
        ReqH extends undefined | z.AnyZodObject = z.AnyZodObject,
        ReqQ extends undefined | z.AnyZodObject = z.AnyZodObject,
        ReqP extends undefined | z.AnyZodObject = z.AnyZodObject,
        L = unknown,
        C extends Context = Context,
        Opt extends Record<never, never> = Record<never, never>,
    > = Pick<ZodOpenApiOperationObject, 'security' | 'tags' | 'summary' | 'description'> & {
        reqHeader?: ReqH;
        reqQuery?: ReqQ;
        reqPath?: ReqP;
        resWrite?: z.ZodType<string>;
    } & Omit<
            AsyncGenerator._Params<
                `(get)${P}`,
                TakeIfDefined<{ headers: ReqH; query: ReqQ; path: ReqP }>,
                z.ZodType<string>,
                z.ZodVoid,
                z.ZodVoid,
                L,
                C & { options: Opt }
            >,
            '_name' | '_input' | '_output' | '_yield' | '_next'
        >;
    export type Params<
        //
        P extends string = string,
    > = {
        method: 'get';
        path: P;
        documentation: ZodOpenApiOperationObject;
        endpoint: 'sse';
        middlewares: Middleware.Build[];
    };

    export type Build<
        //
        P extends string = string,
        ReqH extends undefined | z.AnyZodObject = z.AnyZodObject,
        ReqQ extends undefined | z.AnyZodObject = z.AnyZodObject,
        ReqP extends undefined | z.AnyZodObject = z.AnyZodObject,
        L = unknown,
        C extends Context = Context,
        Opt extends Record<never, never> = Record<never, never>,
    > = Params<P> &
        AsyncGenerator.Build<
            `(get)${P}`,
            TakeIfDefined<{ headers: ReqH; query: ReqQ; path: ReqP }>,
            z.ZodType<string>,
            z.ZodVoid,
            z.ZodVoid,
            L,
            C & { options: Opt }
        >;
}

export function createSse<
    //
    P extends string,
    ReqH extends undefined | z.AnyZodObject,
    ReqQ extends undefined | z.AnyZodObject,
    ReqP extends undefined | z.AnyZodObject,
    L,
    C extends Context,
    Opt extends Record<never, never>,
>(
    method: 'get',
    path: P,
    middlewares: Middleware.Build[],
    _params: SseEndpoint._Params<P, ReqH, ReqQ, ReqP, L, C, Opt>
): SseEndpoint.Build<P, ReqH, ReqQ, ReqP, L, C, Opt> {
    const params: SseEndpoint.Params<P> = {
        documentation: {
            tags: middlewares.reduce((tags, m) => tags.concat(m.tags ?? []), [...(_params.tags ?? [])]),
            security: middlewares.reduce((security, m) => security.concat(m.security ?? []), [...(_params.security ?? [])]),
            description: _params.description,
            summary: _params.summary,
            requestParams: {
                header: z.object(
                    middlewares.reduce((shape, middleware) => Object.assign(shape, middleware.reqHeader?.shape ?? {}), {
                        ...(_params.reqHeader?.shape ?? {}),
                    })
                ),
                query: z.object(
                    middlewares.reduce((shape, middleware) => Object.assign(shape, middleware.reqQuery?.shape ?? {}), {
                        ...(_params.reqQuery?.shape ?? {}),
                    })
                ),
                path: z.object({ ...(_params.reqPath?.shape ?? {}) }),
            },
            responses: {
                200: {
                    content: {
                        'text/event-stream': z.string(),
                    },
                    headers: z.object({
                        'Content-Type': z.literal('text/event-stream'),
                    }),
                },
            },
        },
        endpoint: 'sse',
        method,
        middlewares,
        path,
    };
    const build = asyncGenerator(`(get)${path}`, {
        _input: takeIfDefined({ headers: _params.reqHeader, query: _params.reqQuery, path: _params.reqPath }) as never,
        _output: z.void(),
        _yield: _params.resWrite ?? z.string(),
        _next: z.void(),
        _local: _params._local,
        wrappers: _params.wrappers,
        func: _params.func,
    });
    return Object.assign(build, params) as never;
}
