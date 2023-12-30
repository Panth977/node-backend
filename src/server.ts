import RouteController from './route_controller';
import { z } from 'zod';
import Schema, { InferInput, InferOutput } from './schema';
import HttpsResponse, { ResponseData } from './response';
import Route from './route';
import { ZodOpenApiPathsObject, createDocument } from 'zod-openapi';
import { getRequestParser, getResponseParser } from './execution';

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

    openApiJson() {
        const paths: ZodOpenApiPathsObject = {};
        for (const route of this.routes) {
            const reqParser = getRequestParser(route);
            const resParser = getResponseParser(route);
            (paths[route.info.path] ??= {})[route.info.method] = {
                description: route.info.description,
                requestParams: { path: reqParser.shape.params, header: reqParser.shape.header, query: reqParser.shape.query },
                requestBody:
                    reqParser.shape.body instanceof z.ZodUnknown
                        ? undefined
                        : {
                              content: {
                                  'application/json': {
                                      schema: reqParser.shape.body,
                                  },
                              },
                          },
                responses: {
                    200: {
                        description: 'Success Response',
                        headers: resParser.shape.header,
                        content: {
                            'application/json': {
                                schema: z.object({
                                    data: resParser.shape.data,
                                    message: resParser.shape.message,
                                    status: z.string(),
                                }),
                            },
                        },
                    },
                },
            };
        }
        const documentation = createDocument({
            info: { title: this.title, version: this.version, description: this.description },
            openapi: '3.1.0',
            paths: paths,
        });
        return documentation;
    }
}
