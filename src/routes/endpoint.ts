import { z } from 'zod';
import { Middleware } from './middleware';
import { SseEndpoint, createSse } from './sse';
import { Context, AsyncFunction, AsyncGenerator } from '../functions';
import { HttpEndpoint, createHttp } from './http';
import { createDocument, ZodOpenApiObject, ZodOpenApiPathsObject, ZodOpenApiResponsesObject } from 'zod-openapi';
import { OpenAPIObject } from '../type/zod-openapi';

export function getRouteDocJson(
    docEndpoints: Record<string, HttpEndpoint.Build | SseEndpoint.Build>,
    params: Pick<ZodOpenApiObject, 'info' | 'tags' | 'servers' | 'security' | 'externalDocs' | 'components'>
): OpenAPIObject {
    const paths: ZodOpenApiPathsObject = {};
    const securityData = Object.assign({}, params.components?.securitySchemes ?? {});
    for (const build of Object.values(docEndpoints)) {
        const { method, path } = build;
        const middlewares = build.middlewares;
        const security = [...middlewares.map((m) => m.security ?? {}), build.security ?? {}];
        Object.assign(securityData, ...security);
        if (build.endpoint === 'http') {
            (paths[path] ??= {})[method] = {
                operationId: build.getName(),
                tags: middlewares.reduce((tags, m) => [...tags, ...(m.tags ?? [])], [...(build.tags ?? [])]),
                security: security.map((security) => Object.fromEntries(Object.keys(security).map((x) => [x, []]))),
                description: build.description,
                summary: build.summary,
                requestParams: {
                    header: z.object(
                        middlewares.reduce((shape, middleware) => Object.assign(shape, middleware._input.shape.headers?.shape ?? {}), {
                            ...(build._input.shape.headers?.shape ?? {}),
                        })
                    ),
                    query: z.object(
                        middlewares.reduce((shape, middleware) => Object.assign(shape, middleware._input.shape.query?.shape ?? {}), {
                            ...(build._input.shape.query?.shape ?? {}),
                        })
                    ),
                    path: z.object({ ...(build._input.shape.path?.shape ?? {}) }),
                },
                requestBody: {
                    content: {
                        [build.reqMediaTypes ?? 'application/json']: {
                            schema: build._input.shape.body,
                        },
                    },
                },
                responses: {
                    default: {
                        content: {
                            [build.resMediaTypes ?? 'application/json']: {
                                schema: build._output.shape.body,
                            },
                        },
                        headers: z.object(
                            middlewares.reduce((shape, middleware) => Object.assign(shape, middleware._output.shape.headers?.shape ?? {}), {
                                ...(build._output.shape.headers?.shape ?? {}),
                            })
                        ),
                    },
                } as ZodOpenApiResponsesObject,
            };
        }
        if (build.endpoint === 'sse') {
            (paths[path] ??= {})[method] = {
                operationId: build.getName(),
                tags: middlewares.reduce((tags, m) => tags.concat(m.tags ?? []), [...(build.tags ?? [])]),
                security: security.map((security) => Object.fromEntries(Object.keys(security).map((x) => [x, []]))),
                description: build.description,
                summary: build.summary,
                requestParams: {
                    header: z.object(
                        middlewares.reduce((shape, middleware) => Object.assign(shape, middleware._input.shape.headers?.shape ?? {}), {})
                    ),
                    query: z.object(
                        middlewares.reduce((shape, middleware) => Object.assign(shape, middleware._input.shape.query?.shape ?? {}), {
                            ...(build._input.shape.query?.shape ?? {}),
                        })
                    ),
                    path: z.object({ ...(build._input.shape.path?.shape ?? {}) }),
                },
                responses: {
                    default: {
                        description: 'Server side event!',
                        content: {
                            'text/event-stream': {
                                schema: z.string(),
                            },
                        },
                        headers: z.object({
                            'Content-Type': z.literal('text/event-stream'),
                        }),
                    },
                },
            };
        }
    }
    (params.components ??= {}).securitySchemes = securityData;
    return createDocument({ ...params, paths: paths, openapi: '3.1.0' });
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
            const docTags = allReady[loc].middlewares.reduce((tags, m) => [...tags, ...(m.tags ?? [])], [...(allReady[loc].tags ?? [])]);
            for (const tag of docTags) {
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
            const docTags = allReady[loc].middlewares.reduce((tags, m) => [...tags, ...(m.tags ?? [])], [...(allReady[loc].tags ?? [])]);
            for (const tag of docTags) {
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
        I extends z.AnyZodObject,
        O extends z.AnyZodObject,
        L,
        C extends Context,
        W extends [] | [AsyncFunction.WrapperBuild<I, O, L, C>, ...AsyncFunction.WrapperBuild<I, O, L, C>[]],
    >(middleware: Middleware.Build<I, O, L, C, W>): Endpoint<Opt & Middleware.inferOptions<O>['_output']> {
        return new Endpoint([...this.middlewares, middleware as never], this.tags);
    }
    addTags(...tags: string[]): Endpoint<Opt> {
        return new Endpoint(this.middlewares, [...this.tags, ...tags]);
    }
    http<
        //
        I extends z.AnyZodObject,
        O extends z.AnyZodObject,
        L,
        C extends Context,
        W extends [] | [AsyncFunction.WrapperBuild<I, O, L, C & { options: Opt }>, ...AsyncFunction.WrapperBuild<I, O, L, C & { options: Opt }>[]],
    >(method: HttpEndpoint.Method, path: string, _params: HttpEndpoint._Params<I, O, L, C, Opt, W>): HttpEndpoint.Build<I, O, L, C, Opt, W> {
        _params.tags = (_params.tags ??= []).concat(this.tags);
        return createHttp(this.middlewares, method, path, _params);
    }
    sse<
        //
        I extends z.AnyZodObject,
        Y extends z.ZodString,
        L,
        C extends Context,
        W extends
            | []
            | [
                  AsyncGenerator.WrapperBuild<I, Y, z.ZodVoid, z.ZodVoid, L, C & { options: Opt }>,
                  ...AsyncGenerator.WrapperBuild<I, Y, z.ZodVoid, z.ZodVoid, L, C & { options: Opt }>[],
              ],
    >(method: SseEndpoint.Method, path: string, _params: SseEndpoint._Params<I, Y, L, C, Opt, W>): SseEndpoint.Build<I, Y, L, C, Opt, W> {
        (_params.tags ??= []).concat(this.tags);
        return createSse(this.middlewares, method, path, _params);
    }
}
