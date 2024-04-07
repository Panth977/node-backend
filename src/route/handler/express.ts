import { z } from 'zod';
import createHttpError from 'http-errors';
import { NextFunction, Request, RequestHandler, Response, Router, ErrorRequestHandler } from 'express';
import { HttpBuild, Method, getHttpDocumentObject } from '../http';
import { SseBuild, getSseDocumentObject } from '../sse';
import { Context, createContext } from '../../functions';
import { MiddlewareBuild } from '../middleware';
import * as swaggerUi from 'swagger-ui-express';
import { ZodOpenApiObject, ZodOpenApiPathsObject, createDocument } from 'zod-openapi';

export function pathParser(path: string) {
    return path.replace(/{([^}]+)}/g, ':$1');
}

export function setupContext(method: string, path: string): RequestHandler {
    return function (req, res, nxt) {
        res.locals ??= {};
        res.locals.context = createContext({ in: 'endpoint', name: `(${method.toUpperCase()}) ${path}` });
        res.locals.options = {};
        res.on('finish', async () => {
            await res.locals.context.dispose();
        });
        nxt();
    };
}

export function createMiddlewareHandler<
    //
    N extends string,
    ReqH extends z.AnyZodObject,
    ReqQ extends z.AnyZodObject,
    ResH extends z.AnyZodObject,
    Opt extends z.AnyZodObject,
    S,
    C extends Context,
>(build: MiddlewareBuild<N, ReqH, ReqQ, ResH, Opt, S, C>): RequestHandler {
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
export function createHttpHandler<
    //
    M extends Method,
    P extends string,
    ReqH extends z.AnyZodObject,
    ReqQ extends z.AnyZodObject,
    ReqP extends z.AnyZodObject,
    ReqB extends z.ZodType,
    ResH extends z.AnyZodObject,
    ResB extends z.ZodType,
    S,
    C extends Context,
    Opt extends Record<never, never>,
>(build: HttpBuild<M, P, ReqH, ReqQ, ReqP, ReqB, ResH, ResB, S, C, Opt>): RequestHandler {
    return async function (req, res, nxt) {
        try {
            const input = { body: req.body, headers: req.headers, path: req.params, query: req.query };
            const output = await build(Object.assign({}, res.locals.context, { options: res.locals.options }), input);
            for (const key in output.headers) res.setHeader(key, output.headers[key]);
            res.status(200).send(output.body);
        } catch (error) {
            nxt(error);
        }
    };
}
export function createSseHandler<
    //
    P extends string,
    ReqH extends z.AnyZodObject,
    ReqQ extends z.AnyZodObject,
    ReqP extends z.AnyZodObject,
    S,
    C extends Context,
    Opt extends Record<never, never>,
>(build: SseBuild<P, ReqH, ReqQ, ReqP, S, C, Opt>): RequestHandler {
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
                res.write(`data: ${val.value}\n\n`);
                val = await g.next();
            }
        } catch (error) {
            console.log(error);
        }
    };
}

export function createErrorHandler(): ErrorRequestHandler {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return function (error: unknown, req: Request, res: Response, next: NextFunction) {
        res.locals.context.error('Request Error:', error);
        if (createHttpError.isHttpError(error)) {
            for (const key in error.headers) res.setHeader(key, error.headers[key]);
            res.status(error.status).send(error.message);
            return;
        }
        res.status(500).send('Something went wrong!');
    };
}

export function serve(
    routes: Parameters<typeof createSseHandler | typeof createHttpHandler>[0][],
    documentationParams?: {
        params: Pick<ZodOpenApiObject, 'info' | 'tags' | 'servers' | 'security' | 'openapi' | 'externalDocs'>;
        serveJsonOn: string;
        serveUiOn: string;
        middlewares?: RequestHandler[];
    }
) {
    const router = Router();
    for (const build of routes) {
        if (build.endpoint === 'http') {
            router[build.method](
                pathParser(build.path),
                setupContext(build.method, build.path),
                ...build.middlewares.map(createMiddlewareHandler),
                createHttpHandler(build)
            );
            console.log('Route build success:', build.method, pathParser(build.path));
        } else if (build.endpoint === 'sse') {
            router['get'](
                pathParser(build.path),
                setupContext('get', build.path),
                ...build.middlewares.map(createMiddlewareHandler),
                createSseHandler(build)
            );
        }
    }
    router.use(createErrorHandler());
    if (documentationParams) {
        try {
            const paths: ZodOpenApiPathsObject = {};
            for (const build of routes) {
                if (build.endpoint === 'http') {
                    (paths[build.path] ??= {})[build.method] = getHttpDocumentObject(build);
                } else if (build.endpoint === 'sse') {
                    (paths[build.path] ??= {})['get'] = getSseDocumentObject(build);
                }
            }
            const jsonDoc = createDocument({
                ...documentationParams.params,
                paths: paths,
            });
            if (documentationParams.serveJsonOn) {
                router.get(documentationParams.serveJsonOn, ...(documentationParams.middlewares ?? []), (_, res) => res.send(jsonDoc));
            }
            router.use(documentationParams.serveUiOn, ...(documentationParams.middlewares ?? []), swaggerUi.serve, swaggerUi.setup(jsonDoc));
        } catch (err) {
            console.error(err);
        }
    }
    return router;
}
