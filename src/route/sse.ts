import { SecurityRequirementObject } from 'zod-openapi/lib-types/openapi3-ts/dist/oas30';
import { AsyncGeneratorBuild, AsyncGeneratorParam, Context } from '../functions';
import { z } from 'zod';
import { MiddlewareBuild } from './middleware';
import { ZodOpenApiOperationObject } from 'zod-openapi';

type ExtraParams<
    //
    P extends string,
    ReqH extends z.AnyZodObject,
    ReqQ extends z.AnyZodObject,
    ReqP extends z.AnyZodObject,
> = {
    path: P;
    description?: string;
    summary?: string;
    tags?: string[];
    security?: SecurityRequirementObject[];
    reqHeader: ReqH;
    reqQuery: ReqQ;
    reqPath: ReqP;
    resWrite: z.ZodType<string>;
};

export type SseParams<
    //
    P extends string,
    ReqH extends z.AnyZodObject,
    ReqQ extends z.AnyZodObject,
    ReqP extends z.AnyZodObject,
    S extends Record<never, never>,
    C extends Context,
    Opt extends Record<never, never>,
> = ExtraParams<P, ReqH, ReqQ, ReqP> &
    Omit<
        AsyncGeneratorParam<string, z.ZodObject<{ headers: ReqH; query: ReqQ; path: ReqP }>, z.ZodType<string>, z.ZodVoid, z.ZodVoid, S, C & Opt>,
        '_name' | '_input' | '_output' | '_yield' | '_next'
    >;
export type SseBuild<
    //
    P extends string,
    ReqH extends z.AnyZodObject,
    ReqQ extends z.AnyZodObject,
    ReqP extends z.AnyZodObject,
    S extends Record<never, never>,
    C extends Context,
    Opt extends Record<never, never>,
> = ExtraParams<P, ReqH, ReqQ, ReqP> &
    AsyncGeneratorBuild<string, z.ZodObject<{ headers: ReqH; query: ReqQ; path: ReqP }>, z.ZodType<string>, z.ZodVoid, z.ZodVoid, S, C & Opt> & {
        endpoint: 'sse';
        middlewares: MiddlewareBuild<string, z.AnyZodObject, z.AnyZodObject, z.AnyZodObject, z.AnyZodObject, Record<never, never>, Context>[];
    };

export function getSseDocumentObject<
    //
    P extends string,
    ReqH extends z.AnyZodObject,
    ReqQ extends z.AnyZodObject,
    ReqP extends z.AnyZodObject,
    S extends Record<never, never>,
    C extends Context,
    Opt extends Record<never, never>,
>(build: SseBuild<P, ReqH, ReqQ, ReqP, S, C, Opt>): ZodOpenApiOperationObject {
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
    };
}
