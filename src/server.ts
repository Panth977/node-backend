import type Route from './route';
import type Middleware from './middleware';
import HttpsResponse from './response';
import type { Application, Response } from 'express';
import zodToJsonSchema from 'zod-to-json-schema';
import { z } from 'zod';
import { RequestSymbol, ResponseSymbol } from './params';
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
    private routes: { [ClassName in string]: (typeof Route)['__general'][] } = {};

    constructor(version: string, title: string, description?: string) {
        this.version = version;
        this.title = title;
        this.description = description;
    }

    addRoute<
        Method extends (typeof Route)['__general']['__method'],
        Path extends (typeof Route)['__general']['__path'],
        ParamsSchema extends Record<string, z.ZodType>,
        Attachments extends Record<string, unknown>,
        HeadersSchema extends (typeof Route)['__general']['__headersSchema'],
        QuerySchema extends (typeof Route)['__general']['__querySchema'],
        BodySchema extends (typeof Route)['__general']['__bodySchema'],
        ResponseData extends (typeof Route)['__general']['__responseData'],
        ResponseHeaders extends Record<string, string | number | readonly string[]>,
    >(
        collection: string,
        route: Route<Method, Path, ParamsSchema, Attachments, HeadersSchema, QuerySchema, BodySchema, ResponseData, ResponseHeaders>
    ): Server<Info & { [id in (typeof route)['__id']]: { request: (typeof route)['__request']; response: (typeof route)['__response'] } }> {
        (this.routes[collection] ??= []).push(route as never);
        return this as never;
    }

    serve(
        app: Application,
        onUnknownError = function (error: unknown): (typeof HttpsResponse)['__general'] {
            console.log(error);
            return new HttpsResponse('internal', 'Something went wrong', null);
        }
    ) {
        function parse<T, R>(val: T, getSchema: (val: T) => z.ZodType<R>, data: R) {
            if (!schema_memo.has(val)) schema_memo.set(val, getSchema(val));
            const result = (schema_memo.get(val) as z.ZodType<R>).safeParse(data);
            if (!result.success) throw new HttpsResponse('invalid-argument', 'Request was found to have wrong arguments', result.error);
            return result.data;
        }
        function getMiddlewareSchema(middleware: (typeof Middleware)['__general']) {
            return z.object({
                headers: z.object(middleware.headerSchema),
                query: z.object(middleware.querySchema),
            });
        }
        function getRouteSchema(route: (typeof Route)['__general']) {
            return z.object({
                headers: z.object(route.headerSchema),
                query: z.object(route.querySchema),
                body: route.bodySchema,
            });
        }
        function getParamsSchema(paramsSchema: (typeof Route)['__general']['__paramsSchema']) {
            return z.object(paramsSchema);
        }
        const schema_memo = new Map<unknown, z.ZodType>();
        function addResponseHeaders(headers: Record<string, string | number | readonly string[]>, response: Response) {
            for (const key in headers) {
                if (Object.prototype.hasOwnProperty.call(headers, key)) {
                    response.setHeader(key, headers[key]);
                }
            }
        }
        function setResponse(responseData: (typeof HttpsResponse)['__general'], response: Response) {
            response.status(responseData.httpErrorCode.status);
            response.send(responseData.toJSON());
        }
        for (const collection in this.routes) {
            for (const route of this.routes[collection]) {
                app[route.method](route.path, async function (request, response) {
                    try {
                        const payload = {
                            headers: {},
                            query: {},
                            body: null,
                            params: parse(route.paramsSchema, getParamsSchema, request.params),
                            [RequestSymbol]: request,
                            [ResponseSymbol]: response,
                        };
                        const attachments = {};
                        for (const middleware of route.middleware) {
                            const data = parse(middleware, getMiddlewareSchema, request);
                            Object.assign(payload.headers, data.headers);
                            Object.assign(payload.query, data.query);
                            const result = await middleware.implementation(payload, attachments, route);
                            addResponseHeaders(result.ResponseHeaders, response);
                            Object.assign(attachments, { [middleware.id]: result.Attachment });
                        }
                        const data = parse(route, getRouteSchema, request);
                        Object.assign(payload.headers, data.headers);
                        Object.assign(payload.query, data.query);
                        payload.body = data.body;
                        const result = await route.implementation(payload, attachments);
                        addResponseHeaders(result.ResponseHeaders, response);
                        setResponse(result.ResponseData, response);
                    } catch (error) {
                        setResponse(error instanceof HttpsResponse ? error : onUnknownError(error), response);
                    }
                });
            }
        }
    }

    toJson() {
        return {
            info: { version: this.version, title: this.title, description: this.description },
            routes: mapMapValues(this.routes, function (routes) {
                return foldArrayToMap(routes, 'ref', ({ headerSchema, querySchema, bodySchema, description, path, method, middleware }) => {
                    return {
                        description,
                        method,
                        path,
                        schema: zodToJsonSchema(
                            z.object({
                                headers: Object.assign({}, headerSchema, ...middleware.map(({ headerSchema }) => headerSchema)),
                                query: Object.assign({}, querySchema, ...middleware.map(({ querySchema }) => querySchema)),
                                body: bodySchema,
                            })
                        ),
                    };
                });
            }),
        };
    }
}
