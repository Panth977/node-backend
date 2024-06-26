import { z } from 'zod';
import { AsyncFunction } from '../async';
import { SyncFunction } from '../sync';
import { Context } from '../context';
import { SyncGenerator } from '../sync-generator';
import { AsyncGenerator } from '../async-generator';
import { WrapperBuild, getParams } from '../_helper';

export function CloneData<
    //
    I extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(params: AsyncFunction.Params<I, O, L, C>, behavior?: { input?: boolean; output?: boolean }): AsyncFunction.WrapperBuild<I, O, L, C>;
export function CloneData<
    //
    I extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(params: SyncFunction.Params<I, O, L, C>, behavior?: { input?: boolean; output?: boolean }): SyncFunction.WrapperBuild<I, O, L, C>;
export function CloneData<
    //
    I extends z.ZodType,
    Y extends z.ZodType,
    N extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(
    params: SyncGenerator.Params<I, Y, N, O, L, C>,
    behavior?: { input?: boolean; output?: boolean; yield?: boolean; next?: boolean }
): SyncGenerator.WrapperBuild<I, Y, N, O, L, C>;
export function CloneData<
    //
    I extends z.ZodType,
    Y extends z.ZodType,
    N extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(
    params: AsyncGenerator.Params<I, Y, N, O, L, C>,
    behavior?: { input?: boolean; output?: boolean; yield?: boolean; next?: boolean }
): AsyncGenerator.WrapperBuild<I, Y, N, O, L, C>;
export function CloneData(
    params_: unknown,
    behavior: { input?: boolean; output?: boolean; yield?: boolean; next?: boolean } = {}
): AsyncFunction.WrapperBuild | SyncFunction.WrapperBuild | AsyncGenerator.WrapperBuild | SyncGenerator.WrapperBuild {
    const params = getParams(params_);
    let Wrapper: WrapperBuild | undefined;
    if (params.type === 'function') {
        Wrapper = function (context, input, func) {
            if (behavior.input ?? true) input = structuredClone(input);
            let output = func(context, input);
            if (behavior.output ?? true) output = structuredClone(output);
            return output;
        } satisfies SyncFunction.WrapperBuild;
    }
    if (params.type === 'async function') {
        Wrapper = async function (context, input, func) {
            if (behavior.input ?? true) input = structuredClone(input);
            let output = await func(context, input);
            if (behavior.output ?? true) output = structuredClone(output);
            return output;
        } satisfies AsyncFunction.WrapperBuild;
    }
    if (params.type === 'async function*') {
        Wrapper = async function* (context, input, func) {
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
        Wrapper = function* (context, input, func) {
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
    if (Wrapper) return Object.assign(Wrapper, { [instance]: CloneData });
    throw new Error('Unimplemented!');
}
const instance = Symbol();
export function isCloneData<W>(w: W): boolean {
    return typeof w === 'function' && instance in w && w[instance] === CloneData;
}
