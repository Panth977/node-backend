import { AsyncGenerator, Context, asyncGenerator } from '../functions';
import { z } from 'zod';
import { ZodOpenApiOperationObject } from 'zod-openapi';
import { Middleware } from './middleware';
import { TakeIfDefined, takeIfDefined } from './_helper';
import { SecuritySchemeObject } from 'zod-openapi/lib-types/openapi3-ts/dist/oas30';

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
    > = Pick<ZodOpenApiOperationObject, 'tags' | 'summary' | 'description'> & { security?: Record<string, SecuritySchemeObject> } & {
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
    export type Params<
        //
        ReqH extends undefined | z.AnyZodObject = z.AnyZodObject,
        ReqQ extends undefined | z.AnyZodObject = z.AnyZodObject,
        ReqP extends undefined | z.AnyZodObject = z.AnyZodObject,
    > = Pick<ZodOpenApiOperationObject, 'tags' | 'summary' | 'description'> & { security?: Record<string, SecuritySchemeObject> } & {
        reqHeader?: ReqH;
        reqQuery?: ReqQ;
        reqPath?: ReqP;
        resWrite?: z.ZodType<string>;
        path: string;
        method: Method;
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
    > = Params<ReqH, ReqQ, ReqP> &
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
        endpoint: 'sse',
        middlewares,
        path: path,
        method: method,
        description: _params.description,
        reqHeader: _params.reqHeader,
        reqPath: _params.reqPath,
        reqQuery: _params.reqQuery,
        resWrite: _params.resWrite,
        security: _params.security,
        summary: _params.summary,
        tags: _params.tags,
    };
    const build = asyncGenerator({
        name: _params.name,
        namespace: _params.namespace,
        buildContext: _params.buildContext,
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
