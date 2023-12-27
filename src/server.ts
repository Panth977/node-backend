import RouteController from './route_controller';
import zodToJsonSchema from 'zod-to-json-schema';
import { z } from 'zod';
import Schema, { InferInput, InferOutput } from './schema';
import HttpsResponse, { ResponseData } from './response';
import Route from './route';

function zodToSchema(zod: z.ZodType): unknown {
    return zodToJsonSchema(zod);
}

type AsResponse<R extends InferOutput<Schema>> = { header: R['header']; body: ResponseData<HttpsResponse<'ok', R['body']>> };
export default class Server<
    Structure extends {
        [id in Route['ref']]: {
            request: InferInput<RouteController['request']>;
            response: AsResponse<InferOutput<RouteController['response']>>;
        };
    } = Record<never, never>,
> {
    readonly version: string;
    readonly title: string;
    readonly description: undefined | string;

    private allowedHeaders = new Set(['X-Requested-With', 'Access-Control-Allow-Origin', 'Content-Type']);
    private allowedMethods = new Set<string>();
    readonly routes: RouteController[] = [];

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addRoute<R>(route: R): R extends RouteController<any, any, any, any, any>
        ? Server<
              Structure & {
                  [k in R['info']['ref']]: {
                      request: InferInput<R['request']>;
                      response: AsResponse<InferOutput<R['response']>>;
                  };
              }
          >
        : this {
        if (typeof route !== 'object' || !(route instanceof RouteController)) return this as never;
        this.routes.push(route);
        this.allowedMethods.add(route.info.method);
        for (const key in route.request.header) this.allowedHeaders.add(key);
        return this as never;
    }

    toJson() {
        const messageParser = z.string({ description: 'Custom Server sent message, for Client' });
        const okStatusParser = z.literal('ok', { description: 'Success Response Status code' });
        return {
            info: { version: this.version, title: this.title, description: this.description },
            routes: this.routes.map(function (route) {
                return {
                    method: route.info.method,
                    path: route.info.path,
                    about: {
                        description: route.info.description,
                        tags: route.info.tags,
                        features: route.info.features,
                    },
                    request: {
                        params: zodToSchema(z.object(route.info.params)),
                        header: zodToSchema(z.object(route.request.header)),
                        query: zodToSchema(z.object(route.request.query)),
                        body: zodToSchema(route.request.body),
                    },
                    response: {
                        header: zodToSchema(z.object(route.response.header)),
                        body: zodToSchema(
                            z.object({
                                data: route.response.body,
                                message: messageParser,
                                status: okStatusParser,
                            })
                        ),
                    },
                };
            }),
        };
    }
}
