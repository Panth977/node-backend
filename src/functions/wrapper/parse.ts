import { z } from 'zod';
import { AsyncFunction } from '../async';
import { SyncFunction } from '../sync';
import { Context } from '../context';
import { SyncGenerator } from '../sync-generator';
import { AsyncGenerator } from '../async-generator';
import { getParams } from '../identifier';

export function SafeParse<
    //
    N extends string,
    I extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
>(params: AsyncFunction.Param<N, I, O, S, C>, behavior?: { input?: boolean; output?: boolean }): AsyncFunction.WrapperBuild<N, I, O, S, C>;
export function SafeParse<
    //
    N extends string,
    I extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
>(params: SyncFunction.Param<N, I, O, S, C>, behavior?: { input?: boolean; output?: boolean }): SyncFunction.WrapperBuild<N, I, O, S, C>;
export function SafeParse<
    //
    N extends string,
    I extends z.ZodType,
    Y extends z.ZodType,
    TN extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
>(
    params: SyncGenerator.Param<N, I, Y, TN, O, S, C>,
    behavior?: { input?: boolean; output?: boolean; yield?: boolean; next?: boolean }
): SyncGenerator.WrapperBuild<N, I, Y, TN, O, S, C>;
export function SafeParse<
    //
    N extends string,
    I extends z.ZodType,
    Y extends z.ZodType,
    TN extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
>(
    params: AsyncGenerator.Param<N, I, Y, TN, O, S, C>,
    behavior?: { input?: boolean; output?: boolean; yield?: boolean; next?: boolean }
): AsyncGenerator.WrapperBuild<N, I, Y, TN, O, S, C>;
export function SafeParse(
    params_:
        | unknown
        | (SyncFunction.Type & SyncFunction.Param)
        | (AsyncFunction.Type & AsyncFunction.Param)
        | (AsyncGenerator.Type & AsyncGenerator.Param)
        | (SyncGenerator.Type & SyncGenerator.Param),
    behavior: { input?: boolean; output?: boolean; yield?: boolean; next?: boolean } = {}
): AsyncFunction.WrapperBuild | SyncFunction.WrapperBuild | AsyncGenerator.WrapperBuild | SyncGenerator.WrapperBuild {
    const params = getParams(params_);
    if (params.type === 'function') {
        return function SafeParse(context, input, func) {
            if (behavior.input ?? true) input = params._input.parse(input);
            let output = func(context, input);
            if (behavior.output ?? true) output = params._output.parse(output);
            return output;
        } satisfies SyncFunction.WrapperBuild;
    }
    if (params.type === 'async function') {
        return async function SafeParse(context, input, func) {
            if (behavior.input ?? true) input = params._input.parse(input);
            let output = await func(context, input);
            if (behavior.output ?? true) output = params._output.parse(output);
            return output;
        } satisfies AsyncFunction.WrapperBuild;
    }
    if (params.type === 'async function*') {
        return async function* SafeParse(context, input, func) {
            if (behavior.input ?? true) input = params._input.parse(input);
            const g = func(context, input);
            let val = await g.next();
            while (!val.done) {
                let y = val.value;
                if (behavior.yield ?? true) y = params._yield.parse(y);
                let next = yield y;
                if (behavior.next ?? true) next = params._next.parse(next);
                val = await g.next(next);
            }
            let output = val.value;
            if (behavior.output ?? true) output = params._output.parse(output);
            return output;
        } satisfies AsyncGenerator.WrapperBuild;
    }
    if (params.type === 'function*') {
        return function* SafeParse(context, input, func) {
            if (behavior.input ?? true) input = params._input.parse(input);
            const g = func(context, input);
            let val = g.next();
            while (!val.done) {
                let y = val.value;
                if (behavior.yield ?? true) y = params._yield.parse(y);
                let next = yield y;
                if (behavior.next ?? true) next = params._next.parse(next);
                val = g.next(next);
            }
            let output = val.value;
            if (behavior.output ?? true) output = params._output.parse(output);
            return output;
        } satisfies SyncGenerator.WrapperBuild;
    }
    throw new Error('Unimplemented!');
}
