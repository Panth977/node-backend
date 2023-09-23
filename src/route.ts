import { z } from 'zod';
import type Middleware from './middleware';
import { type ReturnHeaders, type ReturnData, type types, type Types, type general, type GeneralType, schema } from './helper';
import HttpsResponse from './response';

type TMethod = 'post' | 'get' | 'put' | 'delete' | 'patch' | 'head' | 'options' | 'connect' | 'trace';
export default class Route<
    Method extends TMethod,
    Path extends string,
    ParamsSchema extends Record<string, z.ZodType> = Record<never, never>,
    Attachments extends Record<string, unknown> = Record<never, never>,
    HeadersSchema extends Record<string, z.ZodType> = Record<never, never>,
    QuerySchema extends Record<string, z.ZodType> = Record<never, never>,
    BodySchema extends z.ZodType = z.ZodNever,
    ResponseData extends z.ZodType = z.ZodNever,
    ResponseHeaders extends Record<string, z.ZodType> = Record<never, never>,
    MiddlewaresResponseHeaders extends Record<string, z.ZodType> = Record<never, never>,
> {
    private bodySchema: BodySchema;
    private paramsSchema: ParamsSchema;
    private headerSchema: HeadersSchema;
    private querySchema: QuerySchema;
    private responseHeadersSchema: ResponseHeaders;
    private responseDataSchema: ResponseData;
    private implementation: (
        payload: this[Types]['Payload'],
        attachments: Attachments,
        route: (typeof Route)[GeneralType]
    ) => Promise<ReturnHeaders<ResponseHeaders> & ReturnData<ResponseData> & { message?: string }> = null as never;
    readonly middleware: (typeof Middleware)[GeneralType][] = [];

    get [schema]() {
        return {
            bodySchema: this.bodySchema,
            paramsSchema: this.paramsSchema,
            headerSchema: this.headerSchema,
            querySchema: this.querySchema,
            responseHeadersSchema: this.responseHeadersSchema,
            responseDataSchema: this.responseDataSchema,
            implementation: this.implementation as (
                payload: this[Types]['Payload'],
                attachments: Attachments,
                route: (typeof Route)[GeneralType]
            ) => Promise<ReturnHeaders<ResponseHeaders> & ReturnData<ResponseData> & { message?: string }>,
        };
    }

    readonly ref: string;
    readonly method: Method;
    readonly path: Path;
    readonly description?: string;

    declare [types]: {
        ID: `${Method}.${Path}`;
        Method: Method;
        Path: Path;
        ParamsSchema: ParamsSchema;
        Attachments: Attachments;
        HeadersSchema: HeadersSchema;
        QuerySchema: QuerySchema;
        BodySchema: BodySchema;
        ResponseData: ResponseData;
        ResponseHeaders: ResponseHeaders;
        MiddlewaresResponseHeaders: MiddlewaresResponseHeaders;
        Request: {
            headers: { [k in keyof HeadersSchema]: HeadersSchema[k]['_input'] };
            query: { [k in keyof QuerySchema]: QuerySchema[k]['_input'] };
            params: { [k in keyof ParamsSchema]: ParamsSchema[k]['_input'] };
            body: BodySchema['_input'];
        };
        Payload: {
            headers: { [k in keyof HeadersSchema]: HeadersSchema[k]['_output'] };
            query: { [k in keyof QuerySchema]: QuerySchema[k]['_output'] };
            params: { [k in keyof ParamsSchema]: ParamsSchema[k]['_output'] };
            body: BodySchema['_output'];
        };
        Response: {
            headers: { [k in keyof ResponseHeaders]: ResponseHeaders[k]['_output'] } & {
                [k in keyof MiddlewaresResponseHeaders]: MiddlewaresResponseHeaders[k]['_output'];
            };
            data: ReturnType<HttpsResponse<'ok', ResponseData['_output']>['toJSON']>;
        };
    };
    declare static [general]: Route<
        TMethod,
        string,
        Record<string, z.ZodType>,
        Record<string, unknown>,
        Record<string, z.ZodType>,
        Record<string, z.ZodType>,
        z.ZodType,
        z.ZodType,
        Record<string, z.ZodType>,
        Record<string, z.ZodType>
    >;
    declare static [types]: (typeof Route)[GeneralType][Types];
    constructor(method: Method, path: Path, description?: string) {
        this.headerSchema = {} as never;
        this.querySchema = {} as never;
        this.ref = `${path}<${method.toUpperCase()}>`;
        this.method = method;
        this.path = path;
        this.description = description;
        this.bodySchema = z.any() as never;
        this.paramsSchema = {} as never;
        this.responseHeadersSchema = {} as never;
        this.responseDataSchema = z.null() as never;
    }

    addMiddleware<
        _ID extends (typeof Middleware)[Types]['ID'],
        _RequireAttachments extends (typeof Middleware)[Types]['RequireAttachments'],
        _HeadersSchema extends (typeof Middleware)[Types]['HeadersSchema'],
        _QuerySchema extends (typeof Middleware)[Types]['QuerySchema'],
        _ResponseHeaders extends (typeof Middleware)[Types]['ResponseHeaders'],
        _ImplementationReturn extends ReturnHeaders<_ResponseHeaders> & Record<string, unknown>,
    >(
        middleware: Middleware<_ID, _RequireAttachments, _HeadersSchema, _QuerySchema, _ResponseHeaders, _ImplementationReturn>,
        ...bug: Attachments extends _RequireAttachments ? [] : [never]
    ): Route<
        Method,
        Path,
        ParamsSchema,
        Attachments & { [k in _ID]: _ImplementationReturn },
        HeadersSchema & _HeadersSchema,
        QuerySchema & _QuerySchema,
        BodySchema,
        ResponseData,
        ResponseHeaders,
        MiddlewaresResponseHeaders & _ResponseHeaders
    >;
    addMiddleware(...[middleware]: [(typeof Middleware)[GeneralType], ...unknown[]]) {
        const schemas = middleware[schema];
        Object.assign(this.headerSchema, schemas.headerSchema);
        Object.assign(this.querySchema, schemas.querySchema);
        Object.assign(this.responseHeadersSchema, schemas.responseHeadersSchema);
        this.middleware.push(middleware);
        return this as never;
    }

    setImplementation(
        implementation: (
            payload: this[Types]['Payload'],
            attachments: Attachments,
            route: (typeof Route)[GeneralType]
        ) => Promise<ReturnHeaders<ResponseHeaders> & ReturnData<ResponseData> & { message?: string }>
    ): Route<
        Method,
        Path,
        ParamsSchema,
        Attachments,
        HeadersSchema,
        QuerySchema,
        BodySchema,
        ResponseData,
        ResponseHeaders,
        MiddlewaresResponseHeaders
    > {
        (this.implementation as unknown) = implementation;
        return this as never;
    }

    takeParams<_ParamsSchema extends Record<string, z.ZodType>>(
        paramsSchema: _ParamsSchema
    ): Route<
        Method,
        Path,
        ParamsSchema & _ParamsSchema,
        Attachments,
        HeadersSchema,
        QuerySchema,
        BodySchema,
        ResponseData,
        ResponseHeaders,
        MiddlewaresResponseHeaders
    > {
        Object.assign(this.paramsSchema, paramsSchema);
        return this as never;
    }
    takeHeaders<_HeadersSchema extends Record<string, z.ZodType>>(
        headerSchema: _HeadersSchema
    ): Route<
        Method,
        Path,
        ParamsSchema,
        Attachments,
        HeadersSchema & _HeadersSchema,
        QuerySchema,
        BodySchema,
        ResponseData,
        ResponseHeaders,
        MiddlewaresResponseHeaders
    > {
        Object.assign(this.headerSchema, headerSchema);
        return this as never;
    }
    takeQueries<_QuerySchema extends Record<string, z.ZodType>>(
        querySchema: _QuerySchema
    ): Route<
        Method,
        Path,
        ParamsSchema,
        Attachments,
        HeadersSchema,
        QuerySchema & _QuerySchema,
        BodySchema,
        ResponseData,
        ResponseHeaders,
        MiddlewaresResponseHeaders
    > {
        Object.assign(this.querySchema, querySchema);
        return this as never;
    }
    takeBody<BodySchema extends z.ZodType>(
        bodySchema: BodySchema
    ): Route<
        Method,
        Path,
        ParamsSchema,
        Attachments,
        HeadersSchema,
        QuerySchema,
        BodySchema,
        ResponseData,
        ResponseHeaders,
        MiddlewaresResponseHeaders
    > {
        (this.bodySchema as never) = bodySchema as never;
        return this as never;
    }

    setHeaders<_ResponseHeaders extends Record<string, z.ZodType>>(
        headerSchema: _ResponseHeaders
    ): Route<
        Method,
        Path,
        ParamsSchema,
        Attachments,
        HeadersSchema,
        QuerySchema,
        BodySchema,
        ResponseData,
        ResponseHeaders & _ResponseHeaders,
        MiddlewaresResponseHeaders
    > {
        Object.assign(this.responseHeadersSchema, headerSchema);
        return this as never;
    }
    setData<ResponseData extends z.ZodType>(
        dataSchema: ResponseData
    ): Route<
        Method,
        Path,
        ParamsSchema,
        Attachments,
        HeadersSchema,
        QuerySchema,
        BodySchema,
        ResponseData,
        ResponseHeaders,
        MiddlewaresResponseHeaders
    > {
        (this.bodySchema as never) = dataSchema as never;
        return this as never;
    }
}
