import { z } from 'zod';
import { AsyncFunction, Context, asyncFunction } from '../functions';
import { ZodOpenApiOperationObject } from 'zod-openapi';
import { TakeIfDefined, takeIfDefined } from './_helper';

export namespace Middleware {
    export type _Params<
        //
        ReqH extends undefined | z.AnyZodObject,
        ReqQ extends undefined | z.AnyZodObject,
        ResH extends undefined | z.AnyZodObject,
        Opt extends z.AnyZodObject,
        L = unknown,
        C extends Context = Context,
    > = Pick<ZodOpenApiOperationObject, 'security' | 'tags'> & {
        reqHeader?: ReqH;
        reqQuery?: ReqQ;
        resHeaders?: ResH;
        options: Opt;
    } & Omit<
            AsyncFunction._Params<TakeIfDefined<{ headers: ReqH; query: ReqQ }>, TakeIfDefined<{ headers: ResH; options: Opt }>, L, C>,
            '_input' | '_output'
        >;

    export type Params<
        //
        ReqH extends undefined | z.AnyZodObject = z.AnyZodObject,
        ReqQ extends undefined | z.AnyZodObject = z.AnyZodObject,
        ResH extends undefined | z.AnyZodObject = z.AnyZodObject,
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
        ReqH extends undefined | z.AnyZodObject = z.AnyZodObject,
        ReqQ extends undefined | z.AnyZodObject = z.AnyZodObject,
        ResH extends undefined | z.AnyZodObject = z.AnyZodObject,
        Opt extends z.AnyZodObject = z.AnyZodObject,
        L = unknown,
        C extends Context = Context,
    > = Params<ReqH, ReqQ, ResH, Opt> &
        AsyncFunction.Build<TakeIfDefined<{ headers: ReqH; query: ReqQ }>, TakeIfDefined<{ headers: ResH; options: Opt }>, L, C>;
}

export function createMiddleware<
    //
    ReqH extends undefined | z.AnyZodObject,
    ReqQ extends undefined | z.AnyZodObject,
    ResH extends undefined | z.AnyZodObject,
    Opt extends z.AnyZodObject,
    L,
    C extends Context,
>(_params: Middleware._Params<ReqH, ReqQ, ResH, Opt, L, C>): Middleware.Build<ReqH, ReqQ, ResH, Opt, L, C> {
    const params: Middleware.Params<ReqH, ReqQ, ResH, Opt> = {
        endpoint: 'middleware',
        reqHeader: _params.reqHeader as never,
        options: _params.options,
        reqQuery: _params.reqQuery as never,
        resHeaders: _params.resHeaders as never,
        security: _params.security,
        tags: _params.tags,
    };
    const build = asyncFunction({
        _input: takeIfDefined({ headers: params.reqHeader, query: params.reqQuery }) as never,
        _output: takeIfDefined({ headers: params.resHeaders, options: params.options }) as never,
        _local: _params._local,
        wrappers: _params.wrappers,
        func: _params.func,
    });
    return Object.assign(build, params) as never;
}
