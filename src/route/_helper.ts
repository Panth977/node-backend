import { z } from 'zod';

export type TakeIfDefined<T extends Record<never, z.ZodType | undefined>> = z.ZodObject<{
    [k in keyof T]: T[k] extends z.ZodType ? T[k] : z.ZodUndefined;
}>;

export function takeIfDefined<T extends Record<never, z.ZodType | undefined>>(obj: T): TakeIfDefined<T> {
    const ret: Record<string, z.ZodType> = {};
    for (const k in obj) {
        const v = obj[k];
        if (v instanceof z.ZodType) {
            ret[k] = v;
        }
    }
    return z.object(ret) as never;
}
