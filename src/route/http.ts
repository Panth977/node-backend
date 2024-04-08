import { AsyncFunction, Context } from '../functions';
import { z } from 'zod';
import { Middleware } from './middleware';
import { ZodOpenApiOperationObject } from 'zod-openapi';

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'trace';

export namespace HttpEndpoint {
    export type Type = { endpoint: 'http' };
    type ExtraParams<
        M extends Method = Method,
        P extends string = string,
        ReqH extends z.AnyZodObject = z.AnyZodObject,
        ReqQ extends z.AnyZodObject = z.AnyZodObject,
        ReqP extends z.AnyZodObject = z.AnyZodObject,
        ReqB extends z.ZodType = z.ZodType,
        ResH extends z.AnyZodObject = z.AnyZodObject,
        ResB extends z.ZodType = z.ZodType,
    > = Pick<ZodOpenApiOperationObject, 'security' | 'tags' | 'summary' | 'description'> & {
        method: M;
        path: P;
        reqHeader: ReqH;
        reqQuery: ReqQ;
        reqPath: ReqP;
        reqBody: ReqB;
        resHeaders: ResH;
        resBody: ResB;
        otherResMediaTypes?: string[];
        otherReqMediaTypes?: string[];
    };

    export type Params<
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
    > = ExtraParams<M, P, ReqH, ReqQ, ReqP, ReqB, ResH, ResB> &
        Omit<
            AsyncFunction.Param<
                string,
                z.ZodObject<{ headers: ReqH; query: ReqQ; body: ReqB; path: ReqP }>,
                z.ZodObject<{ headers: ResH; body: ResB }>,
                L,
                C & { options: Opt }
            >,
            '_name' | '_input' | '_output' // | 'wrappers'
        >;
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
    > = ExtraParams<M, P, ReqH, ReqQ, ReqP, ReqB, ResH, ResB> &
        AsyncFunction.Build<
            string,
            z.ZodObject<{ headers: ReqH; query: ReqQ; body: ReqB; path: ReqP }>,
            z.ZodObject<{ headers: ResH; body: ResB }>,
            L,
            C & { options: Opt }
        > &
        Type & { middlewares: Middleware.Build[] };
}

export function getHttpDocumentObject<
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
>(build: HttpEndpoint.Build<M, P, ReqH, ReqQ, ReqP, ReqB, ResH, ResB, L, C, Opt>): ZodOpenApiOperationObject {
    return {
        tags: build.middlewares.reduce((tags, m) => tags.concat(m.tags ?? []), [...(build.tags ?? [])]),
        security: build.middlewares.reduce((security, m) => security.concat(m.security ?? []), [...(build.security ?? [])]),
        description: build.description,
        summary: build.summary,
        requestParams: {
            header: z.object(
                build.middlewares.reduce((shape, middleware) => Object.assign(shape, middleware.reqHeader.shape ?? {}), {
                    ...build.reqHeader.shape,
                })
            ),
            query: z.object(
                build.middlewares.reduce((shape, middleware) => Object.assign(shape, middleware.reqQuery.shape ?? {}), {
                    ...build.reqQuery.shape,
                })
            ),
            path: z.object({ ...build.reqPath.shape }),
        },
        requestBody: {
            content: {
                'application/json': {
                    schema: build.reqBody,
                },
                ...(build.otherReqMediaTypes ?? []).reduce((content, mediaType) => Object.assign(content, { [mediaType]: { schema: z.any() } }), {}),
            },
        },
        responses: {
            200: {
                content: {
                    'application/json': {
                        schema: build.resBody,
                    },
                    ...(build.otherResMediaTypes ?? []).reduce(
                        (content, mediaType) => Object.assign(content, { [mediaType]: { schema: z.any() } }),
                        {}
                    ),
                },
                headers: z.object(
                    build.middlewares.reduce((shape, middleware) => Object.assign(shape, middleware.resHeaders.shape ?? {}), {
                        ...build.resHeaders.shape,
                    })
                ),
            },
        },
    };
}
