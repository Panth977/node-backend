import { z } from 'zod';
import type Middleware from './middleware';
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
    ImplementationReturn extends { message?: string; headers?: Record<string, unknown>; data: unknown } & Record<
        string | number | symbol,
        unknown
    > = never,
    ResponseData extends z.ZodType = z.ZodNever,
    ResponseHeaders extends Record<string, z.ZodType> = Record<never, never>,
> {
    readonly bodySchema: BodySchema;
    readonly paramsSchema: ParamsSchema;
    readonly headerSchema: HeadersSchema;
    readonly querySchema: QuerySchema;
    readonly responseHeadersSchema: ResponseHeaders;
    readonly responseDataSchema: ResponseData;

    readonly ref: string;
    readonly method: Method;
    readonly path: Path;
    readonly description?: string;
    readonly middleware: (typeof Middleware)['__general'][] = [];
    declare __headersSchema: HeadersSchema;
    declare __querySchema: QuerySchema;
    declare __paramsSchema: ParamsSchema;
    declare __bodySchema: BodySchema;
    declare __implementationReturn: ImplementationReturn;
    declare __request: {
        headers: { [k in keyof HeadersSchema]: HeadersSchema[k]['_input'] };
        query: { [k in keyof QuerySchema]: QuerySchema[k]['_input'] };
        params: { [k in keyof ParamsSchema]: ParamsSchema[k]['_input'] };
        body: BodySchema['_input'];
    };
    declare __payload: {
        headers: { [k in keyof HeadersSchema]: HeadersSchema[k]['_output'] };
        query: { [k in keyof QuerySchema]: QuerySchema[k]['_output'] };
        params: { [k in keyof ParamsSchema]: ParamsSchema[k]['_output'] };
        body: BodySchema['_output'];
    };
    readonly implementation: (payload: this['__payload'], attachments: Attachments, route: this) => Promise<ImplementationReturn> = null as never;

    declare __id: `${Method}.${Path}`;
    declare __method: Method;
    declare __path: Path;
    declare __attachments: Attachments;
    declare __responseData: ResponseData;
    declare __responseHeaders: ResponseHeaders;
    declare __response: {
        headers: { [k in keyof ResponseHeaders]: ResponseHeaders[k]['_output'] };
        data: HttpsResponse<'ok', ResponseData['_output']>;
    };

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
        this.responseDataSchema = z.any() as never;
    }

    declare static __general: Route<
        TMethod,
        string,
        Record<string, z.ZodType>,
        Record<string, unknown>,
        Record<string, z.ZodType>,
        Record<string, z.ZodType>,
        z.ZodType,
        { headers?: Record<string, unknown>; data: unknown } & Record<string | number | symbol, unknown>,
        z.ZodType,
        Record<string, z.ZodType>
    >;

    addMiddleware<
        _ID extends string,
        _HeadersSchema extends Record<string, z.ZodType>,
        _QuerySchema extends Record<string, z.ZodType>,
        _Attachment extends Record<string, unknown>,
        _ResponseHeaders extends Record<string, z.ZodType>,
    >(
        middleware: Middleware<_ID, Attachments, _HeadersSchema, _QuerySchema, _Attachment, _ResponseHeaders>
    ): Route<
        Method,
        Path,
        ParamsSchema,
        Attachments & { [k in _ID]: _Attachment },
        HeadersSchema & _HeadersSchema,
        QuerySchema & _QuerySchema,
        BodySchema,
        ImplementationReturn,
        ResponseData,
        ResponseHeaders & _ResponseHeaders
    > {
        this.middleware.push(middleware as never);
        return this as never;
    }

    setImplementation<
        ImplementationReturn extends { message?: string; headers?: Record<string, unknown>; data: unknown } & Record<
            string | number | symbol,
            unknown
        >,
    >(
        implementation: (payload: this['__payload'], attachments: Attachments, route: this) => Promise<ImplementationReturn>
    ): Route<Method, Path, ParamsSchema, Attachments, HeadersSchema, QuerySchema, BodySchema, ImplementationReturn, ResponseData, ResponseHeaders> {
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
        ImplementationReturn,
        ResponseData,
        ResponseHeaders
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
        ImplementationReturn,
        ResponseData,
        ResponseHeaders
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
        ImplementationReturn,
        ResponseData,
        ResponseHeaders
    > {
        Object.assign(this.querySchema, querySchema);
        return this as never;
    }
    takeBody<BodySchema extends z.ZodType>(
        bodySchema: BodySchema
    ): Route<Method, Path, ParamsSchema, Attachments, HeadersSchema, QuerySchema, BodySchema, ImplementationReturn, ResponseData, ResponseHeaders> {
        (this.bodySchema as never) = bodySchema as never;
        return this as never;
    }

    setHeaders<_ResponseHeaders extends Record<keyof ImplementationReturn['headers'], z.ZodType>>(
        headerSchema: _ResponseHeaders
    ): Route<
        Method,
        Path,
        ParamsSchema,
        Attachments,
        HeadersSchema,
        QuerySchema,
        BodySchema,
        ImplementationReturn,
        ResponseData,
        ResponseHeaders & _ResponseHeaders
    > {
        Object.assign(this.responseHeadersSchema, headerSchema);
        return this as never;
    }
    setData<ResponseData extends z.ZodType>(
        dataSchema: ResponseData
    ): Route<Method, Path, ParamsSchema, Attachments, HeadersSchema, QuerySchema, BodySchema, ImplementationReturn, ResponseData, ResponseHeaders> {
        (this.bodySchema as never) = dataSchema as never;
        return this as never;
    }

    init(request: { params: Record<string, unknown> }) {
        const { paramsSchema } = this;
        const payload = {
            headers: {},
            body: null,
            params: {},
            query: {},
        } as { headers: Record<string, unknown>; query: Record<string, unknown>; body: unknown; params: Record<string, unknown> };
        const attachments = {} as Record<string, unknown>;
        const parsedResult = z.object({ params: z.object(paramsSchema) }).safeParse(request);
        if (!parsedResult.success) throw new HttpsResponse('invalid-argument', 'Request was found to have wrong arguments', parsedResult.error);
        Object.assign(payload.params, parsedResult.data.params ?? {});
        return [payload, attachments] as const;
    }

    async execute(
        request: { headers: Record<string, unknown>; query: Record<string, unknown>; body: unknown },
        payload: { headers: Record<string, unknown>; query: Record<string, unknown>; body: unknown; params: Record<string, unknown> },
        attachments: Record<string, unknown>
    ): Promise<{ headers: Record<string, unknown>; data: HttpsResponse<'ok', unknown> }> {
        const { headerSchema, querySchema, bodySchema, implementation, responseHeadersSchema, responseDataSchema } = this;
        const parsedResult = z
            .object({
                headers: z.object(headerSchema),
                query: z.object(querySchema),
                body: bodySchema,
            })
            .safeParse(request);
        if (!parsedResult.success) throw new HttpsResponse('invalid-argument', 'Request was found to have wrong arguments', parsedResult.error);
        Object.assign(payload.headers, parsedResult.data.headers ?? {});
        Object.assign(payload.query, parsedResult.data.query ?? {});
        Object.assign(payload, { body: parsedResult.data.body });
        const result = await implementation(payload as never, attachments as never, this);
        const parsedHeaders = z
            .object({
                headers: z.object(responseHeadersSchema).optional(),
                message: z.string().optional(),
                data: responseDataSchema,
            })
            .safeParse(result);
        if (!parsedHeaders.success) throw new Error(parsedHeaders.error.toString());
        return {
            headers: parsedHeaders.data.headers ?? {},
            data: new HttpsResponse('ok', parsedHeaders.data.message ?? 'Successful execution', parsedHeaders.data.data),
        };
    }
}
