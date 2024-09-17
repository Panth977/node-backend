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
>(
    params: AsyncFunction.Params<I, O, L, C>,
    behavior?: { debug?: boolean; input?: boolean; output?: boolean }
): AsyncFunction.WrapperBuild<I, O, L, C>;
export function SafeParse<
    //
    I extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(params: SyncFunction.Params<I, O, L, C>, behavior?: { debug?: boolean; input?: boolean; output?: boolean }): SyncFunction.WrapperBuild<I, O, L, C>;
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
    behavior?: { debug?: boolean; input?: boolean; output?: boolean; yield?: boolean; next?: boolean }
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
    behavior?: { debug?: boolean; input?: boolean; output?: boolean; yield?: boolean; next?: boolean }
): AsyncGenerator.WrapperBuild<I, Y, N, O, L, C>;
export function SafeParse(
    params_: unknown,
    behavior: { debug?: boolean; input?: boolean; output?: boolean; yield?: boolean; next?: boolean } = {}
): WrapperBuild {
    const params = getParams(params_);
    let Wrapper: undefined | WrapperBuild;
    if (params.type === 'function') {
        Wrapper = function (context, input, func) {
            if (behavior.input ?? true) {
                const start = Date.now();
                input = params._input.parse(input, { path: [context.params.getRef() + ':input'] });
                if (behavior.debug) context.log(`${context.params.getRef()}:input parsed in ${Date.now() - start}`);
            }
            let output = func(context, input);
            if (behavior.output ?? true) {
                const start = Date.now();
                output = params._output.parse(output, { path: [context.params.getRef() + ':output'] });
                if (behavior.debug) context.log(`${context.params.getRef()}:output parsed in ${Date.now() - start}`);
            }
            return output;
        } satisfies SyncFunction.WrapperBuild;
    } else if (params.type === 'async function') {
        Wrapper = async function (context, input, func) {
            if (behavior.input ?? true) {
                const start = Date.now();
                input = params._input.parse(input, { path: [context.params.getRef() + ':input'] });
                if (behavior.debug) context.log(`${context.params.getRef()}:input parsed in ${Date.now() - start}`);
            }
            let output = await func(context, input);
            if (behavior.output ?? true) {
                const start = Date.now();
                output = params._output.parse(output, { path: [context.params.getRef() + ':output'] });
                if (behavior.debug) context.log(`${context.params.getRef()}:output parsed in ${Date.now() - start}`);
            }
            return output;
        } satisfies AsyncFunction.WrapperBuild;
    } else if (params.type === 'async function*') {
        Wrapper = async function* (context, input, func) {
            if (behavior.input ?? true) {
                const start = Date.now();
                input = params._input.parse(input, { path: [context.params.getRef() + ':input'] });
                if (behavior.debug) context.log(`${context.params.getRef()}:input parsed in ${Date.now() - start}`);
            }
            const g = func(context, input);
            let val = await g.next();
            while (!val.done) {
                let y = val.value;
                if (behavior.yield ?? true) {
                    const start = Date.now();
                    y = params._yield.parse(y, { path: [context.params.getRef() + ':yield'] });
                    if (behavior.debug) context.log(`${context.params.getRef()}:yield parsed in ${Date.now() - start}`);
                }
                let next = yield y;
                if (behavior.next ?? true) {
                    const start = Date.now();
                    next = params._next.parse(next, { path: [context.params.getRef() + ':next'] });
                    if (behavior.debug) context.log(`${context.params.getRef()}:next parsed in ${Date.now() - start}`);
                }
                val = await g.next(next);
            }
            let output = val.value;
            if (behavior.output ?? true) {
                const start = Date.now();
                output = params._output.parse(output, { path: [context.params.getRef() + ':output'] });
                if (behavior.debug) context.log(`${context.params.getRef()}:output parsed in ${Date.now() - start}`);
            }
            return output;
        } satisfies AsyncGenerator.WrapperBuild;
    } else if (params.type === 'function*') {
        Wrapper = function* (context, input, func) {
            if (behavior.input ?? true) {
                const start = Date.now();
                input = params._input.parse(input, { path: [context.params.getRef() + ':input'] });
                if (behavior.debug) context.log(`${context.params.getRef()}:input parsed in ${Date.now() - start}`);
            }
            const g = func(context, input);
            let val = g.next();
            while (!val.done) {
                let y = val.value;
                if (behavior.yield ?? true) {
                    const start = Date.now();
                    y = params._yield.parse(y, { path: [context.params.getRef() + ':yield'] });
                    if (behavior.debug) context.log(`${context.params.getRef()}:yield parsed in ${Date.now() - start}`);
                }
                let next = yield y;
                if (behavior.next ?? true) {
                    const start = Date.now();
                    next = params._next.parse(next, { path: [context.params.getRef() + ':next'] });
                    if (behavior.debug) context.log(`${context.params.getRef()}:next parsed in ${Date.now() - start}`);
                }
                val = g.next(next);
            }
            let output = val.value;
            if (behavior.output ?? true) {
                const start = Date.now();
                output = params._output.parse(output, { path: [context.params.getRef() + ':output'] });
                if (behavior.debug) context.log(`${context.params.getRef()}:output parsed in ${Date.now() - start}`);
            }
            return output;
        } satisfies SyncGenerator.WrapperBuild;
    } else {
        throw new Error('Unimplemented!');
    }
    return Object.assign(Wrapper, { [instance]: SafeParse });
}
const instance = Symbol();
export function isSafeParse<W>(w: W): boolean {
    return typeof w === 'function' && instance in w && w[instance] === SafeParse;
}
