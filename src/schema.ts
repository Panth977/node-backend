import { z } from 'zod';

export type MergeSchemas<S1 extends Schema, S2 extends Schema> = Schema<S1['header'] & S2['header'], S1['query'] & S2['query'], S1['body']>;
export type InferOutput<S extends Schema> = { header: S['header']['_output']; query: S['query']['_output']; body: S['body']['_output'] };
export type InferInput<S extends Schema> = { header: S['header']['_input']; query: S['query']['_input']; body: S['body']['_input'] };

export const emptyBody = z.unknown().openapi({ ref: 'emptyBody' });
export const emptyHeaders = z.object({}).openapi({ ref: 'emptyHeaders' });

export default class Schema<
    Header extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
    Query extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
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
        return new Schema(emptyHeaders, z.object({}), emptyBody);
    }

    addHeader<Header extends Record<string, z.ZodType>>(header: Header) {
        return new Schema(this.header.extend(header), this.query, this.body);
    }
    addQuery<Query extends Record<string, z.ZodType>>(query: Query) {
        return new Schema(this.header, this.query.extend(query), this.body);
    }
    addBody<Body extends z.ZodType>(body: Body) {
        return new Schema(this.header, this.query, body);
    }

    merge<Header extends Schema['header'], Query extends Schema['query'], Body extends Schema['body']>(schema: Schema<Header, Query, Body>) {
        return new Schema(this.header.merge(schema.header), this.query.merge(schema.query), this.body);
    }
}
