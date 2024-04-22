import { z } from 'zod';
import { AsyncFunction } from '../async';
import { SyncFunction } from '../sync';
import { Context } from '../context';
import { SyncGenerator } from '../sync-generator';
import { AsyncGenerator } from '../async-generator';
import { getParams } from '../_helper';

export function MemoData<
    //
    I extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(
    params: AsyncFunction.Params<I, O, L, C>,
    behavior: { getKey(input: I['_output']): string; expSec: number }
): AsyncFunction.WrapperBuild<I, O, L, C>;
export function MemoData<
    //
    I extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(params: SyncFunction.Params<I, O, L, C>, behavior: { getKey(input: I['_output']): string; expSec: number }): SyncFunction.WrapperBuild<I, O, L, C>;
export function MemoData(
    params_: unknown,
    behavior: { getKey(input: unknown): string; expSec: number }
): AsyncFunction.WrapperBuild | SyncFunction.WrapperBuild | AsyncGenerator.WrapperBuild | SyncGenerator.WrapperBuild {
    const params = getParams(params_);
    const cache: Record<string, unknown> = {};
    if (params.type === 'function') {
        return function MemoData(context, input, func) {
            const key = behavior.getKey(input);
            if (key in cache === false) {
                cache[key] = func(context, input);
                setTimeout(() => delete cache[key], behavior.expSec * 1000);
            }
            return cache[key];
        } satisfies SyncFunction.WrapperBuild;
    }
    if (params.type === 'async function') {
        return async function MemoData(context, input, func) {
            const key = behavior.getKey(input);
            if (key in cache === false) {
                cache[key] = func(context, input);
                setTimeout(() => delete cache[key], behavior.expSec * 1000);
            }
            return await cache[key];
        } satisfies AsyncFunction.WrapperBuild;
    }
    throw new Error('Unimplemented!');
}
