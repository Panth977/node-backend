import { z } from 'zod';
import { Middleware } from './middleware';
import { SseEndpoint, createSse } from './sse';
import { Context } from '../functions';
import { HttpEndpoint, Method, createHttp } from './http';

export class BundleEndpoints {
    private allReady: (HttpEndpoint.Build | SseEndpoint.Build)[] = [];
    private allTodo: (HttpEndpoint.Build | SseEndpoint.Build)[] = [];
    set ready(build: unknown) {
        this.allReady.push(build as never);
    }
    set todo(build: unknown) {
        this.allTodo.push(build as never);
    }
    getReadyEndpoints() {
        return this.allReady;
    }
    getAllTodo() {
        return this.allTodo;
    }
}

export class Endpoint<Opt extends Record<never, never>> {
    middlewares: Middleware.Build[];
    tags: string[];
    static build() {
        return new Endpoint([], []);
    }
    private constructor(middlewares: Middleware.Build[], tags: string[]) {
        this.middlewares = middlewares;
        this.tags = tags;
    }
    addMiddleware<
        //
        N extends string,
        ReqH extends undefined | z.AnyZodObject,
        ReqQ extends undefined | z.AnyZodObject,
        ResH extends undefined | z.AnyZodObject,
        Opt_ extends z.AnyZodObject,
        L,
        C extends Context,
    >(middleware: Middleware.Build<N, ReqH, ReqQ, ResH, Opt_, L, C>): Endpoint<Opt & Opt_['_output']> {
        return new Endpoint([...this.middlewares, middleware as never], this.tags);
    }
    addTags(...tags: string[]): Endpoint<Opt> {
        return new Endpoint(this.middlewares, [...this.tags, ...tags]);
    }
    http<
        //
        M extends Method,
        P extends string,
        ReqH extends undefined | z.AnyZodObject,
        ReqQ extends undefined | z.AnyZodObject,
        ReqP extends undefined | z.AnyZodObject,
        ReqB extends undefined | z.ZodType,
        ResH extends undefined | z.AnyZodObject,
        ResB extends undefined | z.ZodType,
        L,
        C extends Context,
    >(
        method: M,
        path: P,
        _params: HttpEndpoint._Params<M, P, ReqH, ReqQ, ReqP, ReqB, ResH, ResB, L, C, Opt>
    ): HttpEndpoint.Build<M, P, ReqH, ReqQ, ReqP, ReqB, ResH, ResB, L, C, Opt> {
        _params.tags = (_params.tags ??= []).concat(this.tags);
        return createHttp(method, path, this.middlewares, _params);
    }
    sse<
        //
        P extends string,
        ReqH extends undefined | z.AnyZodObject,
        ReqQ extends undefined | z.AnyZodObject,
        ReqP extends undefined | z.AnyZodObject,
        L,
        C extends Context,
    >(method: 'get', path: P, _params: SseEndpoint._Params<P, ReqH, ReqQ, ReqP, L, C, Opt>): SseEndpoint.Build<P, ReqH, ReqQ, ReqP, L, C, Opt> {
        (_params.tags ??= []).concat(this.tags);
        return createSse(method, path, this.middlewares, _params);
    }
}
