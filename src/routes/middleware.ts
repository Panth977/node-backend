import { z } from 'zod';
import { AsyncFunction, Context, asyncFunction } from '../functions';
import { ZodOpenApiOperationObject } from 'zod-openapi';
import { SecuritySchemeObject } from '../type/zod-openapi';

export namespace Middleware {
    export type _Params<
        //
        I extends z.AnyZodObject,
        O extends z.AnyZodObject,
        L = unknown,
        C extends Context = Context,
    > = Pick<ZodOpenApiOperationObject, 'tags'> & { security?: Record<string, SecuritySchemeObject> } & AsyncFunction._Params<I, O, L, C>;

    export type Params = Pick<ZodOpenApiOperationObject, 'tags'> & {
        security?: Record<string, SecuritySchemeObject>;
        endpoint: 'middleware';
    };
    export type Build<
        //
        I extends z.AnyZodObject = z.ZodObject<{ headers?: z.AnyZodObject; query?: z.AnyZodObject }>,
        O extends z.AnyZodObject = z.ZodObject<{ headers?: z.AnyZodObject; options: z.ZodType }>,
        L = unknown,
        C extends Context = Context,
    > = Params & AsyncFunction.Build<I, O, L, C>;
    export type inferOptions<O extends z.AnyZodObject> = O['shape'] extends { options: infer X extends z.ZodType } ? X : never;
}

export function createMiddleware<
    //
    I extends z.AnyZodObject,
    O extends z.AnyZodObject,
    L,
    C extends Context,
>(_params: Middleware._Params<I, O, L, C>): Middleware.Build<I, O, L, C> {
    const params: Middleware.Params = {
        endpoint: 'middleware',
        security: _params.security,
        tags: _params.tags,
    };
    return Object.assign(asyncFunction(_params), params) as never;
}
