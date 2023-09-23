import { z } from 'zod';
import type Route from './route';
import { GeneralType, ReturnHeaders, Types, general, schema, types } from './helper';

export default class Middleware<
    ID extends string,
    RequireAttachments extends Record<string, unknown> = Record<never, never>,
    HeadersSchema extends Record<string, z.ZodType> = Record<never, never>,
    QuerySchema extends Record<string, z.ZodType> = Record<never, never>,
    ResponseHeaders extends Record<string, z.ZodType> = Record<never, never>,
    ImplementationReturn extends ReturnHeaders<ResponseHeaders> & Record<string | number | symbol, unknown> = never,
> {
    private headerSchema: HeadersSchema;
    private querySchema: QuerySchema;
    private responseHeadersSchema: ResponseHeaders;

    get [schema]() {
        return {
            headerSchema: this.headerSchema,
            querySchema: this.querySchema,
            responseHeadersSchema: this.responseHeadersSchema,
            implementation: this.implementation as (
                payload: this[Types]['Payload'],
                attachments: RequireAttachments,
                route: (typeof Route)[GeneralType]
            ) => Promise<ImplementationReturn>,
        };
    }

    readonly id: ID;
    private implementation: (
        payload: this[Types]['Payload'],
        attachments: RequireAttachments,
        route: (typeof Route)[GeneralType]
    ) => Promise<ImplementationReturn> = null as never;

    declare [types]: {
        ID: ID;
        RequireAttachments: RequireAttachments;
        HeadersSchema: HeadersSchema;
        QuerySchema: QuerySchema;
        ResponseHeaders: ResponseHeaders;
        ImplementationReturn: ImplementationReturn;
        Request: {
            headers: { [k in keyof HeadersSchema]: HeadersSchema[k]['_input'] };
            query: { [k in keyof QuerySchema]: QuerySchema[k]['_input'] };
        };
        Payload: {
            headers: { [k in keyof HeadersSchema]: HeadersSchema[k]['_output'] };
            query: { [k in keyof QuerySchema]: QuerySchema[k]['_output'] };
        };
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    declare static [general]: Middleware<any, any, any, any, any, any>;
    // declare static [general]: Middleware<
    //     string,
    //     Record<string, unknown>,
    //     Record<string, z.ZodType>,
    //     Record<string, z.ZodType>,
    //     Record<string, z.ZodType> | Record<never, never>,
    //     ReturnHeaders<Record<string, z.ZodType>> & Record<string | number | symbol, unknown>
    // >;
    // declare static [types]: (typeof Middleware)[GeneralType][Types];
    constructor(id: ID) {
        this.id = id;
        this.headerSchema = {} as never;
        this.querySchema = {} as never;
        this.responseHeadersSchema = {} as never;
    }
    addPreRequisite<M extends (typeof Middleware)[GeneralType]>(
        middleware: () => M
    ): Middleware<
        ID,
        RequireAttachments & { [k in M[Types]['ID']]: M[Types]['ImplementationReturn'] } & M[Types]['RequireAttachments'],
        HeadersSchema & M[Types]['HeadersSchema'],
        QuerySchema & M[Types]['QuerySchema'],
        ResponseHeaders,
        ImplementationReturn
    >;
    addPreRequisite() {
        return this as never;
    }

    setImplementation<ImplementationReturn extends ReturnHeaders<ResponseHeaders> & Record<string | number | symbol, unknown>>(
        implementation: (
            payload: this[Types]['Payload'],
            attachments: RequireAttachments,
            route: (typeof Route)[GeneralType]
        ) => Promise<ImplementationReturn>
    ): Middleware<ID, RequireAttachments, HeadersSchema, QuerySchema, ResponseHeaders, ImplementationReturn> {
        (this.implementation as unknown) = implementation;
        return this as never;
    }

    takeHeaders<_HeadersSchema extends Record<string, z.ZodType>>(
        headerSchema: _HeadersSchema
    ): Middleware<ID, RequireAttachments, HeadersSchema & _HeadersSchema, QuerySchema, ResponseHeaders, ImplementationReturn> {
        Object.assign(this.headerSchema, headerSchema);
        return this as never;
    }
    takeQueries<_QuerySchema extends Record<string, z.ZodType>>(
        querySchema: _QuerySchema
    ): Middleware<ID, RequireAttachments, HeadersSchema, QuerySchema & _QuerySchema, ResponseHeaders, ImplementationReturn> {
        Object.assign(this.querySchema, querySchema);
        return this as never;
    }
    setHeaders<_ResponseHeaders extends Record<string, z.ZodType>>(
        headerSchema: _ResponseHeaders
    ): Middleware<ID, RequireAttachments, HeadersSchema, QuerySchema, ResponseHeaders & _ResponseHeaders, never> {
        Object.assign(this.responseHeadersSchema, headerSchema);
        return this as never;
    }
}
