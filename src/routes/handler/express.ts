import createHttpError from 'http-errors';
import { RequestHandler, Router, ErrorRequestHandler, Request, Response } from 'express';
import { HttpEndpoint } from '../http';
import { SseEndpoint } from '../sse';
import { Context, DefaultBuildContext } from '../../functions';
import { Middleware } from '../middleware';
import * as swaggerUi from 'swagger-ui-express';
import { getEndpointsFromBundle } from '../endpoint';
import { generateCodeHttpFactory } from '../code-gen-endpoints';
import { OpenAPIObject } from '../../type/zod-openapi';

export function pathParser(path: string) {
    return path.replace(/{([^}]+)}/g, ':$1');
}
const expressSymbol = Symbol();
export type Locals = { context: Context; options: Record<never, never> };

export function getExpressReqRes<C extends Context>(context: C): { req: Request; res: Response } {
    return (context as never)[expressSymbol];
}

export function setupContext(): RequestHandler<never, never, never, never, Locals> {
    return function (req, res, nxt) {
        res.locals.context = DefaultBuildContext(null);
        Object.assign(res.locals.context, { [expressSymbol]: { req, res } });
        res.locals.options = {};
        res.on('finish', () => res.locals.context.dispose());
        nxt();
    };
}

export function createHandler(
    build: Middleware.Build | HttpEndpoint.Build | SseEndpoint.Build
): RequestHandler<unknown, unknown, unknown, unknown, Locals> {
    if (build.endpoint === 'middleware') {
        return async function (req, res, nxt) {
            try {
                res.locals.context.log('🔄 ' + build.getRef());
                const input = { headers: req.headers, query: req.query };
                const output = await build(res.locals.context, input);
                if (output.headers) for (const key in output.headers) res.setHeader(key, output.headers[key as keyof typeof output.headers]);
                Object.assign(res.locals.options, output.options);
                res.locals.context.log('✅ ' + build.getRef());
                nxt();
            } catch (error) {
                res.locals.context.log('❌ ' + build.getRef());
                nxt(error);
            }
        };
    }
    if (build.endpoint === 'http') {
        return async function (req, res, nxt) {
            try {
                res.locals.context.log('🔄 ' + build.getRef());
                const input = { body: req.body, headers: req.headers, path: req.params, query: req.query };
                const context = Object.assign({}, res.locals.context, { options: res.locals.options });
                const output = await build(context, input);
                if (output.headers) for (const key in output.headers) res.setHeader(key, output.headers[key as keyof typeof output.headers]);
                const contentTypeKey = Object.keys(output.headers ?? {}).find((x) => x.toLowerCase() === 'content-type');
                const contentTypeVal = ((output.headers as Record<string, string> | undefined) ?? {})[contentTypeKey ?? ''] ?? 'application/json';
                res = res.status(200);
                if (contentTypeVal.toLowerCase() !== 'application/json') {
                    res = res.send(output.body);
                } else {
                    res = res.json(output.body);
                }
                res.locals.context.log('✅ ' + build.getRef());
            } catch (error) {
                res.locals.context.log('❌ ' + build.getRef());
                nxt(error);
            }
        };
    }
    if (build.endpoint === 'sse') {
        return async function (req, res, nxt) {
            res.locals.context.log('🔄 ' + build.getRef());
            let closed = false;
            try {
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Connection', 'keep-alive');
                res.flushHeaders(); // flush the headers to establish SSE with client
                res.on('close', () => {
                    closed = true;
                });
            } catch (error) {
                res.locals.context.log('❌ ' + build.getRef());
                nxt(error);
                return;
            }
            try {
                const input = { body: req.body, headers: req.headers, path: req.params, query: req.query };
                const g = build(Object.assign({}, res.locals.context, { options: res.locals.options }), input);
                let val = await g.next();
                while (!val.done && !closed) {
                    res.write(`data: ${JSON.stringify(val.value)}\n\n`);
                    val = await g.next();
                }
                res.locals.context.log('✅ ' + build.getRef());
            } catch (error) {
                res.locals.context.log(error);
                res.locals.context.log('❌ ' + build.getRef());
            }
            res.write(`data: ${JSON.stringify(null)}\n\n`);
            res.end();
        };
    }
    throw new Error('Unimplemented');
}

function defaultOnError(context: Context | undefined | null, error: unknown): createHttpError.HttpError {
    if (createHttpError.isHttpError(error)) return error;
    if (context) {
        context.log('Request Error:', error);
    } else {
        console.error('Request Error:', error);
    }
    return createHttpError.InternalServerError('Something went wrong!');
}

export function createErrorHandler(onError: typeof defaultOnError): ErrorRequestHandler<never, never, never, never, Locals> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return function (error, req, res, next) {
        error = onError(res.locals.context, error);
        for (const key in error.headers) res.setHeader(key, error.headers[key]);
        res.status(error.status).json(error.message);
    };
}

export function serve(endpoints: Record<string, HttpEndpoint.Build | SseEndpoint.Build>, onError = defaultOnError, logRoute = false) {
    const router = Router();
    router.use(setupContext());
    for (const build of Object.values(endpoints)) {
        const { method, path } = build;
        router[method](pathParser(path), ...build.middlewares.map(createHandler), createHandler(build));
        if (logRoute) console.log('Route build success:  ', method.toUpperCase(), '\t', path);
    }
    router.use(createErrorHandler(onError));
    return { router };
}

export function createSwagger(
    middlewares: Middleware.Build[],
    json: OpenAPIObject,
    opts?: swaggerUi.SwaggerUiOptions,
    options?: swaggerUi.SwaggerOptions,
    customCss?: string,
    customfavIcon?: string,
    swaggerUrl?: string,
    customSiteTitle?: string
) {
    const JsonPath = '/.json';
    const UiPath = '/';
    const middlewareHandlers: RequestHandler[] = (middlewares ?? []).map(createHandler) as never;
    const router = Router();
    router.get(JsonPath, ...middlewareHandlers, (_, res) => res.send(json));
    router.use(UiPath, ...middlewareHandlers, swaggerUi.serve, function (...args: Parameters<ReturnType<typeof swaggerUi.setup>>) {
        swaggerUi.setup(json, opts, options, customCss, customfavIcon, swaggerUrl, customSiteTitle)(...args);
    });
    return { JsonPath, UiPath, router };
}

export function serveCodeGen(middlewares: Middleware.Build[], json: OpenAPIObject) {
    const endpoints = generateCodeHttpFactory(middlewares, json);
    const BundledEndpoints = getEndpointsFromBundle(endpoints);
    const src = serve(BundledEndpoints);
    return { endpoints, BundledEndpoints, ...src };
}
