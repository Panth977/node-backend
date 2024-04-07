import { z } from 'zod';
import { MiddlewareBuild } from './middleware';
import { SseBuild, SseParams } from './sse';
import { Context, asyncFunction, asyncGenerator } from '../functions';
import { HttpBuild, HttpParams, Method } from './http';

export class Endpoint<Opt extends Record<never, never>> {
    middlewares: MiddlewareBuild<string, z.AnyZodObject, z.AnyZodObject, z.AnyZodObject, z.AnyZodObject, Record<never, never>, Context>[];
    static build() {
        return new Endpoint<Record<never, never>>([]);
    }
    private constructor(
        middlewares: MiddlewareBuild<string, z.AnyZodObject, z.AnyZodObject, z.AnyZodObject, z.AnyZodObject, Record<never, never>, Context>[]
    ) {
        this.middlewares = middlewares;
    }
    addMiddleware<
        //
        N extends string,
        ReqH extends z.AnyZodObject,
        ReqQ extends z.AnyZodObject,
        ResH extends z.AnyZodObject,
        Opt_ extends z.AnyZodObject,
        S,
        C extends Context,
    >(middleware: MiddlewareBuild<N, ReqH, ReqQ, ResH, Opt_, S, C>): Endpoint<Opt & Opt_['_output']> {
        return new Endpoint([...this.middlewares, middleware as never]);
    }
    http<
        //
        M extends Method,
        P extends string,
        ReqH extends z.AnyZodObject,
        ReqQ extends z.AnyZodObject,
        ReqP extends z.AnyZodObject,
        ReqB extends z.ZodType,
        ResH extends z.AnyZodObject,
        ResB extends z.ZodType,
        S,
        C extends Context,
    >(params: HttpParams<M, P, ReqH, ReqQ, ReqP, ReqB, ResH, ResB, S, C, Opt>): HttpBuild<M, P, ReqH, ReqQ, ReqP, ReqB, ResH, ResB, S, C, Opt> {
        return Object.assign(
            asyncFunction(
                Object.assign(params, {
                    _name: `(${params.method.toUpperCase()})${params.path}`,
                    _input: z.object({ headers: params.reqHeader, path: params.reqPath, query: params.reqQuery, body: params.reqBody }),
                    _output: z.object({ headers: params.resHeaders, body: params.resBody }),
                })
            ),
            params,
            { endpoint: 'http', middlewares: this.middlewares } as const
        );
    }
    sse<
        //
        P extends string,
        ReqH extends z.AnyZodObject,
        ReqQ extends z.AnyZodObject,
        ReqP extends z.AnyZodObject,
        S,
        C extends Context,
    >(params: SseParams<P, ReqH, ReqQ, ReqP, S, C, Opt>): SseBuild<P, ReqH, ReqQ, ReqP, S, C, Opt> {
        return Object.assign(
            asyncGenerator(
                Object.assign(params, {
                    _name: `(*GET)${params.path}`,
                    _input: z.object({ headers: params.reqHeader, path: params.reqPath, query: params.reqQuery }),
                    _output: z.void(),
                    _yield: params.resWrite,
                    _next: z.void(),
                })
            ),
            params,
            { endpoint: 'sse', middlewares: this.middlewares } as const
        );
    }
}
