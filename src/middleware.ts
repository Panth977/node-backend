import Params from './params';
import { z } from 'zod';
import type Route from './route';

export default class Middleware<
    ID extends string,
    RequireAttachments extends Record<string, unknown> = Record<never, never>,
    HeadersSchema extends (typeof Params.__general)['__headersSchema'] = Record<never, never>,
    QuerySchema extends (typeof Params.__general)['__querySchema'] = Record<never, never>,
    Attachment = unknown,
    ResponseHeaders extends Record<string, string | number | readonly string[]> = Record<never, never>,
> extends Params<HeadersSchema, QuerySchema> {
    readonly id: ID;
    readonly description?: string;
    readonly implementation: (
        payload: this['__payload'],
        attachments: RequireAttachments,
        route: (typeof Route)['__general']
    ) => Promise<{ Attachment: Attachment; ResponseHeaders: ResponseHeaders }> = null as never;

    declare __id: ID;
    declare __requireAttachments: RequireAttachments;
    declare __attachment: Attachment;
    declare __responseHeaders: ResponseHeaders;

    declare static __general: Middleware<
        string,
        Record<string, unknown>,
        (typeof Params.__general)['__headersSchema'],
        (typeof Params.__general)['__querySchema'],
        unknown,
        Record<string, string | number | readonly string[]>
    >;

    constructor(id: ID, description?: string) {
        super();
        this.id = id;
        this.description = description;
    }
    addPreRequisite<
        _ID extends string,
        _HeadersSchema extends (typeof Params.__general)['__headersSchema'],
        _QuerySchema extends (typeof Params.__general)['__querySchema'],
        _Attachment,
    >(
        middleware: () => Middleware<
            _ID,
            RequireAttachments,
            _HeadersSchema,
            _QuerySchema,
            _Attachment,
            Record<string, string | number | readonly string[]>
        >
    ): Middleware<
        ID,
        RequireAttachments & { [k in _ID]: _Attachment },
        HeadersSchema & _HeadersSchema,
        QuerySchema & _QuerySchema,
        Attachment,
        ResponseHeaders
    >;
    addPreRequisite() {
        return this as never;
    }

    setImplementation<Attachment, ResponseHeaders extends Record<string, string | number | readonly string[]>>(
        implementation: (
            payload: this['__payload'],
            attachments: RequireAttachments,
            route: (typeof Route)['__general']
        ) => Promise<{ Attachment: Attachment; ResponseHeaders: ResponseHeaders }>
    ): Middleware<ID, RequireAttachments, HeadersSchema, QuerySchema, Attachment, ResponseHeaders> {
        (this.implementation as unknown) = implementation;
        return this as never;
    }

    setHeaders<_HeadersSchema extends Record<string, z.ZodType>>(
        headerSchema: _HeadersSchema
    ): Middleware<ID, RequireAttachments, HeadersSchema & _HeadersSchema, QuerySchema, Attachment, ResponseHeaders> {
        Object.assign(this.headerSchema, headerSchema);
        return this as never;
    }
    setQueries<_QuerySchema extends Record<string, z.ZodType>>(
        querySchema: _QuerySchema
    ): Middleware<ID, RequireAttachments, HeadersSchema, QuerySchema & _QuerySchema, Attachment, ResponseHeaders> {
        Object.assign(this.querySchema, querySchema);
        return this as never;
    }
}
