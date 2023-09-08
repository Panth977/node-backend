import type { z } from 'zod';
import type { Request, Response } from 'express';

export const RequestSymbol = Symbol('Request');
export const ResponseSymbol = Symbol('Response');

export default abstract class Params<HeadersSchema extends Record<string, z.ZodType>, QuerySchema extends Record<string, z.ZodType>> {
    readonly headerSchema: HeadersSchema;
    readonly querySchema: QuerySchema;

    declare __headersSchema: HeadersSchema;
    declare __querySchema: QuerySchema;
    declare __request: {
        headers: { [k in keyof HeadersSchema]: HeadersSchema[k]['_input'] };
        query: { [k in keyof QuerySchema]: QuerySchema[k]['_input'] };
    };
    declare __payload: {
        headers: { [k in keyof HeadersSchema]: HeadersSchema[k]['_output'] };
        query: { [k in keyof QuerySchema]: QuerySchema[k]['_output'] };
        [RequestSymbol]: Request;
        [ResponseSymbol]: Response;
    };

    declare static __general: Params<Record<string, z.ZodType>, Record<string, z.ZodType>>;

    constructor() {
        this.headerSchema = {} as never;
        this.querySchema = {} as never;
    }
}
