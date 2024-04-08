import { AsyncGenerator, Context } from '../functions';
import { z } from 'zod';
import { ZodOpenApiOperationObject } from 'zod-openapi';
import { Middleware } from './middleware';

export namespace SseEndpoint {
    export type Type = { endpoint: 'sse' };
    type ExtraParams<
        //
        P extends string = string,
        ReqH extends z.AnyZodObject = z.AnyZodObject,
        ReqQ extends z.AnyZodObject = z.AnyZodObject,
        ReqP extends z.AnyZodObject = z.AnyZodObject,
    > = Pick<ZodOpenApiOperationObject, 'security' | 'tags' | 'summary' | 'description'> & {
        path: P;
        reqHeader: ReqH;
        reqQuery: ReqQ;
        reqPath: ReqP;
        resWrite: z.ZodType<string>;
    };

    export type Params<
        //
        P extends string = string,
        ReqH extends z.AnyZodObject = z.AnyZodObject,
        ReqQ extends z.AnyZodObject = z.AnyZodObject,
        ReqP extends z.AnyZodObject = z.AnyZodObject,
        L = unknown,
        C extends Context = Context,
        Opt extends Record<never, never> = Record<never, never>,
    > = ExtraParams<P, ReqH, ReqQ, ReqP> &
        Omit<
            AsyncGenerator.Param<
                string,
                z.ZodObject<{ headers: ReqH; query: ReqQ; path: ReqP }>,
                z.ZodType<string>,
                z.ZodVoid,
                z.ZodVoid,
                L,
                C & { options: Opt }
            >,
            '_name' | '_input' | '_output' | '_yield' | '_next'
        >;
    export type Build<
        //
        P extends string = string,
        ReqH extends z.AnyZodObject = z.AnyZodObject,
        ReqQ extends z.AnyZodObject = z.AnyZodObject,
        ReqP extends z.AnyZodObject = z.AnyZodObject,
        L = unknown,
        C extends Context = Context,
        Opt extends Record<never, never> = Record<never, never>,
    > = ExtraParams<P, ReqH, ReqQ, ReqP> &
        AsyncGenerator.Build<
            string,
            z.ZodObject<{ headers: ReqH; query: ReqQ; path: ReqP }>,
            z.ZodType<string>,
            z.ZodVoid,
            z.ZodVoid,
            L,
            C & { options: Opt }
        > &
        Type & { middlewares: Middleware.Build[] };
}

export function getSseDocumentObject<
    //
    P extends string,
    ReqH extends z.AnyZodObject,
    ReqQ extends z.AnyZodObject,
    ReqP extends z.AnyZodObject,
    L,
    C extends Context,
    Opt extends Record<never, never>,
>(build: SseEndpoint.Build<P, ReqH, ReqQ, ReqP, L, C, Opt>): ZodOpenApiOperationObject {
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
