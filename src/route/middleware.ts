import { z } from 'zod';
import { AsyncFunctionBuild, AsyncFunctionParam, Context, asyncFunction } from '../functions';
import { SecurityRequirementObject } from 'zod-openapi/lib-types/openapi3-ts/dist/oas30';

type ExtraParams<
    //
    ReqH extends z.AnyZodObject,
    ReqQ extends z.AnyZodObject,
    ResH extends z.AnyZodObject,
    Opt extends z.AnyZodObject,
> = {
    reqHeader: ReqH;
    reqQuery: ReqQ;
    resHeaders: ResH;
    options: Opt;
    security?: SecurityRequirementObject[];
    tags?: string[];
};

export type MiddlewareParam<
    //
    N extends string,
    ReqH extends z.AnyZodObject,
    ReqQ extends z.AnyZodObject,
    ResH extends z.AnyZodObject,
    Opt extends z.AnyZodObject,
    S,
    C extends Context,
> = ExtraParams<ReqH, ReqQ, ResH, Opt> &
    Omit<
        AsyncFunctionParam<N, z.ZodObject<{ headers: ReqH; query: ReqQ }>, z.ZodObject<{ headers: ResH; options: Opt }>, S, C>,
        '_input' | '_output'
    >;
export type MiddlewareBuild<
    //
    N extends string,
    ReqH extends z.AnyZodObject,
    ReqQ extends z.AnyZodObject,
    ResH extends z.AnyZodObject,
    Opt extends z.AnyZodObject,
    S,
    C extends Context,
> = ExtraParams<ReqH, ReqQ, ResH, Opt> &
    AsyncFunctionBuild<N, z.ZodObject<{ headers: ReqH; query: ReqQ }>, z.ZodObject<{ headers: ResH; options: Opt }>, S, C>;

export function createMiddleware<
    //
    N extends string,
    ReqH extends z.AnyZodObject,
    ReqQ extends z.AnyZodObject,
    ResH extends z.AnyZodObject,
    Opt extends z.AnyZodObject,
    S,
    C extends Context,
>(params: MiddlewareParam<N, ReqH, ReqQ, ResH, Opt, S, C>): MiddlewareBuild<N, ReqH, ReqQ, ResH, Opt, S, C> {
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
