import { AsyncGenerator, Context, asyncGenerator } from '../functions';
import { z } from 'zod';
import { ZodOpenApiOperationObject, ZodOpenApiResponseObject } from 'zod-openapi';
import { Middleware } from './middleware';
import { TakeIfDefined, takeIfDefined } from './_helper';

export namespace SseEndpoint {
    export type Method = 'get';
    export type _Params<
        //
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
                TakeIfDefined<{ headers: ReqH; query: ReqQ; path: ReqP }>,
                z.ZodType<string>,
                z.ZodVoid,
                z.ZodVoid,
                L,
                C & { options: Opt }
            >,
            '_name' | '_input' | '_output' | '_yield' | '_next'
        >;
    export type Params = {
        path: string;
        method: Method;
        documentation: ZodOpenApiOperationObject;
        endpoint: 'sse';
        middlewares: Middleware.Build[];
    };

    export type Build<
        //
        ReqH extends undefined | z.AnyZodObject = z.AnyZodObject,
        ReqQ extends undefined | z.AnyZodObject = z.AnyZodObject,
        ReqP extends undefined | z.AnyZodObject = z.AnyZodObject,
        L = unknown,
        C extends Context = Context,
        Opt extends Record<never, never> = Record<never, never>,
    > = Params &
        AsyncGenerator.Build<
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
    ReqH extends undefined | z.AnyZodObject,
    ReqQ extends undefined | z.AnyZodObject,
    ReqP extends undefined | z.AnyZodObject,
    L,
    C extends Context,
    Opt extends Record<never, never>,
>(
    middlewares: Middleware.Build[],
    method: SseEndpoint.Method,
    path: string,
    _params: SseEndpoint._Params<ReqH, ReqQ, ReqP, L, C, Opt>
): SseEndpoint.Build<ReqH, ReqQ, ReqP, L, C, Opt> {
    const params: SseEndpoint.Params = {
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
                default: {
                    description: 'Server side event!',
                    content: {
                        'text/event-stream': {
                            schema: z.string(),
                        },
                    },
                    headers: z.object({
                        'Content-Type': z.literal('text/event-stream'),
                    }),
                } as ZodOpenApiResponseObject,
            },
        },
        endpoint: 'sse',
        middlewares,
        path: path,
        method: method,
    };
    const build = asyncGenerator({
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
