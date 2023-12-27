import { z } from 'zod';
import { ZodInputRecord, ZodOutputRecord } from './helper';

export type MergeSchemas<S1 extends Schema, S2 extends Schema> = Schema<S1['header'] & S2['header'], S1['query'] & S2['query'], S1['body']>;
export type InferOutput<S extends Schema> = { header: ZodOutputRecord<S['header']>; query: ZodOutputRecord<S['query']>; body: S['body']['_output'] };
export type InferInput<S extends Schema> = { header: ZodInputRecord<S['header']>; query: ZodInputRecord<S['query']>; body: S['body']['_input'] };

export default class Schema<
    Header extends Record<string, z.ZodType> = Record<string, z.ZodType>,
    Query extends Record<string, z.ZodType> = Record<string, z.ZodType>,
    Body extends z.ZodType = z.ZodType,
> {
    readonly header: Header;
    readonly query: Query;
    readonly body: Body;

    protected constructor(header: Header, query: Query, body: Body) {
        this.header = header;
        this.query = query;
        this.body = body;
    }
    static build() {
        return new Schema({}, {}, z.unknown());
    }

    addHeader<Header extends Record<string, z.ZodType>>(header: Header) {
        return new Schema(Object.assign({}, this.header, header), this.query, this.body);
    }
    addQuery<Query extends Record<string, z.ZodType>>(query: Query) {
        return new Schema(this.header, Object.assign({}, this.query, query), this.body);
    }
    addBody<Body extends z.ZodType>(body: Body) {
        return new Schema(this.header, this.query, body);
    }

    merge<Header extends Schema['header'], Query extends Schema['query'], Body extends Schema['body']>(schema: Schema<Header, Query, Body>) {
        return new Schema(Object.assign({}, this.header, schema.header), Object.assign({}, this.query, schema.query), this.body);
    }
}
