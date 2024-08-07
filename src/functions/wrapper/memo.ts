import { z } from 'zod';
import { AsyncFunction } from '../async';
import { SyncFunction } from '../sync';
import { Context } from '../context';
import { WrapperBuild, getParams } from '../_helper';

export function MemoData<
    //
    I extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(
    params: AsyncFunction.Params<I, O, L, C>,
    behavior: { getKey(input: I['_output']): string | null; expSec: number }
): AsyncFunction.WrapperBuild<I, O, L, C>;
export function MemoData<
    //
    I extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(
    params: SyncFunction.Params<I, O, L, C>,
    behavior: { getKey(input: I['_output']): string | null; expSec: number }
): SyncFunction.WrapperBuild<I, O, L, C>;
export function MemoData(params_: unknown, behavior: { getKey(input: unknown): string | null; expSec: number }): WrapperBuild {
    const params = getParams(params_);
    const cache: Record<string, unknown> = {};
    let Wrapper: WrapperBuild | undefined;
    if (params.type === 'function') {
        Wrapper = function (context, input, func) {
            const key = behavior.getKey(input);
            if (key === null) return func(context, input);
            if (key in cache === false) {
                cache[key] = func(context, input);
                setTimeout(() => delete cache[key], behavior.expSec * 1000);
            }
            return cache[key];
        } satisfies SyncFunction.WrapperBuild;
    }
    if (params.type === 'async function') {
        Wrapper = async function (context, input, func) {
            const key = behavior.getKey(input);
            if (key === null) return func(context, input);
            if (key in cache === false) {
                cache[key] = func(context, input);
                setTimeout(() => delete cache[key], behavior.expSec * 1000);
            }
            return await cache[key];
        } satisfies AsyncFunction.WrapperBuild;
    }
    if (Wrapper) return Object.assign(Wrapper, { [instance]: MemoData });
    throw new Error('Unimplemented!');
}
const instance = Symbol();
export function isMemoData<W>(w: W): boolean {
    return typeof w === 'function' && instance in w && w[instance] === MemoData;
}
