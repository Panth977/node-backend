import { AsyncFunction, Context, asyncFunction } from '../functions';
import { z } from 'zod';
import { Middleware } from './middleware';
import { ZodOpenApiOperationObject } from 'zod-openapi';
import { TakeIfDefined, takeIfDefined } from './_helper';
import { SecuritySchemeObject } from '../type/zod-openapi';

export namespace HttpEndpoint {
    export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'trace';
    export type _Params<
        //
        ReqH extends undefined | z.AnyZodObject,
        ReqQ extends undefined | z.AnyZodObject,
        ReqP extends undefined | z.AnyZodObject,
        ReqB extends undefined | z.ZodType,
        ResH extends undefined | z.AnyZodObject,
        ResB extends undefined | z.ZodType,
        L,
        C extends Context,
        Opt extends Record<never, never>,
    > = Pick<ZodOpenApiOperationObject, 'tags' | 'summary' | 'description'> & { security?: Record<string, SecuritySchemeObject> } & {
        reqHeader?: ReqH;
        reqQuery?: ReqQ;
        reqPath?: ReqP;
        reqBody?: ReqB;
        resHeaders?: ResH;
        resBody?: ResB;
        resMediaTypes?: string;
        reqMediaTypes?: string;
    } & Omit<
            AsyncFunction._Params<
                TakeIfDefined<{ headers: ReqH; query: ReqQ; body: ReqB; path: ReqP }>,
                TakeIfDefined<{ headers: ResH; body: ResB }>,
                L,
                C & { options: Opt }
            >,
            '_name' | '_input' | '_output'
        >;

    export type Params<
        //
        ReqH extends undefined | z.AnyZodObject = z.AnyZodObject,
        ReqQ extends undefined | z.AnyZodObject = z.AnyZodObject,
        ReqP extends undefined | z.AnyZodObject = z.AnyZodObject,
        ReqB extends undefined | z.ZodType = z.ZodType,
        ResH extends undefined | z.AnyZodObject = z.AnyZodObject,
        ResB extends undefined | z.ZodType = z.ZodType,
    > = Pick<ZodOpenApiOperationObject, 'tags' | 'summary' | 'description'> & { security?: Record<string, SecuritySchemeObject> } & {
        method: Method;
        path: string;
        middlewares: Middleware.Build[];
        endpoint: 'http';
        reqHeader?: ReqH;
        reqQuery?: ReqQ;
        reqPath?: ReqP;
        reqBody?: ReqB;
        resHeaders?: ResH;
        resBody?: ResB;
        resMediaTypes?: string;
        reqMediaTypes?: string;
    };
    export type Build<
        //
        ReqH extends undefined | z.AnyZodObject = z.AnyZodObject,
        ReqQ extends undefined | z.AnyZodObject = z.AnyZodObject,
        ReqP extends undefined | z.AnyZodObject = z.AnyZodObject,
        ReqB extends undefined | z.ZodType = z.ZodType,
        ResH extends undefined | z.AnyZodObject = z.AnyZodObject,
        ResB extends undefined | z.ZodType = z.ZodType,
        L = unknown,
        C extends Context = Context,
        Opt extends Record<never, never> = Record<never, never>,
    > = Params<ReqH, ReqQ, ReqP, ReqB, ResH, ResB> &
        AsyncFunction.Build<
            TakeIfDefined<{ headers: ReqH; query: ReqQ; body: ReqB; path: ReqP }>,
            TakeIfDefined<{ headers: ResH; body: ResB }>,
            L,
            C & { options: Opt }
        >;
}

export function createHttp<
    //
    ReqH extends undefined | z.AnyZodObject,
    ReqQ extends undefined | z.AnyZodObject,
    ReqP extends undefined | z.AnyZodObject,
    ReqB extends undefined | z.ZodType,
    ResH extends undefined | z.AnyZodObject,
    ResB extends undefined | z.ZodType,
    L,
    C extends Context,
    Opt extends Record<never, never>,
>(
    middlewares: Middleware.Build[],
    method: HttpEndpoint.Method,
    path: string,
    _params: HttpEndpoint._Params<ReqH, ReqQ, ReqP, ReqB, ResH, ResB, L, C, Opt>
): HttpEndpoint.Build<ReqH, ReqQ, ReqP, ReqB, ResH, ResB, L, C, Opt> {
    const params: HttpEndpoint.Params<ReqH, ReqQ, ReqP, ReqB, ResH, ResB> = {
        endpoint: 'http',
        middlewares,
        method: method,
        path: path,
        description: _params.description,
        reqBody: _params.reqBody,
        reqHeader: _params.reqHeader,
        reqMediaTypes: _params.reqMediaTypes,
        reqPath: _params.reqPath,
        reqQuery: _params.reqQuery,
        resBody: _params.resBody,
        resHeaders: _params.resHeaders,
        resMediaTypes: _params.resMediaTypes,
        security: _params.security,
        summary: _params.summary,
        tags: _params.tags,
    };
    const build = asyncFunction({
        name: _params.name,
        namespace: _params.namespace,
        buildContext: _params.buildContext,
        _input: takeIfDefined({ headers: _params.reqHeader, path: _params.reqPath, query: _params.reqQuery, body: _params.reqBody }) as never,
        _output: takeIfDefined({ headers: _params.resHeaders, body: _params.resBody }) as never,
        _local: _params._local,
        wrappers: _params.wrappers,
        func: _params.func,
    });
    return Object.assign(build, params) as never;
}
