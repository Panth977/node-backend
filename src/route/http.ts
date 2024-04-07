import { SecurityRequirementObject } from 'zod-openapi/lib-types/openapi3-ts/dist/oas30';
import { AsyncFunctionBuild, AsyncFunctionParam, Context } from '../functions';
import { z } from 'zod';
import { MiddlewareBuild } from './middleware';
import { ZodOpenApiOperationObject } from 'zod-openapi';

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'trace';

type ExtraParams<
    M extends Method,
    P extends string,
    ReqH extends z.AnyZodObject,
    ReqQ extends z.AnyZodObject,
    ReqP extends z.AnyZodObject,
    ReqB extends z.ZodType,
    ResH extends z.AnyZodObject,
    ResB extends z.ZodType,
> = {
    method: M;
    path: P;
    description?: string;
    summary?: string;
    tags?: string[];
    security?: SecurityRequirementObject[];
    reqHeader: ReqH;
    reqQuery: ReqQ;
    reqPath: ReqP;
    reqBody: ReqB;
    resHeaders: ResH;
    resBody: ResB;
    otherResMediaTypes?: string[];
    otherReqMediaTypes?: string[];
};

export type HttpParams<
    //
    M extends Method,
    P extends string,
    ReqH extends z.AnyZodObject,
    ReqQ extends z.AnyZodObject,
    ReqP extends z.AnyZodObject,
    ReqB extends z.ZodType,
    ResH extends z.AnyZodObject,
    ResB extends z.ZodType,
    S extends Record<never, never>,
    C extends Context,
    Opt extends Record<never, never>,
> = ExtraParams<M, P, ReqH, ReqQ, ReqP, ReqB, ResH, ResB> &
    Omit<
        AsyncFunctionParam<
            string,
            z.ZodObject<{ headers: ReqH; query: ReqQ; body: ReqB; path: ReqP }>,
            z.ZodObject<{ headers: ResH; body: ResB }>,
            S,
            C & Opt
        >,
        '_name' | '_input' | '_output'
    >;
export type HttpBuild<
    //
    M extends Method,
    P extends string,
    ReqH extends z.AnyZodObject,
    ReqQ extends z.AnyZodObject,
    ReqP extends z.AnyZodObject,
    ReqB extends z.ZodType,
    ResH extends z.AnyZodObject,
    ResB extends z.ZodType,
    S extends Record<never, never>,
    C extends Context,
    Opt extends Record<never, never>,
> = ExtraParams<M, P, ReqH, ReqQ, ReqP, ReqB, ResH, ResB> &
    AsyncFunctionBuild<
        string,
        z.ZodObject<{ headers: ReqH; query: ReqQ; body: ReqB; path: ReqP }>,
        z.ZodObject<{ headers: ResH; body: ResB }>,
        S,
        C & Opt
    > & {
        endpoint: 'http';
        middlewares: MiddlewareBuild<string, z.AnyZodObject, z.AnyZodObject, z.AnyZodObject, z.AnyZodObject, Record<never, never>, Context>[];
    };

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
    S extends Record<never, never>,
    C extends Context,
    Opt extends Record<never, never>,
>(build: HttpBuild<M, P, ReqH, ReqQ, ReqP, ReqB, ResH, ResB, S, C, Opt>): ZodOpenApiOperationObject {
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
