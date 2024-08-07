import { AsyncFunction, Context, asyncFunction } from '../functions';
import { z } from 'zod';
import { Middleware } from './middleware';
import { ZodOpenApiOperationObject, ZodOpenApiResponseObject } from 'zod-openapi';
import { TakeIfDefined, takeIfDefined } from './_helper';

export namespace HttpEndpoint {
    export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'trace';
    export type _Params<
        //
        ReqH extends undefined | z.AnyZodObject,
        ReqQ extends undefined | z.AnyZodObject,
        ReqP extends undefined | z.AnyZodObject,
        ReqB extends undefined | z.ZodType,
        ResH extends undefined | z.AnyZodObject,
        ResB extends undefined | z.ZodType,
        L,
        C extends Context,
        Opt extends Record<never, never>,
    > = Pick<ZodOpenApiOperationObject, 'security' | 'tags' | 'summary' | 'description'> & {
        reqHeader?: ReqH;
        reqQuery?: ReqQ;
        reqPath?: ReqP;
        reqBody?: ReqB;
        resHeaders?: ResH;
        resBody?: ResB;
        resMediaTypes?: string;
        reqMediaTypes?: string;
    } & Omit<
            AsyncFunction._Params<
                TakeIfDefined<{ headers: ReqH; query: ReqQ; body: ReqB; path: ReqP }>,
                TakeIfDefined<{ headers: ResH; body: ResB }>,
                L,
                C & { options: Opt }
            >,
            '_name' | '_input' | '_output'
        >;

    export type Params = {
        method: Method;
        path: string;
        middlewares: Middleware.Build[];
        documentation: ZodOpenApiOperationObject;
        endpoint: 'http';
    };
    export type Build<
        //
        ReqH extends undefined | z.AnyZodObject = z.AnyZodObject,
        ReqQ extends undefined | z.AnyZodObject = z.AnyZodObject,
        ReqP extends undefined | z.AnyZodObject = z.AnyZodObject,
        ReqB extends undefined | z.ZodType = z.ZodType,
        ResH extends undefined | z.AnyZodObject = z.AnyZodObject,
        ResB extends undefined | z.ZodType = z.ZodType,
        L = unknown,
        C extends Context = Context,
        Opt extends Record<never, never> = Record<never, never>,
    > = Params &
        AsyncFunction.Build<
            TakeIfDefined<{ headers: ReqH; query: ReqQ; body: ReqB; path: ReqP }>,
            TakeIfDefined<{ headers: ResH; body: ResB }>,
            L,
            C & { options: Opt }
        >;
}

export function createHttp<
    //
    ReqH extends undefined | z.AnyZodObject,
    ReqQ extends undefined | z.AnyZodObject,
    ReqP extends undefined | z.AnyZodObject,
    ReqB extends undefined | z.ZodType,
    ResH extends undefined | z.AnyZodObject,
    ResB extends undefined | z.ZodType,
    L,
    C extends Context,
    Opt extends Record<never, never>,
>(
    middlewares: Middleware.Build[],
    method: HttpEndpoint.Method,
    path: string,
    _params: HttpEndpoint._Params<ReqH, ReqQ, ReqP, ReqB, ResH, ResB, L, C, Opt>
): HttpEndpoint.Build<ReqH, ReqQ, ReqP, ReqB, ResH, ResB, L, C, Opt> {
    const params: HttpEndpoint.Params = {
        documentation: {
            get operationId() {
                return build.getName();
            },
            tags: middlewares.reduce((tags, m) => [...tags, ...(m.tags ?? [])], [...(_params.tags ?? [])]),
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
            requestBody: {
                content: {
                    [_params.reqMediaTypes ?? 'application/json']: {
                        schema: _params.reqBody,
                    },
                },
            },
            responses: {
                default: {
                    content: {
                        [_params.resMediaTypes ?? 'application/json']: {
                            schema: _params.resBody,
                        },
                    },
                    headers: z.object(
                        middlewares.reduce((shape, middleware) => Object.assign(shape, middleware.resHeaders?.shape ?? {}), {
                            ...(_params.resHeaders?.shape ?? {}),
                        })
                    ),
                } as ZodOpenApiResponseObject,
            },
        },
        endpoint: 'http',
        middlewares,
        method: method,
        path: path,
    };
    const build = asyncFunction({
        name: _params.name,
        namespace: _params.namespace,
        buildContext: _params.buildContext,
        _input: takeIfDefined({ headers: _params.reqHeader, path: _params.reqPath, query: _params.reqQuery, body: _params.reqBody }) as never,
        _output: takeIfDefined({ headers: _params.resHeaders, body: _params.resBody }) as never,
        _local: _params._local,
        wrappers: _params.wrappers,
        func: _params.func,
    });
    return Object.assign(build, params) as never;
}
