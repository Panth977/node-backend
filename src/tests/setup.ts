import { Route, Middleware, classes, Setup } from '..';
import { Request, Response } from 'express';
import { z } from 'zod';

type ExpressAllowedMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head';
type Configs = Record<never, never>;
type FrameworkArg = { req: Request; res: Response };
const never = void 0 as never;

/* Middleware */
export class ExpressDefMiddleware<ID extends string | symbol = string | symbol> extends classes.Middleware<ID, FrameworkArg> {
    protected constructor(id: ID, features: Record<string, string>) {
        super(id, never, features);
    }

    static buildExpress<ID extends string | symbol>(id: ID, features: Record<string, string>) {
        return Setup(new ExpressDefMiddleware(id, features));
    }
    static getExpressMiddleware(middleware: Middleware): ExpressDefMiddleware {
        if (middleware instanceof ExpressDefMiddleware) return middleware;
        throw new Error('Expected express middleware');
    }
}
export const ExpressMiddleware = ExpressDefMiddleware.buildExpress;

/* Route */
type GetPossibleParams<T extends string> = T extends `${string}/{${infer P}}/${infer R}`
    ? P | GetPossibleParams<`/${R}`>
    : T extends `${string}/{${infer P}}`
    ? P
    : never;
type PossibleTags = 'Read' | 'Health' | 'Organization' | 'Product' | 'Organization Relations' | 'Config & Setup' | 'Entries' | 'Inventory & Reports';
export class ExpressDefRoute<Method extends ExpressAllowedMethod = ExpressAllowedMethod, Path extends string = string> extends classes.Route<
    Method,
    Path,
    Record<GetPossibleParams<Path>, z.ZodString>,
    Configs,
    FrameworkArg
> {
    expressPath: string;
    protected constructor(method: Method, path: Path, configs: Configs, description: string | undefined, tags: string[]) {
        const params: Record<string, z.ZodString> = {};
        const vars = path.split('/').filter((x) => x.startsWith('{') && x.endsWith('}'));
        for (const name of vars) {
            params[name.substring(1, name.length - 1)] = z.string();
        }
        super(method, path, params, configs, description, never, tags);
        this.expressPath = path;
        for (const p in params) {
            this.expressPath = this.expressPath.replace(`{${p}}`, `:${p}`);
        }
    }
    static buildExpress<Method extends ExpressAllowedMethod, Path extends string>(
        method: Method,
        path: Path,
        { description, tag }: { tag: PossibleTags; description: string }
    ) {
        const configs = {};
        const tags = [tag];
        return Setup(new ExpressDefRoute(method, path, configs, description, tags));
    }
    static getExpressRoute(route: Route): ExpressDefRoute {
        if (route instanceof ExpressDefRoute) return route;
        throw new Error('Expected express route');
    }

    middlewareCheck(middleware: Middleware): void {
        super.middlewareCheck(middleware);
        ExpressDefMiddleware.getExpressMiddleware(middleware);
    }
}

export const ExpressRoute = ExpressDefRoute.buildExpress;
