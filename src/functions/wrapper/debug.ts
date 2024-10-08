import { z } from 'zod';
import { AsyncFunction } from '../async';
import { SyncFunction } from '../sync';
import { Context } from '../context';
import { SyncGenerator } from '../sync-generator';
import { AsyncGenerator } from '../async-generator';
import { WrapperBuild, getParams } from '../_helper';

export function Debug<
    //
    I extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(
    params: AsyncFunction.Params<I, O, L, C>,
    behavior?: { maxTimeAllowed?: number; input?: boolean; output?: boolean }
): AsyncFunction.WrapperBuild<I, O, L, C>;
export function Debug<
    //
    I extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(
    params: SyncFunction.Params<I, O, L, C>,
    behavior?: { maxTimeAllowed?: number; input?: boolean; output?: boolean }
): SyncFunction.WrapperBuild<I, O, L, C>;
export function Debug<
    //
    I extends z.ZodType,
    Y extends z.ZodType,
    N extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(
    params: SyncGenerator.Params<I, Y, N, O, L, C>,
    behavior?: { maxTimeAllowed?: number; input?: boolean; output?: boolean; yield?: boolean; next?: boolean }
): SyncGenerator.WrapperBuild<I, Y, N, O, L, C>;
export function Debug<
    //
    I extends z.ZodType,
    Y extends z.ZodType,
    N extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(
    params: AsyncGenerator.Params<I, Y, N, O, L, C>,
    behavior?: { maxTimeAllowed?: number; input?: boolean; output?: boolean; yield?: boolean; next?: boolean }
): AsyncGenerator.WrapperBuild<I, Y, N, O, L, C>;
export function Debug(
    params_: unknown,
    behavior: { maxTimeAllowed?: number; input?: boolean; output?: boolean; yield?: boolean; next?: boolean } = {}
): WrapperBuild {
    const params = getParams(params_);
    let Wrapper: WrapperBuild | undefined;
    if (params.type === 'function') {
        Wrapper = function (context, input, func) {
            const start = Date.now();
            try {
                if (behavior.input) context.log('input', input);
                const output = func(context, input);
                if (behavior.output) context.log('output', output);
                return output;
            } finally {
                const timeTaken = Date.now() - start;
                context.log('⏳ Time', {
                    throttle: behavior.maxTimeAllowed && behavior.maxTimeAllowed < timeTaken ? true : false,
                    time: timeTaken,
                });
            }
        } satisfies SyncFunction.WrapperBuild;
    }
    if (params.type === 'async function') {
        Wrapper = async function (context, input, func) {
            const start = Date.now();
            try {
                if (behavior.input) context.log('input', input);
                const output = await func(context, input);
                if (behavior.output) context.log('output', output);
                return output;
            } finally {
                const timeTaken = Date.now() - start;
                context.log('⏳ Time', {
                    throttle: behavior.maxTimeAllowed && behavior.maxTimeAllowed < timeTaken ? true : false,
                    time: timeTaken,
                });
            }
        } satisfies AsyncFunction.WrapperBuild;
    }
    if (params.type === 'async function*') {
        Wrapper = async function* (context, input, func) {
            const start = Date.now();
            try {
                if (behavior.input) context.log('input', input);
                const g = func(context, input);
                let val = await g.next();
                let i = 0;
                while (!val.done) {
                    const timeTaken = Date.now() - start;
                    context.log('⏳ Time', {
                        yield: i,
                        throttle: behavior.maxTimeAllowed && behavior.maxTimeAllowed < timeTaken ? true : false,
                        time: timeTaken,
                    });
                    i++;
                    if (behavior.yield) context.log('yield', val.value);
                    const next = yield val.value;
                    if (behavior.next) context.log('next', next);
                    val = await g.next(next);
                }
                if (behavior.output) context.log('output', val.value);
            } finally {
                context.log('⏳ Time', { time: Date.now() - start, stack: context.getStack() });
            }
        } satisfies AsyncGenerator.WrapperBuild;
    }
    if (params.type === 'function*') {
        Wrapper = function* (context, input, func) {
            const start = Date.now();
            try {
                if (behavior.input) context.log('input', input);
                const g = func(context, input);
                let val = g.next();
                let i = 0;
                while (!val.done) {
                    const timeTaken = Date.now() - start;
                    context.log('⏳ Time', {
                        yield: i,
                        throttle: behavior.maxTimeAllowed && behavior.maxTimeAllowed < timeTaken ? true : false,
                        time: timeTaken,
                    });
                    i++;
                    if (behavior.yield) context.log('yield', val.value);
                    const next = yield val.value;
                    if (behavior.next) context.log('next', next);
                    val = g.next(next);
                }
                if (behavior.output) context.log('output', val.value);
                return val.value;
            } finally {
                context.log('⏳ Time', { time: Date.now() - start, stack: context.getStack() });
            }
        } satisfies SyncGenerator.WrapperBuild;
    }
    if (Wrapper) return Object.assign(Wrapper, { [instance]: Debug });
    throw new Error('Unimplemented!');
}
const instance = Symbol();
export function isDebug<W>(w: W): boolean {
    return typeof w === 'function' && instance in w && w[instance] === Debug;
}
