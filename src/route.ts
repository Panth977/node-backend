import Params from './params';
import { z } from 'zod';
import type { Request } from 'express';
import type Middleware from './middleware';
import type { RouteParameters } from 'express-serve-static-core/index';
import HttpsResponse from './response';

type TMethod = 'post' | 'get' | 'put' | 'delete';

export default class Route<
    Method extends TMethod,
    Path extends string,
    Attachments extends Record<string, unknown> = Record<never, never>,
    HeadersSchema extends (typeof Params.__general)['__headersSchema'] = Record<never, never>,
    QuerySchema extends (typeof Params.__general)['__querySchema'] = Record<never, never>,
    BodySchema extends z.ZodType = z.ZodNever,
    ResponseData extends HttpsResponse<'ok', unknown> = HttpsResponse<never, unknown>,
    ResponseHeaders extends Record<string, string | number | readonly string[]> = Record<never, never>,
> extends Params<HeadersSchema, QuerySchema> {
    readonly bodySchema: BodySchema;

    readonly ref: string;
    readonly method: Method;
    readonly path: Path;
    readonly description?: string;
    readonly middleware: (typeof Middleware)['__general'][] = [];
    declare __bodySchema: BodySchema;
    declare __request: Params<HeadersSchema, QuerySchema>['__request'] & { params: RouteParameters<Path>; body: BodySchema['_input'] };
    declare __payload: Params<HeadersSchema, QuerySchema>['__payload'] & { params: RouteParameters<Path>; body: BodySchema['_output'] };
    readonly implementation: (
        payload: this['__payload'],
        attachments: Attachments
    ) => Promise<{ ResponseData: ResponseData; ResponseHeaders: ResponseHeaders }> = null as never;

    declare __id: `${Method}.${Path}`;
    declare __method: Method;
    declare __path: Path;
    declare __attachments: Attachments;
    declare __responseData: ResponseData;
    declare __responseHeaders: ResponseHeaders;
    declare __response: { data: ReturnType<ResponseData['toJSON']>; headers: ResponseHeaders };

    constructor(method: Method, path: Path, description?: string) {
        super();
        this.ref = `${path}<${method.toUpperCase()}>`;
        this.method = method;
        this.path = path;
        this.description = description;
        this.bodySchema = z.any() as never;
    }

    declare static __general: Route<
        TMethod,
        string,
        Record<string, unknown>,
        (typeof Params.__general)['__headersSchema'],
        (typeof Params.__general)['__querySchema'],
        z.ZodType,
        HttpsResponse<'ok', unknown>,
        Record<string, string | number | readonly string[]>
    >;

    addMiddleware<
        _ID extends string,
        _HeadersSchema extends (typeof Params.__general)['__headersSchema'],
        _QuerySchema extends (typeof Params.__general)['__querySchema'],
        _Attachment,
        _ResponseHeaders extends Record<string, string | number | readonly string[]>,
    >(
        middleware: Middleware<_ID, Attachments, _HeadersSchema, _QuerySchema, _Attachment, _ResponseHeaders>
    ): Route<
        Method,
        Path,
        Attachments & { [k in _ID]: _Attachment },
        HeadersSchema & _HeadersSchema,
        QuerySchema & _QuerySchema,
        BodySchema,
        ResponseData,
        ResponseHeaders & _ResponseHeaders
    > {
        this.middleware.push(middleware as never);
        return this as never;
    }

    setImplementation<
        ResponseData extends HttpsResponse<'ok', unknown>,
        _ResponseHeaders extends Record<string, string | number | readonly string[]>,
    >(
        implementation: (
            payload: this['__payload'],
            attachments: Attachments,
            route: this
        ) => Promise<{ ResponseData: ResponseData; ResponseHeaders: _ResponseHeaders }>
    ): Route<Method, Path, Attachments, HeadersSchema, QuerySchema, BodySchema, ResponseData, ResponseHeaders & _ResponseHeaders> {
        (this.implementation as unknown) = implementation;
        return this as never;
    }

    setHeaders<_HeadersSchema extends Record<string, z.ZodType>>(
        headerSchema: _HeadersSchema
    ): Route<Method, Path, Attachments, HeadersSchema & _HeadersSchema, QuerySchema, BodySchema, ResponseData, ResponseHeaders> {
        Object.assign(this.headerSchema, headerSchema);
        return this as never;
    }
    setQueries<_QuerySchema extends Record<string, z.ZodType>>(
        querySchema: _QuerySchema
    ): Route<Method, Path, Attachments, HeadersSchema, QuerySchema & _QuerySchema, BodySchema, ResponseData, ResponseHeaders> {
        Object.assign(this.querySchema, querySchema);
        return this as never;
    }
    setBody<BodySchema extends z.ZodType<unknown, z.ZodTypeDef, Request['body']>>(
        bodySchema: BodySchema
    ): Route<Method, Path, Attachments, HeadersSchema, QuerySchema, BodySchema, ResponseData, ResponseHeaders> {
        (this.bodySchema as never) = bodySchema as never;
        return this as never;
    }
}
