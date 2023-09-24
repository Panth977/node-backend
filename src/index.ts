import _MiddlewareController from './middleware_controller';
import _Middleware from './middleware';
import _HttpsResponse from './response';
import _RouteController from './route_controller';
import _Server from './server';
import _Schema from './schema';
import _Route from './route';

export * from './execution';
export const Schema = _Schema.build;
export const HttpsResponse = _HttpsResponse.build;
export const Route = _Route;
export const Middleware = _Middleware;
export const Server = _Server;
export type Schema = _Schema;
export type HttpsResponse = _HttpsResponse;
export type Route = _Route;
export type Middleware = _Middleware;
export type RouteController = _RouteController;
export type MiddlewareController = _MiddlewareController;
export type Server = _Server;

type DefSchema = ReturnType<typeof _Schema.build>;

export function Setup<Info extends _Route>(info: Info): _RouteController<Info, Record<never, never>, DefSchema, DefSchema, DefSchema>;
export function Setup<Info extends _Middleware>(info: Info): _MiddlewareController<Info, Record<never, never>, DefSchema, DefSchema, never>;
export function Setup(info: unknown) {
    if (info instanceof _Route) {
        return _RouteController.build(info);
    }
    if (info instanceof _Middleware) {
        return _MiddlewareController.build(info);
    }
    throw new Error('Unknown info type found');
}
