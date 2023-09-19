import type Route from './route';
import zodToJsonSchema from 'zod-to-json-schema';
import { z } from 'zod';
import { foldArrayToMap, mapMapValues } from './helper';

export default class Server<
    Info extends {
        [id in (typeof Route)['__general']['__id']]: {
            request: (typeof Route)['__general']['__request'];
            response: (typeof Route)['__general']['__response'];
        };
    } = Record<never, never>,
> {
    readonly version: string;
    readonly title: string;
    readonly description?: string;
    private allowedHeaders = new Set(['X-Requested-With', 'Access-Control-Allow-Origin', 'Content-Type']);
    private allowedMethods = new Set<string>();
    readonly routes: { [ClassName in string]: (typeof Route)['__general'][] } = {};

    get AllowedHeaders() {
        return [...this.allowedHeaders];
    }
    get AllowedMethods() {
        return [...this.allowedMethods].map((x) => x.toUpperCase());
    }

    constructor(version: string, title: string, description?: string) {
        this.version = version;
        this.title = title;
        this.description = description;
    }
    declare static __general: Server<
        Record<
            (typeof Route)['__general']['__id'],
            { request: (typeof Route)['__general']['__request']; response: (typeof Route)['__general']['__response'] }
        >
    >;

    addRoute<
        Method extends (typeof Route)['__general']['__method'],
        Path extends (typeof Route)['__general']['__path'],
        ParamsSchema extends Record<string, z.ZodType>,
        Attachments extends Record<string, unknown>,
        HeadersSchema extends (typeof Route)['__general']['__headersSchema'],
        QuerySchema extends (typeof Route)['__general']['__querySchema'],
        BodySchema extends (typeof Route)['__general']['__bodySchema'],
        ImplementationReturn extends (typeof Route)['__general']['__implementationReturn'],
        ResponseData extends (typeof Route)['__general']['__responseData'],
        ResponseHeaders extends (typeof Route)['__general']['__responseHeaders'],
    >(
        collection: string,
        route: Route<
            Method,
            Path,
            ParamsSchema,
            Attachments,
            HeadersSchema,
            QuerySchema,
            BodySchema,
            ImplementationReturn,
            ResponseData,
            ResponseHeaders
        >
    ): Server<Info & { [id in (typeof route)['__id']]: { request: (typeof route)['__request']; response: (typeof route)['__response'] } }> {
        (this.routes[collection] ??= []).push(route as never);
        this.allowedMethods.add(route.method);
        for (const middleware of route.middleware) {
            for (const key in middleware.headerSchema) {
                this.allowedHeaders.add(key);
            }
        }
        for (const key in route.headerSchema) {
            this.allowedHeaders.add(key);
        }
        return this as never;
    }

    toJson() {
        return {
            info: { version: this.version, title: this.title, description: this.description },
            routes: mapMapValues(this.routes, function (routes) {
                return foldArrayToMap(
                    routes,
                    'ref',
                    ({ headerSchema, querySchema, bodySchema, description, path, method, middleware, responseHeadersSchema, responseDataSchema }) => {
                        return {
                            description,
                            method,
                            path,
                            request: zodToJsonSchema(
                                z.object({
                                    headers: z.object(Object.assign({}, ...middleware.map(({ headerSchema }) => headerSchema), headerSchema)),
                                    query: z.object(Object.assign({}, ...middleware.map(({ querySchema }) => querySchema), querySchema)),
                                    body: bodySchema,
                                })
                            ),
                            response: zodToJsonSchema(
                                z.object({
                                    headers: z.object(
                                        Object.assign(
                                            {},
                                            ...middleware.map(({ responseHeadersSchema }) => responseHeadersSchema),
                                            responseHeadersSchema
                                        )
                                    ),
                                    data: z.object({
                                        data: responseDataSchema,
                                        message: z.string(),
                                        status: z.literal('ok'),
                                    }),
                                })
                            ),
                        };
                    }
                );
            }),
        };
    }
}
