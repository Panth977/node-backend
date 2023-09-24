import { z } from 'zod';
import { Route, Middleware } from '../src';
import { Request, Response } from 'express';
import { RouteParameters } from 'express-serve-static-core';

type ExpressAllowedPath = 'all' | 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head';
type Configs = { log: boolean };
type FrameworkArg = { req: Request; res: Response };

const never = void 0 as never;

class ExpressDefMiddleware<ID extends string | symbol = string | symbol> extends Middleware<ID, FrameworkArg> {
    protected constructor(id: ID) {
        super(id, never, {});
    }

    static buildExpress<ID extends string | symbol>(id: ID) {
        return new ExpressDefMiddleware(id);
    }
    static getExpressMiddleware(middleware: Middleware): ExpressDefMiddleware {
        if (middleware instanceof ExpressDefMiddleware) return middleware;
        throw new Error('Expected express middleware');
    }
}
export const ExpressMiddleware = Object.assign(ExpressDefMiddleware, ExpressDefMiddleware.buildExpress);

class ExpressDefRoute<
    Method extends ExpressAllowedPath = ExpressAllowedPath,
    Path extends string = string,
    Params extends Record<string, z.ZodType> = Record<string, z.ZodType>,
> extends Route<Method, Path, Params, Configs, FrameworkArg> {
    protected constructor(method: Method, path: Path, params: Params, configs: Configs, description: string | undefined, tags: string[]) {
        super(method, path, params, configs, description, never, tags);
    }
    static buildExpress<Method extends ExpressAllowedPath, Path extends string>(method: Method, path: Path, description?: string) {
        return new ExpressDefRoute(method, path, {}, { log: false }, description, []);
    }
    static getExpressRoute(route: Route): ExpressDefRoute {
        if (route instanceof ExpressDefRoute) return route;
        throw new Error('Expected express route');
    }

    addConfigs<K extends keyof Configs>(key: K, value: Configs[K]) {
        return new ExpressDefRoute(
            this.method,
            this.path,
            this.params,
            Object.assign({}, this.configs, { [key]: value }),
            this.description,
            this.tags
        );
    }

    addParams<Params extends { [k in keyof RouteParameters<Path>]?: z.ZodType }>(params: Params) {
        return new ExpressDefRoute(this.method, this.path, Object.assign({}, this.params, params), this.configs, this.description, this.tags);
    }
    middlewareCheck(middleware: Middleware): void {
        super.middlewareCheck(middleware);
        ExpressDefMiddleware.getExpressMiddleware(middleware);
    }
}

export const ExpressRoute = Object.assign(ExpressDefRoute, ExpressDefRoute.buildExpress);
