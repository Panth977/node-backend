import { AsyncFunction, Context, asyncFunction } from '../functions';
import { z } from 'zod';
import { Middleware } from './middleware';
import { ZodOpenApiOperationObject } from 'zod-openapi';

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'trace';

export namespace HttpEndpoint {
    export type _Params<
        //
        M extends Method = Method,
        P extends string = string,
        ReqH extends z.AnyZodObject = z.AnyZodObject,
        ReqQ extends z.AnyZodObject = z.AnyZodObject,
        ReqP extends z.AnyZodObject = z.AnyZodObject,
        ReqB extends z.ZodType = z.ZodType,
        ResH extends z.AnyZodObject = z.AnyZodObject,
        ResB extends z.ZodType = z.ZodType,
        L = unknown,
        C extends Context = Context,
        Opt extends Record<never, never> = Record<never, never>,
    > = Pick<ZodOpenApiOperationObject, 'security' | 'tags' | 'summary' | 'description'> & {
        reqHeader: ReqH;
        reqQuery: ReqQ;
        reqPath: ReqP;
        reqBody: ReqB;
        resHeaders: ResH;
        resBody: ResB;
        otherResMediaTypes?: string[];
        otherReqMediaTypes?: string[];
    } & Omit<
            AsyncFunction._Params<
                `(${Uppercase<M>})${P}`,
                z.ZodObject<{ headers: ReqH; query: ReqQ; body: ReqB; path: ReqP }>,
                z.ZodObject<{ headers: ResH; body: ResB }>,
                L,
                C & { options: Opt }
            >,
            '_name' | '_input' | '_output'
        >;

    export type Params<
        //
        M extends Method = Method,
        P extends string = string,
    > = {
        middlewares: Middleware.Build[];
        documentation: ZodOpenApiOperationObject;
        endpoint: 'http';
        method: M;
        path: P;
    };
    export type Build<
        //
        M extends Method = Method,
        P extends string = string,
        ReqH extends z.AnyZodObject = z.AnyZodObject,
        ReqQ extends z.AnyZodObject = z.AnyZodObject,
        ReqP extends z.AnyZodObject = z.AnyZodObject,
        ReqB extends z.ZodType = z.ZodType,
        ResH extends z.AnyZodObject = z.AnyZodObject,
        ResB extends z.ZodType = z.ZodType,
        L = unknown,
        C extends Context = Context,
        Opt extends Record<never, never> = Record<never, never>,
    > = Params<M, P> &
        AsyncFunction.Build<
            string,
            z.ZodObject<{ headers: ReqH; query: ReqQ; body: ReqB; path: ReqP }>,
            z.ZodObject<{ headers: ResH; body: ResB }>,
            L,
            C & { options: Opt }
        >;
}

export function createHttp<
    //
    M extends Method,
    P extends string,
    ReqH extends z.AnyZodObject,
    ReqQ extends z.AnyZodObject,
    ReqP extends z.AnyZodObject,
    ReqB extends z.ZodType,
    ResH extends z.AnyZodObject,
    ResB extends z.ZodType,
    L,
    C extends Context,
    Opt extends Record<never, never>,
>(
    method: M,
    path: P,
    middlewares: Middleware.Build[],
    _params: HttpEndpoint._Params<M, P, ReqH, ReqQ, ReqP, ReqB, ResH, ResB, L, C, Opt>
): HttpEndpoint.Build<M, P, ReqH, ReqQ, ReqP, ReqB, ResH, ResB, L, C, Opt> {
    const params: HttpEndpoint.Params<M, P> = {
        documentation: {
            tags: middlewares.reduce((tags, m) => tags.concat(m.tags ?? []), [...(_params.tags ?? [])]),
            security: middlewares.reduce((security, m) => security.concat(m.security ?? []), [...(_params.security ?? [])]),
            description: _params.description,
            summary: _params.summary,
            requestParams: {
                header: z.object(
                    middlewares.reduce((shape, middleware) => Object.assign(shape, middleware.reqHeader.shape ?? {}), {
                        ..._params.reqHeader.shape,
                    })
                ),
                query: z.object(
                    middlewares.reduce((shape, middleware) => Object.assign(shape, middleware.reqQuery.shape ?? {}), {
                        ..._params.reqQuery.shape,
                    })
                ),
                path: z.object({ ..._params.reqPath.shape }),
            },
            requestBody: {
                content: {
                    'application/json': {
                        schema: _params.reqBody,
                    },
                    ...(_params.otherReqMediaTypes ?? []).reduce(
                        (content, mediaType) => Object.assign(content, { [mediaType]: { schema: z.any() } }),
                        {}
                    ),
                },
            },
            responses: {
                200: {
                    content: {
                        'application/json': {
                            schema: _params.resBody,
                        },
                        ...(_params.otherResMediaTypes ?? []).reduce(
                            (content, mediaType) => Object.assign(content, { [mediaType]: { schema: z.any() } }),
                            {}
                        ),
                    },
                    headers: z.object(
                        middlewares.reduce((shape, middleware) => Object.assign(shape, middleware.resHeaders.shape ?? {}), {
                            ..._params.resHeaders.shape,
                        })
                    ),
                },
            },
        },
        endpoint: 'http',
        method,
        path,
        middlewares,
    };
    const build = asyncFunction(`(${method.toUpperCase()})${path}` as never, {
        _input: z.object({ headers: _params.reqHeader, path: _params.reqPath, query: _params.reqQuery, body: _params.reqBody }),
        _output: z.object({ headers: _params.resHeaders, body: _params.resBody }),
        _local: _params._local,
        wrappers: _params.wrappers,
        func: _params.func,
    });
    return Object.assign(build, params);
}
