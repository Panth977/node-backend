import { z } from 'zod';
import { Middleware } from './middleware';
import { SseEndpoint } from './sse';
import { Context, asyncFunction, asyncGenerator } from '../functions';
import { HttpEndpoint, Method } from './http';

export class Endpoint<Opt extends Record<never, never>> {
    middlewares: Middleware.Build[];
    static build() {
        return new Endpoint<Record<never, never>>([]);
    }
    private constructor(middlewares: Middleware.Build[]) {
        this.middlewares = middlewares;
    }
    addMiddleware<
        //
        N extends string,
        ReqH extends z.AnyZodObject,
        ReqQ extends z.AnyZodObject,
        ResH extends z.AnyZodObject,
        Opt_ extends z.AnyZodObject,
        L,
        C extends Context,
    >(middleware: Middleware.Build<N, ReqH, ReqQ, ResH, Opt_, L, C>): Endpoint<Opt & Opt_['_output']> {
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
        L,
        C extends Context,
    >(
        params_: HttpEndpoint.Params<M, P, ReqH, ReqQ, ReqP, ReqB, ResH, ResB, L, C, Opt>
    ): HttpEndpoint.Build<M, P, ReqH, ReqQ, ReqP, ReqB, ResH, ResB, L, C, Opt> {
        const params = Object.freeze(Object.assign(params_, { endpoint: 'http', middlewares: this.middlewares } as const));
        return Object.assign(
            asyncFunction(
                Object.assign(params, {
                    _name: `(${params.method.toUpperCase()})${params.path}`,
                    _input: z.object({ headers: params.reqHeader, path: params.reqPath, query: params.reqQuery, body: params.reqBody }),
                    _output: z.object({ headers: params.resHeaders, body: params.resBody }),
                })
            ),
            params
        );
    }
    sse<
        //
        P extends string,
        ReqH extends z.AnyZodObject,
        ReqQ extends z.AnyZodObject,
        ReqP extends z.AnyZodObject,
        L,
        C extends Context,
    >(params_: SseEndpoint.Params<P, ReqH, ReqQ, ReqP, L, C, Opt>): SseEndpoint.Build<P, ReqH, ReqQ, ReqP, L, C, Opt> {
        const params = Object.freeze(Object.assign(params_, { endpoint: 'sse', middlewares: this.middlewares } as const));
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
            params
        );
    }
}
