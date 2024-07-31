import { z } from 'zod';
import { Middleware } from './middleware';
import { SseEndpoint, createSse } from './sse';
import { Context } from '../functions';
import { HttpEndpoint, createHttp } from './http';
import { createDocument, ZodOpenApiObject, ZodOpenApiPathsObject } from 'zod-openapi';
import { OpenAPIObject } from 'zod-openapi/lib-types/openapi3-ts/dist/oas30';

export function getRouteDocJson(
    docEndpoints: Record<string, HttpEndpoint.Build | SseEndpoint.Build>,
    params: Pick<ZodOpenApiObject, 'info' | 'tags' | 'servers' | 'security' | 'externalDocs'>
): OpenAPIObject {
    const paths: ZodOpenApiPathsObject = {};
    for (const build of Object.values(docEndpoints)) {
        const { method, path } = build;
        (paths[path] ??= {})[method] = build.documentation;
    }
    return createDocument({ ...params, paths: paths, openapi: '3.0.1' }) as never;
}

export function getEndpointsFromBundle<B extends Record<never, never>>(bundle: B, options?: { includeTags?: string[]; excludeTags?: string[] }) {
    const allReady: Record<string, HttpEndpoint.Build | SseEndpoint.Build> = {};
    for (const loc in bundle) {
        const build = bundle[loc];
        if (typeof build === 'function' && 'endpoint' in build && build.endpoint === 'http') {
            allReady[loc] = build as unknown as HttpEndpoint.Build;
        }
        if (typeof build === 'function' && 'endpoint' in build && build.endpoint === 'sse') {
            allReady[loc] = build as unknown as SseEndpoint.Build;
        }
    }
    if (options?.includeTags) {
        const tags = new Set(options.includeTags);
        loop: for (const loc in allReady) {
            for (const tag of allReady[loc].documentation.tags ?? []) {
                if (tags.has(tag)) {
                    continue loop;
                }
            }
            delete allReady[loc];
        }
    }
    if (options?.excludeTags) {
        const tags = new Set(options.excludeTags);
        loop: for (const loc in allReady) {
            for (const tag of allReady[loc].documentation.tags ?? []) {
                if (tags.has(tag)) {
                    delete allReady[loc];
                    continue loop;
                }
            }
        }
    }
    return allReady;
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
        ReqH extends undefined | z.AnyZodObject,
        ReqQ extends undefined | z.AnyZodObject,
        ResH extends undefined | z.AnyZodObject,
        Opt_ extends z.AnyZodObject,
        L,
        C extends Context,
    >(middleware: Middleware.Build<ReqH, ReqQ, ResH, Opt_, L, C>): Endpoint<Opt & Opt_['_output']> {
        return new Endpoint([...this.middlewares, middleware as never], this.tags);
    }
    addTags(...tags: string[]): Endpoint<Opt> {
        return new Endpoint(this.middlewares, [...this.tags, ...tags]);
    }
    http<
        //
        ReqH extends undefined | z.AnyZodObject,
        ReqQ extends undefined | z.AnyZodObject,
        ReqP extends undefined | z.AnyZodObject,
        ReqB extends undefined | z.ZodType,
        ResH extends undefined | z.AnyZodObject,
        ResB extends undefined | z.ZodType,
        L,
        C extends Context,
    >(
        method: HttpEndpoint.Method,
        path: string,
        _params: HttpEndpoint._Params<ReqH, ReqQ, ReqP, ReqB, ResH, ResB, L, C, Opt>
    ): HttpEndpoint.Build<ReqH, ReqQ, ReqP, ReqB, ResH, ResB, L, C, Opt> {
        _params.tags = (_params.tags ??= []).concat(this.tags);
        return createHttp(this.middlewares, method, path, _params);
    }
    sse<
        //
        ReqH extends undefined | z.AnyZodObject,
        ReqQ extends undefined | z.AnyZodObject,
        ReqP extends undefined | z.AnyZodObject,
        L,
        C extends Context,
    >(
        method: SseEndpoint.Method,
        path: string,
        _params: SseEndpoint._Params<ReqH, ReqQ, ReqP, L, C, Opt>
    ): SseEndpoint.Build<ReqH, ReqQ, ReqP, L, C, Opt> {
        (_params.tags ??= []).concat(this.tags);
        return createSse(this.middlewares, method, path, _params);
    }
}
