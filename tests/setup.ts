import { Route, Middleware } from '../src';
import { Request, Response } from 'express';

export function ExpressMiddleware<ID extends string>(id: ID) {
    return Middleware.build<{ req: Request; res: Response }, ID>('EXPRESS' as never, id);
}

type ExpressAllowedPath = 'all'| 'get'| 'post'| 'put'| 'delete'| 'patch'| 'options'| 'head'
export function ExpressRoute<Method extends ExpressAllowedPath, Path extends string>(method: Method, path: Path) {
    return Route.build<{ req: Request; res: Response }, Method, Path>('EXPRESS' as never, method, path);
}
