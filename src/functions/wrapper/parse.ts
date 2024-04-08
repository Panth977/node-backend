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

export function AsyncSafeParse<
    //
    N extends string,
    I extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
>(
    params: AsyncFunctionParam<N, I, O, S, C>,
    { input: parseInput = true, output: parseOutput = true } = {}
): AsyncFunctionWrapperBuild<N, I, O, S, C> {
    return async function SafeParse(context, input, func) {
        if (parseInput) input = params._input.parse(input);
        let output = await func(context, input);
        if (parseOutput) output = params._output.parse(output);
        return output;
    };
}
export function SyncSafeParse<
    //
    N extends string,
    I extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
>(params: SyncFunctionParam<N, I, O, S, C>, { input: parseInput = true, output: parseOutput = true } = {}): SyncFunctionWrapperBuild<N, I, O, S, C> {
    return function SafeParse(context, input, func) {
        if (parseInput) input = context.params._input.parse(input);
        let output = func(context, input);
        if (parseOutput) output = context.params._output.parse(output);
        return output;
    };
}

export function SyncGeneratorSafeParse<
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
    { input: parseInput = true, output: parseOutput = true, yield: parseYield = true, next: parseNext = true } = {}
): SyncGeneratorWrapperBuild<N, I, Y, TN, O, S, C> {
    return function* SafeParse(context, input, func) {
        if (parseInput) input = context.params._input.parse(input);
        const g = func(context, input);
        let val = g.next();
        while (!val.done) {
            let y = val.value;
            if (parseYield) y = context.params._yield.parse(y);
            let next = yield y;
            if (parseNext) next = context.params._next.parse(next);
            val = g.next(next);
        }
        let output = val.value;
        if (parseOutput) output = context.params._output.parse(output);
        return output;
    };
}
export function AsyncGeneratorSafeParse<
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
    { input: parseInput = true, output: parseOutput = true, yield: parseYield = true, next: parseNext = true } = {}
): //
AsyncGeneratorWrapperBuild<N, I, Y, TN, O, S, C> {
    return async function* SafeParse(context, input, func) {
        if (parseInput) input = context.params._input.parse(input);
        const g = func(context, input);
        let val = await g.next();
        while (!val.done) {
            let y = val.value;
            if (parseYield) y = context.params._yield.parse(y);
            let next = yield y;
            if (parseNext) next = context.params._next.parse(next);
            val = await g.next(next);
        }
        let output = val.value;
        if (parseOutput) output = context.params._output.parse(output);
        return output;
    };
}
