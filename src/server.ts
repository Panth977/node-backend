import type RController from './route_controller';
import zodToJsonSchema from 'zod-to-json-schema';
import { z } from 'zod';
import { foldArrayToMap, mapMapValues } from './helper';
import Schema, { InferInput, InferOutput } from './schema';
import HttpsResponse, { ResponseData } from './response';
import Route from './route';

type AsResponse<R extends InferOutput<Schema>> = { header: R['header']; body: ResponseData<HttpsResponse<'ok', R['body']>> };
export default class Server<
    Structure extends {
        [id in Route['ref']]: {
            route: Route['configs'];
            request: InferInput<RController['request']>;
            response: AsResponse<InferOutput<RController['response']>>;
        };
    } = Record<
        RController['info']['ref'],
        {
            route: Route['configs'];
            request: InferInput<RController['request']>;
            response: AsResponse<InferOutput<RController['response']>>;
        }
    >,
> {
    readonly version: string;
    readonly title: string;
    readonly description: undefined | string;

    private allowedHeaders = new Set(['X-Requested-With', 'Access-Control-Allow-Origin', 'Content-Type']);
    private allowedMethods = new Set<string>();
    readonly routes: { [ClassName in string]: RController[] } = {};

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

    addRoute<
        Info extends RController['info'],
        Requirements extends RController['requirements'],
        Request extends RController['request'],
        Response extends RController['response'],
    >(
        collection: string,
        rController: RController<Info, Requirements, Request, Response>
    ): Server<
        Structure & {
            [k in Info['ref']]: {
                route: Route['configs'];
                request: InferInput<Request>;
                response: AsResponse<InferOutput<Response>>;
            };
        }
    > {
        (this.routes[collection] ??= []).push(rController as never);
        this.allowedMethods.add(rController.info.method);
        for (const key in rController.request.header) {
            this.allowedHeaders.add(key);
        }
        return this as never;
    }

    toJson() {
        const messageParser = z.string({ description: 'Custom Server sent message, for Client' });
        const okStatusParser = z.literal('ok', { description: 'Success Response Status code' });
        return {
            info: { version: this.version, title: this.title, description: this.description },
            routes: mapMapValues(this.routes, function (routes) {
                return foldArrayToMap(
                    routes,
                    (rController) => rController.info.ref,
                    (rController) => {
                        return {
                            route: {
                                description: rController.info.description,
                                method: rController.info.method,
                                path: rController.info.path,
                                configs: rController.info.configs,
                            },
                            request: {
                                params: zodToJsonSchema(z.object(rController.info.params)),
                                header: zodToJsonSchema(z.object(rController.request.header)),
                                query: zodToJsonSchema(z.object(rController.request.query)),
                                body: zodToJsonSchema(rController.request.body),
                            },
                            response: {
                                header: zodToJsonSchema(z.object(rController.response.header)),
                                body: zodToJsonSchema(
                                    z.object({
                                        data: rController.response.body,
                                        message: messageParser,
                                        status: okStatusParser,
                                    })
                                ),
                            },
                        };
                    }
                );
            }),
        };
    }
}
