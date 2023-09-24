import { z } from 'zod';

export const never = void 0 as never;
export type ZodOutputRecord<T extends Record<string, z.ZodType>> = { [k in keyof T]: T[k]['_output'] };
export type ZodInputRecord<T extends Record<string, z.ZodType>> = { [k in keyof T]: T[k]['_input'] };
