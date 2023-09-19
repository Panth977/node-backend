import { z } from 'zod';
import type Route from './route';
import HttpsResponse from './response';

export default class Middleware<
    ID extends string,
    RequireAttachments extends Record<string, unknown> = Record<never, never>,
    HeadersSchema extends Record<string, z.ZodType> = Record<never, never>,
    QuerySchema extends Record<string, z.ZodType> = Record<never, never>,
    ImplementationReturn extends { headers?: Record<string, unknown> } & Record<string | number | symbol, unknown> = never,
    ResponseHeaders extends Record<string, z.ZodType> = Record<never, never>,
> {
    readonly headerSchema: HeadersSchema;
    readonly querySchema: QuerySchema;
    readonly responseHeadersSchema: ResponseHeaders;

    readonly id: ID;
    readonly description?: string;
    readonly implementation: (
        payload: this['__payload'],
        attachments: RequireAttachments,
        route: (typeof Route)['__general']
    ) => Promise<ImplementationReturn> = null as never;

    declare __id: ID;
    declare __requireAttachments: RequireAttachments;
    declare __attachment: ImplementationReturn;
    declare __responseHeaders: ResponseHeaders;
    declare __headersSchema: HeadersSchema;
    declare __querySchema: QuerySchema;

    declare __request: {
        headers: { [k in keyof HeadersSchema]: HeadersSchema[k]['_input'] };
        query: { [k in keyof QuerySchema]: QuerySchema[k]['_input'] };
    };
    declare __payload: {
        headers: { [k in keyof HeadersSchema]: HeadersSchema[k]['_output'] };
        query: { [k in keyof QuerySchema]: QuerySchema[k]['_output'] };
    };

    declare static __general: Middleware<
        string,
        Record<string, unknown>,
        Record<string, z.ZodType>,
        Record<string, z.ZodType>,
        { headers?: Record<string, unknown> } & Record<string | number | symbol, unknown>,
        Record<string, z.ZodType>
    >;

    constructor(id: ID, description?: string) {
        this.id = id;
        this.description = description;
        this.headerSchema = {} as never;
        this.querySchema = {} as never;
        this.responseHeadersSchema = {} as never;
    }
    addPreRequisite<
        _ID extends string,
        _HeadersSchema extends Record<string, z.ZodType>,
        _QuerySchema extends Record<string, z.ZodType>,
        _Attachment extends Record<string | number | symbol, unknown>,
    >(
        middleware: () => Middleware<_ID, RequireAttachments, _HeadersSchema, _QuerySchema, _Attachment, Record<string, z.ZodType>>
    ): Middleware<
        ID,
        RequireAttachments & { [k in _ID]: _Attachment },
        HeadersSchema & _HeadersSchema,
        QuerySchema & _QuerySchema,
        ImplementationReturn,
        ResponseHeaders
    >;
    addPreRequisite() {
        return this as never;
    }

    setImplementation<ImplementationReturn extends { headers?: Record<string, unknown> } & Record<string | number | symbol, unknown>>(
        implementation: (
            payload: this['__payload'],
            attachments: RequireAttachments,
            route: (typeof Route)['__general']
        ) => Promise<ImplementationReturn>
    ): Middleware<ID, RequireAttachments, HeadersSchema, QuerySchema, ImplementationReturn, ResponseHeaders> {
        (this.implementation as unknown) = implementation;
        return this as never;
    }

    takeHeaders<_HeadersSchema extends Record<string, z.ZodType>>(
        headerSchema: _HeadersSchema
    ): Middleware<ID, RequireAttachments, HeadersSchema & _HeadersSchema, QuerySchema, ImplementationReturn, ResponseHeaders> {
        Object.assign(this.headerSchema, headerSchema);
        return this as never;
    }
    takeQueries<_QuerySchema extends Record<string, z.ZodType>>(
        querySchema: _QuerySchema
    ): Middleware<ID, RequireAttachments, HeadersSchema, QuerySchema & _QuerySchema, ImplementationReturn, ResponseHeaders> {
        Object.assign(this.querySchema, querySchema);
        return this as never;
    }
    setHeaders<_ResponseHeaders extends Record<keyof ImplementationReturn['headers'], z.ZodType>>(
        headerSchema: _ResponseHeaders
    ): Middleware<ID, RequireAttachments, HeadersSchema, QuerySchema, ImplementationReturn, ResponseHeaders & _ResponseHeaders> {
        Object.assign(this.responseHeadersSchema, headerSchema);
        return this as never;
    }

    async execute(
        request: { headers: Record<string, unknown>; query: Record<string, unknown> },
        payload: { headers: Record<string, unknown>; query: Record<string, unknown> },
        attachments: Record<string, unknown>,
        route: (typeof Route)['__general']
    ): Promise<{ headers: Record<string, unknown> }> {
        const { headerSchema, querySchema, implementation, responseHeadersSchema, id } = this;
        const parsedResult = z.object({ headers: z.object(headerSchema), query: z.object(querySchema) }).safeParse(request);
        if (!parsedResult.success) throw new HttpsResponse('invalid-argument', 'Request was found to have wrong arguments', parsedResult.error);
        Object.assign(payload.headers, parsedResult.data.headers ?? {});
        Object.assign(payload.query, parsedResult.data.query ?? {});
        const result = await implementation(payload as never, attachments as never, route);
        Object.assign(attachments, { [id]: result });
        const parsedHeaders = z.object({ headers: z.object(responseHeadersSchema).optional() }).safeParse(result);
        if (!parsedHeaders.success) throw new Error(parsedHeaders.error.toString());
        return {
            headers: parsedHeaders.data.headers ?? {},
        };
    }
}
