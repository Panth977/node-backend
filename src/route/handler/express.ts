import createHttpError from 'http-errors';
import { RequestHandler, Router, ErrorRequestHandler, Request, Response } from 'express';
import { HttpEndpoint } from '../http';
import { SseEndpoint } from '../sse';
import { Context, DefaultBuildContext } from '../../functions';
import { Middleware } from '../middleware';
import * as swaggerUi from 'swagger-ui-express';
import { ZodOpenApiObject, ZodOpenApiPathsObject, createDocument } from 'zod-openapi';
import * as code from '../code';
import { OpenAPIObject } from 'zod-openapi/lib-types/openapi3-ts/dist/oas31';

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

export function createHandler(build: Middleware.Build | HttpEndpoint.Build | SseEndpoint.Build): RequestHandler<never, never, never, never, Locals> {
    if (build.endpoint === 'middleware') {
        return async function (req, res, nxt) {
            try {
                const input = { headers: req.headers, query: req.query };
                const output = await build(res.locals.context, input);
                for (const key in output.headers) res.setHeader(key, output.headers[key]);
                Object.assign(res.locals.options, output.options);
                nxt();
            } catch (error) {
                nxt(error);
            }
        };
    }
    if (build.endpoint === 'http') {
        return async function (req, res, nxt) {
            try {
                const input = { body: req.body, headers: req.headers, path: req.params, query: req.query };
                const context = Object.assign({}, res.locals.context, { options: res.locals.options });
                const output = await build(context, input);
                for (const key in output.headers) res.setHeader(key, output.headers[key]);
                const contentTypeKey = Object.keys(output.headers ?? {}).find((x) => x.toLowerCase() === 'content-type');
                const contentTypeVal = output.headers?.[contentTypeKey ?? ''] ?? 'application/json';
                if (contentTypeVal.toLowerCase() !== 'application/json') {
                    res.status(200).send(output.body);
                } else {
                    res.status(200).json(output.body);
                }
            } catch (error) {
                nxt(error);
            }
        };
    }
    if (build.endpoint === 'sse') {
        return async function (req, res, nxt) {
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
                nxt(error);
            }
            try {
                const input = { body: req.body, headers: req.headers, path: req.params, query: req.query };
                const g = build(Object.assign({}, res.locals.context, { options: res.locals.options }), input);
                let val = await g.next();
                while (!val.done && !closed) {
                    res.write(`data: ${JSON.stringify(val.value)}\n\n`);
                    val = await g.next();
                }
            } catch (error) {
                console.log(error);
            }
            res.write(`data: ${JSON.stringify(null)}\n\n`);
            res.end();
        };
    }
    throw new Error('Unimplemented');
}

function defaultOnError(error: unknown): createHttpError.HttpError {
    console.error('Request Error:', error);
    if (createHttpError.isHttpError(error)) return error;
    console.log(error);
    return createHttpError.InternalServerError('Something went wrong!');
}

export function createErrorHandler(onError: typeof defaultOnError): ErrorRequestHandler {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return function (error, req, res, next) {
        try {
            error = onError(error);
            console.error('Request Error:', error);
            for (const key in error.headers) res.setHeader(key, error.headers[key]);
            res.status(error.status).json(error.message);
        } catch (err) {
            console.error(err);
            res.status(500).json('Something went wrong!');
        }
    };
}

export function serve(
    endpoints: Record<string, HttpEndpoint.Build | SseEndpoint.Build>,
    onError = defaultOnError,
    documentationParams?: {
        params: Pick<ZodOpenApiObject, 'info' | 'tags' | 'servers' | 'security' | 'openapi' | 'externalDocs'>;
        serveJsonOn?: string;
        serveCodesOn?: string;
        serveUiOn: string;
        middlewares?: RequestHandler[];
    }
) {
    const router = Router();
    router.use(setupContext());
    for (const build of Object.values(endpoints)) {
        const { method, path } = build;
        router[method](pathParser(path), ...build.middlewares.map(createHandler), createHandler(build));
        console.log('Route build success:  ', method.toUpperCase(), '\t', path);
    }
    router.use(createErrorHandler(onError));
    if (documentationParams) {
        try {
            const paths: ZodOpenApiPathsObject = {};
            for (const build of Object.values(endpoints)) {
                const { method, path } = build;
                (paths[path] ??= {})[method] = build.documentation;
            }
            const jsonDoc = createDocument({ ...documentationParams.params, paths: paths });
            if (documentationParams.serveJsonOn) {
                router.get(documentationParams.serveJsonOn, ...(documentationParams.middlewares ?? []), (_, res) => res.send(jsonDoc));
            }
            if (documentationParams.serveCodesOn) {
                router.get(documentationParams.serveCodesOn, ...(documentationParams.middlewares ?? []), function (req, res) {
                    const type = req.query.type;
                    if (!type) {
                        res.json(Object.keys(code));
                    } else {
                        try {
                            const genFn = (code as Record<string, (context: unknown, json: OpenAPIObject) => string>)[type as string];
                            if (!genFn) {
                                res.status(404).send('No Such code parser found');
                                return;
                            }
                            const genCode = genFn(req.query, jsonDoc);
                            res.status(200).json(genCode);
                        } catch (err) {
                            res.status(500).send(err);
                        }
                    }
                });
            }
            router.use(documentationParams.serveUiOn, ...(documentationParams.middlewares ?? []), swaggerUi.serve, swaggerUi.setup(jsonDoc));
        } catch (err) {
            console.error(err);
        }
    }
    return router;
}
