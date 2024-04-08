import { z } from 'zod';
import { AsyncFunction } from '../async';
import { SyncFunction } from '../sync';
import { Context } from '../context';
import { SyncGenerator } from '../sync-generator';
import { AsyncGenerator } from '../async-generator';
import { getParams } from '../identifier';

export function MemoData<
    //
    N extends string,
    I extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
>(
    params: AsyncFunction.Param<N, I, O, S, C>,
    behavior: { getKey(input: I['_output']): string; expSec: number }
): AsyncFunction.WrapperBuild<N, I, O, S, C>;
export function MemoData<
    //
    N extends string,
    I extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
>(
    params: SyncFunction.Param<N, I, O, S, C>,
    behavior: { getKey(input: I['_output']): string; expSec: number }
): SyncFunction.WrapperBuild<N, I, O, S, C>;
export function MemoData(
    params_:
        | unknown
        | (SyncFunction.Type & SyncFunction.Param)
        | (AsyncFunction.Type & AsyncFunction.Param)
        | (AsyncGenerator.Type & AsyncGenerator.Param)
        | (SyncGenerator.Type & SyncGenerator.Param),
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
