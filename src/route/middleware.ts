import { z } from 'zod';
import { AsyncFunction, Context, asyncFunction } from '../functions';
import { ZodOpenApiOperationObject } from 'zod-openapi';

export namespace Middleware {
    export type Type = { endpoint: 'middleware' };
    type Extra<
        //
        ReqH extends z.AnyZodObject = z.AnyZodObject,
        ReqQ extends z.AnyZodObject = z.AnyZodObject,
        ResH extends z.AnyZodObject = z.AnyZodObject,
        Opt extends z.AnyZodObject = z.AnyZodObject,
    > = Pick<ZodOpenApiOperationObject, 'security' | 'tags'> & {
        reqHeader: ReqH;
        reqQuery: ReqQ;
        resHeaders: ResH;
        options: Opt;
    };

    export type Param<
        //
        N extends string = string,
        ReqH extends z.AnyZodObject = z.AnyZodObject,
        ReqQ extends z.AnyZodObject = z.AnyZodObject,
        ResH extends z.AnyZodObject = z.AnyZodObject,
        Opt extends z.AnyZodObject = z.AnyZodObject,
        L = unknown,
        C extends Context = Context,
    > = Extra<ReqH, ReqQ, ResH, Opt> &
        Omit<
            AsyncFunction.Param<N, z.ZodObject<{ headers: ReqH; query: ReqQ }>, z.ZodObject<{ headers: ResH; options: Opt }>, L, C>,
            '_input' | '_output'
        >;
    export type Build<
        //
        N extends string = string,
        ReqH extends z.AnyZodObject = z.AnyZodObject,
        ReqQ extends z.AnyZodObject = z.AnyZodObject,
        ResH extends z.AnyZodObject = z.AnyZodObject,
        Opt extends z.AnyZodObject = z.AnyZodObject,
        L = unknown,
        C extends Context = Context,
    > = Type &
        Extra<ReqH, ReqQ, ResH, Opt> &
        AsyncFunction.Build<N, z.ZodObject<{ headers: ReqH; query: ReqQ }>, z.ZodObject<{ headers: ResH; options: Opt }>, L, C>;
}

export function createMiddleware<
    //
    N extends string,
    ReqH extends z.AnyZodObject,
    ReqQ extends z.AnyZodObject,
    ResH extends z.AnyZodObject,
    Opt extends z.AnyZodObject,
    L,
    C extends Context,
>(params_: Middleware.Param<N, ReqH, ReqQ, ResH, Opt, L, C>): Middleware.Build<N, ReqH, ReqQ, ResH, Opt, L, C> {
    const params = Object.freeze(Object.assign(params_, { endpoint: 'middleware' } as const));
    return Object.assign(
        asyncFunction(
            Object.assign(params, {
                _input: z.object({ headers: params.reqHeader, query: params.reqQuery }),
                _output: z.object({ headers: params.resHeaders, options: params.options }),
            })
        ),
        params
    );
}
