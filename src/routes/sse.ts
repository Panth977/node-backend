import { AsyncGenerator, Context, asyncGenerator } from '../functions';
import { z } from 'zod';
import { ZodOpenApiOperationObject } from 'zod-openapi';
import { Middleware } from './middleware';
import { SecuritySchemeObject } from '../type/zod-openapi';

export namespace SseEndpoint {
    export type Method = 'get';
    export type _Params<
        //
        I extends z.AnyZodObject,
        Y extends z.ZodString,
        L,
        C extends Context,
        Opt extends Record<never, never>,
        W extends
            | []
            | [
                  AsyncGenerator.WrapperBuild<I, Y, z.ZodVoid, z.ZodVoid, L, C & { options: Opt }>,
                  ...AsyncGenerator.WrapperBuild<I, Y, z.ZodVoid, z.ZodVoid, L, C & { options: Opt }>[],
              ],
    > = Pick<ZodOpenApiOperationObject, 'tags' | 'summary' | 'description'> & { security?: Record<string, SecuritySchemeObject> } & Omit<
            AsyncGenerator._Params<I, Y, z.ZodVoid, z.ZodVoid, L, C & { options: Opt }, W>,
            '_output' | '_next'
        >;
    export type Params = Pick<ZodOpenApiOperationObject, 'tags' | 'summary' | 'description'> & {
        security?: Record<string, SecuritySchemeObject>;
        resWrite?: z.ZodType<string>;
        path: string;
        method: Method;
        endpoint: 'sse';
        middlewares: Middleware.Build[];
    };

    export type Build<
        //
        I extends z.AnyZodObject = z.ZodObject<{ path?: z.AnyZodObject; query?: z.AnyZodObject }>,
        Y extends z.ZodString = z.ZodString,
        L = unknown,
        C extends Context = Context,
        Opt extends Record<never, never> = Record<never, never>,
        W extends
            | []
            | [
                  AsyncGenerator.WrapperBuild<I, Y, z.ZodVoid, z.ZodVoid, L, C & { options: Opt }>,
                  ...AsyncGenerator.WrapperBuild<I, Y, z.ZodVoid, z.ZodVoid, L, C & { options: Opt }>[],
              ] = [],
    > = Params & AsyncGenerator.Build<I, Y, z.ZodVoid, z.ZodVoid, L, C & { options: Opt }, W>;
}

export function createSse<
    //
    I extends z.AnyZodObject,
    Y extends z.ZodString,
    L,
    C extends Context,
    Opt extends Record<never, never>,
    W extends
        | []
        | [
              AsyncGenerator.WrapperBuild<I, Y, z.ZodVoid, z.ZodVoid, L, C & { options: Opt }>,
              ...AsyncGenerator.WrapperBuild<I, Y, z.ZodVoid, z.ZodVoid, L, C & { options: Opt }>[],
          ],
>(
    middlewares: Middleware.Build[],
    method: SseEndpoint.Method,
    path: string,
    _params: SseEndpoint._Params<I, Y, L, C, Opt, W>
): SseEndpoint.Build<I, Y, L, C, Opt, W> {
    const params: SseEndpoint.Params = {
        endpoint: 'sse',
        middlewares,
        path: path,
        method: method,
        description: _params.description,
        security: _params.security,
        summary: _params.summary,
        tags: _params.tags,
    };
    return Object.assign(asyncGenerator(Object.assign(_params, { _output: z.void(), _next: z.void() })), params) as never;
}
