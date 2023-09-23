import type { z } from 'zod';

type valof<T extends object> = T[keyof T];

export function foldArrayToMap<T extends object, K extends valof<{ [k in keyof T]: T[k] extends string ? k : never }>, O>(
    arr: T[],
    on: K,
    transform: (c: T) => O
) {
    const p: { [k: string]: O } = {};
    for (const c of arr) {
        p[c[on] as string] = transform(c);
    }
    return p;
}

export function mapMapValues<T extends object, O>(rec: Record<string, T>, transform: (c: T) => O) {
    const p: { [k: string]: O } = {};
    for (const k in rec) {
        p[k] = transform(rec[k]);
    }
    return p;
}

export type ReturnHeaders<ResponseHeaders extends Record<string, z.ZodType>> = keyof ResponseHeaders extends never
    ? { headers?: Record<never, never> }
    : { headers: { [k in keyof ResponseHeaders]: ResponseHeaders[k]['_input'] } };

export type ReturnData<ResponseData extends z.ZodType> = ResponseData extends z.ZodNever ? { data?: never } : { data: ResponseData['_input'] };
export const types = Symbol();
export type Types = typeof types;
export const general = Symbol();
export type GeneralType = typeof general;
export const schema = Symbol();
