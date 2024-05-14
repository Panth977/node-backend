import { z } from 'zod';
import { AsyncFunction } from '../async';
import { SyncFunction } from '../sync';
import { Context } from '../context';
import { SyncGenerator } from '../sync-generator';
import { AsyncGenerator } from '../async-generator';
import { WrapperBuild, getParams } from '../_helper';

export function SafeParse<
    //
    I extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(params: AsyncFunction.Params<I, O, L, C>, behavior?: { input?: boolean; output?: boolean }): AsyncFunction.WrapperBuild<I, O, L, C>;
export function SafeParse<
    //
    I extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(params: SyncFunction.Params<I, O, L, C>, behavior?: { input?: boolean; output?: boolean }): SyncFunction.WrapperBuild<I, O, L, C>;
export function SafeParse<
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
export function SafeParse<
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
export function SafeParse(params_: unknown, behavior: { input?: boolean; output?: boolean; yield?: boolean; next?: boolean } = {}): WrapperBuild {
    const params = getParams(params_);
    let Wrapper: undefined | WrapperBuild;
    if (params.type === 'function') {
        Wrapper = function (context, input, func) {
            if (behavior.input ?? true) {
                input = params._input.parse(input, { path: [context.params.getNamespace(), context.params.getName(), 'input'] });
            }
            let output = func(context, input);
            if (behavior.output ?? true) {
                output = params._output.parse(output, { path: [context.params.getNamespace(), context.params.getName(), 'output'] });
            }
            return output;
        } satisfies SyncFunction.WrapperBuild;
    }
    if (params.type === 'async function') {
        Wrapper = async function (context, input, func) {
            if (behavior.input ?? true) {
                input = params._input.parse(input, { path: [context.params.getNamespace(), context.params.getName(), 'input'] });
            }
            let output = await func(context, input);
            if (behavior.output ?? true) {
                output = params._output.parse(output, { path: [context.params.getNamespace(), context.params.getName(), 'output'] });
            }
            return output;
        } satisfies AsyncFunction.WrapperBuild;
    }
    if (params.type === 'async function*') {
        Wrapper = async function* (context, input, func) {
            if (behavior.input ?? true) {
                input = params._input.parse(input, { path: [context.params.getNamespace(), context.params.getName(), 'input'] });
            }
            const g = func(context, input);
            let val = await g.next();
            while (!val.done) {
                let y = val.value;
                if (behavior.yield ?? true) {
                    y = params._input.parse(y, { path: [context.params.getNamespace(), context.params.getName(), 'yield'] });
                }
                let next = yield y;
                if (behavior.next ?? true) {
                    next = params._input.parse(next, { path: [context.params.getNamespace(), context.params.getName(), 'next'] });
                }
                val = await g.next(next);
            }
            let output = val.value;
            if (behavior.output ?? true) {
                output = params._input.parse(output, { path: [context.params.getNamespace(), context.params.getName(), 'output'] });
            }
            return output;
        } satisfies AsyncGenerator.WrapperBuild;
    }
    if (params.type === 'function*') {
        Wrapper = function* (context, input, func) {
            if (behavior.input ?? true) {
                input = params._input.parse(input, { path: [context.params.getNamespace(), context.params.getName(), 'input'] });
            }
            const g = func(context, input);
            let val = g.next();
            while (!val.done) {
                let y = val.value;
                if (behavior.yield ?? true) {
                    y = params._input.parse(y, { path: [context.params.getNamespace(), context.params.getName(), 'yield'] });
                }
                let next = yield y;
                if (behavior.next ?? true) {
                    next = params._input.parse(next, { path: [context.params.getNamespace(), context.params.getName(), 'next'] });
                }
                val = g.next(next);
            }
            let output = val.value;
            if (behavior.output ?? true) {
                output = params._input.parse(output, { path: [context.params.getNamespace(), context.params.getName(), 'output'] });
            }
            return output;
        } satisfies SyncGenerator.WrapperBuild;
    }
    if (Wrapper) return Object.assign(Wrapper, { [instance]: SafeParse });
    throw new Error('Unimplemented!');
}
const instance = Symbol();
export function isSafeParse<W>(w: W): boolean {
    return typeof w === 'function' && instance in w && w[instance] === SafeParse;
}
