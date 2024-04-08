import { z } from 'zod';
import { AsyncFunction } from '../async';
import { SyncFunction } from '../sync';
import { Context } from '../context';
import { SyncGenerator } from '../sync-generator';
import { AsyncGenerator } from '../async-generator';
import { getParams } from '../_helper';

export function CloneData<
    //
    N extends string,
    I extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(params: AsyncFunction.Params<N, I, O, L, C>, behavior?: { input?: boolean; output?: boolean }): AsyncFunction.WrapperBuild<N, I, O, L, C>;
export function CloneData<
    //
    N extends string,
    I extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(params: SyncFunction.Params<N, I, O, L, C>, behavior?: { input?: boolean; output?: boolean }): SyncFunction.WrapperBuild<N, I, O, L, C>;
export function CloneData<
    //
    N extends string,
    I extends z.ZodType,
    Y extends z.ZodType,
    TN extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(
    params: SyncGenerator.Params<N, I, Y, TN, O, L, C>,
    behavior?: { input?: boolean; output?: boolean; yield?: boolean; next?: boolean }
): SyncGenerator.WrapperBuild<N, I, Y, TN, O, L, C>;
export function CloneData<
    //
    N extends string,
    I extends z.ZodType,
    Y extends z.ZodType,
    TN extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(
    params: AsyncGenerator.Params<N, I, Y, TN, O, L, C>,
    behavior?: { input?: boolean; output?: boolean; yield?: boolean; next?: boolean }
): AsyncGenerator.WrapperBuild<N, I, Y, TN, O, L, C>;
export function CloneData(
    params_: unknown,
    behavior: { input?: boolean; output?: boolean; yield?: boolean; next?: boolean } = {}
): AsyncFunction.WrapperBuild | SyncFunction.WrapperBuild | AsyncGenerator.WrapperBuild | SyncGenerator.WrapperBuild {
    const params = getParams(params_);
    if (params.type === 'function') {
        return function CloneData(context, input, func) {
            if (behavior.input ?? true) input = structuredClone(input);
            let output = func(context, input);
            if (behavior.output ?? true) output = structuredClone(output);
            return output;
        } satisfies SyncFunction.WrapperBuild;
    }
    if (params.type === 'async function') {
        return async function CloneData(context, input, func) {
            if (behavior.input ?? true) input = structuredClone(input);
            let output = await func(context, input);
            if (behavior.output ?? true) output = structuredClone(output);
            return output;
        } satisfies AsyncFunction.WrapperBuild;
    }
    if (params.type === 'async function*') {
        return async function* CloneData(context, input, func) {
            if (behavior.input ?? true) input = structuredClone(input);
            const g = func(context, input);
            let val = await g.next();
            while (!val.done) {
                let y = val.value;
                if (behavior.yield ?? true) y = structuredClone(y);
                let next = yield y;
                if (behavior.next ?? true) next = structuredClone(next);
                val = await g.next(next);
            }
            let output = val.value;
            if (behavior.output ?? true) output = structuredClone(output);
            return output;
        } satisfies AsyncGenerator.WrapperBuild;
    }
    if (params.type === 'function*') {
        return function* CloneData(context, input, func) {
            if (behavior.input ?? true) input = structuredClone(input);
            const g = func(context, input);
            let val = g.next();
            while (!val.done) {
                let y = val.value;
                if (behavior.yield ?? true) y = structuredClone(y);
                let next = yield y;
                if (behavior.next ?? true) next = structuredClone(next);
                val = g.next(next);
            }
            let output = val.value;
            if (behavior.output ?? true) output = structuredClone(output);
            return output;
        } satisfies SyncGenerator.WrapperBuild;
    }
    throw new Error('Unimplemented!');
}
