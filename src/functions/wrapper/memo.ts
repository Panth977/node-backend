import { z } from 'zod';
import { AsyncFunctionWrapperBuild, SyncFunctionWrapperBuild, AsyncFunctionParam, SyncFunctionParam } from '..';
import { Context } from '../context';

export function AsyncMemoData<
    //
    N extends string,
    I extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
>(
    params: AsyncFunctionParam<N, I, O, S, C>,
    { getKey, expSec }: { getKey(input: I['_output']): string; expSec: number }
): AsyncFunctionWrapperBuild<N, I, O, S, C> {
    const cache: Record<string, Promise<O['_input']>> = {};
    return async function MemoData(context, input, func) {
        const key = getKey(input);
        if (key in cache === false) {
            cache[key] = func(context, input);
            setTimeout(() => delete cache[key], expSec * 1000);
        }
        return await cache[key];
    };
}
export function SyncMemoData<
    //
    N extends string,
    I extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
>(
    params: SyncFunctionParam<N, I, O, S, C>,
    { getKey, expSec }: { getKey(input: I['_output']): string; expSec: number }
): SyncFunctionWrapperBuild<N, I, O, S, C> {
    const cache: Record<string, O['_input']> = {};
    return function MemoData(context, input, func) {
        const key = getKey(input);
        if (key in cache === false) {
            cache[key] = func(context, input);
            setTimeout(() => delete cache[key], expSec * 1000);
        }
        return cache[key];
    };
}
