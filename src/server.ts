import type Route from './route';
import zodToJsonSchema from 'zod-to-json-schema';
import { z } from 'zod';
import { GeneralType, Types, foldArrayToMap, general, mapMapValues, schema, types } from './helper';

export default class Server<
    Info extends {
        [id in (typeof Route)[GeneralType][Types]['ID']]: {
            request: (typeof Route)[GeneralType][Types]['Request'];
            response: (typeof Route)[GeneralType][Types]['Response'];
        };
    } = Record<never, never>,
> {
    readonly version: string;
    readonly title: string;
    readonly description?: string;
    private allowedHeaders = new Set(['X-Requested-With', 'Access-Control-Allow-Origin', 'Content-Type']);
    private allowedMethods = new Set<string>();
    readonly routes: { [ClassName in string]: (typeof Route)[GeneralType][] } = {};

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

    declare [types]: {
        Info: Info;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    declare static [general]: Server<any>;

    addRoute<R extends (typeof Route)[GeneralType]>(
        collection: string,
        route: R
    ): Server<
        Info & {
            [id in R[Types]['ID']]: {
                request: R[Types]['Request'];
                response: R[Types]['Response'];
            };
        }
    > {
        (this.routes[collection] ??= []).push(route as never);
        this.allowedMethods.add(route.method);
        for (const key in route[schema].headerSchema) {
            this.allowedHeaders.add(key);
        }
        return this as never;
    }

    toJson() {
        return {
            info: { version: this.version, title: this.title, description: this.description },
            routes: mapMapValues(this.routes, function (routes) {
                return foldArrayToMap(routes, 'ref', (route) => {
                    const { description, path, method } = route;
                    const { bodySchema, headerSchema, paramsSchema, querySchema, responseDataSchema, responseHeadersSchema } = route[schema];
                    return {
                        description,
                        method,
                        path,
                        request: zodToJsonSchema(
                            z.object({
                                params: z.object(paramsSchema),
                                headers: z.object(headerSchema),
                                query: z.object(querySchema),
                                body: bodySchema,
                            })
                        ),
                        response: zodToJsonSchema(
                            z.object({
                                headers: z.object(responseHeadersSchema),
                                data: z.object({
                                    data: responseDataSchema,
                                    message: z.string(),
                                    status: z.literal('ok'),
                                }),
                            })
                        ),
                    };
                });
            }),
        };
    }
}
