import { AsyncFunction, Context, asyncFunction } from '../functions';
import { Middleware } from './middleware';
import { ZodOpenApiOperationObject } from 'zod-openapi';
import { SecuritySchemeObject } from '../type/zod-openapi';
import { z } from 'zod';
export namespace HttpEndpoint {
    export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'trace';
    export type _Params<
        //
        I extends z.AnyZodObject,
        O extends z.AnyZodObject,
        L,
        C extends Context,
        Opt extends Record<never, never>,
        W extends [] | [AsyncFunction.WrapperBuild<I, O, L, C & { options: Opt }>, ...AsyncFunction.WrapperBuild<I, O, L, C & { options: Opt }>[]],
    > = Pick<ZodOpenApiOperationObject, 'tags' | 'summary' | 'description'> & {
        resMediaTypes?: string;
        reqMediaTypes?: string;
        security?: Record<string, SecuritySchemeObject>;
    } & AsyncFunction._Params<I, O, L, C & { options: Opt }, W>;

    export type Params = Pick<ZodOpenApiOperationObject, 'tags' | 'summary' | 'description'> & { security?: Record<string, SecuritySchemeObject> } & {
        method: Method;
        path: string;
        middlewares: Middleware.Build[];
        endpoint: 'http';
        resMediaTypes?: string;
        reqMediaTypes?: string;
    };
    export type Build<
        //
        I extends z.AnyZodObject = z.ZodObject<{ headers?: z.AnyZodObject; path?: z.AnyZodObject; query?: z.AnyZodObject; body?: z.ZodType }>,
        O extends z.AnyZodObject = z.ZodObject<{ headers?: z.AnyZodObject; body?: z.ZodType }>,
        L = unknown,
        C extends Context = Context,
        Opt extends Record<never, never> = Record<never, never>,
        W extends
            | [AsyncFunction.WrapperBuild<I, O, L, C & { options: Opt }>, ...AsyncFunction.WrapperBuild<I, O, L, C & { options: Opt }>[]]
            | [] = [],
    > = Params & AsyncFunction.Build<I, O, L, C & { options: Opt }, W>;
}

export function createHttp<
    //
    I extends z.AnyZodObject,
    O extends z.AnyZodObject,
    L,
    C extends Context,
    Opt extends Record<never, never>,
    W extends [] | [AsyncFunction.WrapperBuild<I, O, L, C & { options: Opt }>, ...AsyncFunction.WrapperBuild<I, O, L, C & { options: Opt }>[]],
>(
    middlewares: Middleware.Build[],
    method: HttpEndpoint.Method,
    path: string,
    _params: HttpEndpoint._Params<I, O, L, C, Opt, W>
): HttpEndpoint.Build<I, O, L, C, Opt, W> {
    const params: HttpEndpoint.Params = {
        endpoint: 'http',
        middlewares,
        method: method,
        path: path,
        description: _params.description,
        reqMediaTypes: _params.reqMediaTypes,
        resMediaTypes: _params.resMediaTypes,
        security: _params.security,
        summary: _params.summary,
        tags: _params.tags,
    };
    return Object.assign(asyncFunction(_params), params) as never;
}
