import { z } from 'zod';

export function foldArrayToMap<T extends object, O>(arr: T[], on: (c: T) => string, transform: (c: T) => O) {
    const p: { [k: string]: O } = {};
    for (const c of arr) {
        p[on(c)] = transform(c);
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

export const never = void 0 as never;
export type ZodOutputRecord<T extends Record<string, z.ZodType>> = { [k in keyof T]: T[k]['_output'] };
export type ZodInputRecord<T extends Record<string, z.ZodType>> = { [k in keyof T]: T[k]['_input'] };
