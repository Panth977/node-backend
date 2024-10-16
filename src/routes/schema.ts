import { z } from 'zod';

type TakeIfDefined<T extends Record<never, z.ZodType | undefined>> = z.ZodObject<{
    [k in {
        [k in keyof T]: T[k] extends z.ZodType ? k : never;
    }[keyof T]]: T[k] extends z.ZodType ? T[k] : never;
}>;

function takeIfDefined<T extends Record<never, z.ZodType | undefined>>(obj: T): TakeIfDefined<T> {
    const ret: Record<string, z.ZodType> = {};
    for (const k in obj) {
        const v = obj[k];
        if (v instanceof z.ZodType) {
            ret[k] = v;
        }
    }
    return z.object(ret) as never;
}
const instance = Symbol();
export function isMiddlewareInput(schema: z.ZodType): schema is z.ZodObject<{ headers?: z.AnyZodObject; query?: z.AnyZodObject }> {
    return instance in schema ? schema[instance] === zMiddlewareInput : false;
}
export function zMiddlewareInput<
    //
    H extends undefined | z.AnyZodObject = undefined,
    Q extends undefined | z.AnyZodObject = undefined,
>(shape: { headers?: H; query?: Q }) {
    return Object.assign(takeIfDefined(shape as { headers: H; query: Q }), { [instance]: zMiddlewareInput });
}
export function isMiddlewareOutput(schema: z.ZodType): schema is z.ZodObject<{ headers?: z.AnyZodObject; options: z.ZodType }> {
    return instance in schema ? schema[instance] === zMiddlewareOutput : false;
}
export function zMiddlewareOutput<
    //
    H extends undefined | z.AnyZodObject,
    O extends z.AnyZodObject,
>(shape: { headers?: H; options: O }) {
    return Object.assign(takeIfDefined(shape as { headers: H; options: O }), { [instance]: zMiddlewareOutput });
}
export function isHttpInput(
    schema: z.ZodType
): schema is z.ZodObject<{ headers?: z.AnyZodObject; path?: z.AnyZodObject; query?: z.AnyZodObject; body?: z.ZodType }> {
    return instance in schema ? schema[instance] === zHttpInput : false;
}
export function zHttpInput<
    //
    H extends undefined | z.AnyZodObject = undefined,
    Q extends undefined | z.AnyZodObject = undefined,
    P extends undefined | z.AnyZodObject = undefined,
    B extends undefined | z.ZodType = undefined,
>(shape: { headers?: H; path?: P; query?: Q; body?: B }) {
    return Object.assign(takeIfDefined(shape as { headers: H; path: P; query: Q; body: B }), { [instance]: zHttpInput });
}
export function isHttpOutput(schema: z.ZodType): schema is z.ZodObject<{ headers?: z.AnyZodObject; body?: z.ZodType }> {
    return instance in schema ? schema[instance] === zHttpOutput : false;
}
export function zHttpOutput<
    //
    H extends undefined | z.AnyZodObject = undefined,
    B extends undefined | z.ZodType = undefined,
>(shape: { headers?: H; body?: B }) {
    return Object.assign(takeIfDefined(shape as { headers: H; body: B }), { [instance]: zHttpOutput });
}
export function isSseInput(schema: z.ZodType): schema is z.ZodObject<{ path?: z.AnyZodObject; query?: z.AnyZodObject }> {
    return instance in schema ? schema[instance] === zSseInput : false;
}
export function zSseInput<
    //
    P extends undefined | z.AnyZodObject = undefined,
    Q extends undefined | z.AnyZodObject = undefined,
>(shape: { path?: P; query?: Q }) {
    return Object.assign(takeIfDefined(shape as { path: P; query: Q }), { [instance]: zSseInput });
}
export function isSseYield(schema: z.ZodType): schema is z.ZodString {
    return instance in schema ? schema[instance] === zSseYield : false;
}
export function zSseYield<
    //
    Y extends undefined | z.ZodString = undefined,
>(_yield?: Y) {
    return Object.assign(_yield ?? z.string(), { [instance]: zSseYield });
}
