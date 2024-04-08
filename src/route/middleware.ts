import { z } from 'zod';
import { AsyncFunction, Context, asyncFunction } from '../functions';
import { ZodOpenApiOperationObject } from 'zod-openapi';

export namespace Middleware {
    export type _Params<
        //
        N extends string,
        ReqH extends z.AnyZodObject,
        ReqQ extends z.AnyZodObject,
        ResH extends z.AnyZodObject,
        Opt extends z.AnyZodObject,
        L = unknown,
        C extends Context = Context,
    > = Pick<ZodOpenApiOperationObject, 'security' | 'tags'> & {
        reqHeader: ReqH;
        reqQuery: ReqQ;
        resHeaders: ResH;
        options: Opt;
    } & Omit<
            AsyncFunction._Params<N, z.ZodObject<{ headers: ReqH; query: ReqQ }>, z.ZodObject<{ headers: ResH; options: Opt }>, L, C>,
            '_input' | '_output'
        >;

    export type Params<
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
        endpoint: 'middleware';
    };
    export type Build<
        //
        N extends string = string,
        ReqH extends z.AnyZodObject = z.AnyZodObject,
        ReqQ extends z.AnyZodObject = z.AnyZodObject,
        ResH extends z.AnyZodObject = z.AnyZodObject,
        Opt extends z.AnyZodObject = z.AnyZodObject,
        L = unknown,
        C extends Context = Context,
    > = Params<ReqH, ReqQ, ResH, Opt> &
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
>(_name: N, _params: Middleware._Params<N, ReqH, ReqQ, ResH, Opt, L, C>): Middleware.Build<N, ReqH, ReqQ, ResH, Opt, L, C> {
    const params: Middleware.Params<ReqH, ReqQ, ResH, Opt> = {
        endpoint: 'middleware',
        reqHeader: _params.reqHeader,
        options: _params.options,
        reqQuery: _params.reqQuery,
        resHeaders: _params.resHeaders,
    };
    const build = asyncFunction(_name, {
        _input: z.object({ headers: params.reqHeader, query: params.reqQuery }),
        _output: z.object({ headers: params.resHeaders, options: params.options }),
        _local: _params._local,
        wrappers: _params.wrappers,
        func: _params.func,
    });
    return Object.assign(build, params);
}
