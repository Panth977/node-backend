import { z } from 'zod';
import {
    AsyncFunctionWrapperBuild,
    SyncFunctionWrapperBuild,
    AsyncGeneratorWrapperBuild,
    SyncGeneratorWrapperBuild,
    AsyncFunctionParam,
    SyncFunctionParam,
    SyncGeneratorParam,
    AsyncGeneratorParam,
} from '..';
import { Context } from '../context';

export function AsyncCloneData<
    //
    N extends string,
    I extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
>(
    params: AsyncFunctionParam<N, I, O, S, C>,
    { input: cloneInput = true, output: cloneOutput = true } = {}
): AsyncFunctionWrapperBuild<N, I, O, S, C> {
    return async function CloneData(context, input, func) {
        if (cloneInput) input = structuredClone(input);
        let output = await func(context, input);
        if (cloneOutput) output = structuredClone(output);
        return output;
    };
}
export function SyncCloneData<
    //
    N extends string,
    I extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
>(params: SyncFunctionParam<N, I, O, S, C>, { input: cloneInput = true, output: cloneOutput = true } = {}): SyncFunctionWrapperBuild<N, I, O, S, C> {
    return function CloneData(context, input, func) {
        if (cloneInput) input = structuredClone(input);
        let output = func(context, input);
        if (cloneOutput) output = structuredClone(output);
        return output;
    };
}

export function SyncGeneratorCloneData<
    //
    N extends string,
    I extends z.ZodType,
    Y extends z.ZodType,
    TN extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
>(
    params: SyncGeneratorParam<N, I, Y, TN, O, S, C>,
    { input: cloneInput = true, output: cloneOutput = true, yield: cloneYield = true, next: cloneNext = true } = {}
): //
SyncGeneratorWrapperBuild<N, I, Y, TN, O, S, C> {
    return function* CloneData(context, input, func) {
        if (cloneInput) input = structuredClone(input);
        const g = func(context, input);
        let val = g.next();
        while (!val.done) {
            let y = val.value;
            if (cloneYield) y = structuredClone(y);
            let next = yield y;
            if (cloneNext) next = structuredClone(next);
            val = g.next(next);
        }
        let output = val.value;
        if (cloneOutput) output = structuredClone(output);
        return output;
    };
}
export function AsyncGeneratorCloneData<
    //
    N extends string,
    I extends z.ZodType,
    Y extends z.ZodType,
    TN extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
>(
    params: AsyncGeneratorParam<N, I, Y, TN, O, S, C>,
    { input: cloneInput = true, output: cloneOutput = true, yield: cloneYield = true, next: cloneNext = true } = {}
): //
AsyncGeneratorWrapperBuild<N, I, Y, TN, O, S, C> {
    return async function* CloneData(context, input, func) {
        if (cloneInput) input = structuredClone(input);
        const g = func(context, input);
        let val = await g.next();
        while (!val.done) {
            let y = val.value;
            if (cloneYield) y = structuredClone(y);
            let next = yield y;
            if (cloneNext) next = structuredClone(next);
            val = await g.next(next);
        }
        let output = val.value;
        if (cloneOutput) output = structuredClone(output);
        return output;
    };
}
