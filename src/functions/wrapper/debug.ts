import { z } from 'zod';
import { AsyncFunction } from '../async';
import { SyncFunction } from '../sync';
import { Context } from '../context';
import { SyncGenerator } from '../sync-generator';
import { AsyncGenerator } from '../async-generator';
import { getParams } from '../_helper';

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
    TN extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(
    params: SyncGenerator.Params<I, Y, TN, O, L, C>,
    behavior?: { maxTimeAllowed?: number; input?: boolean; output?: boolean; yield?: boolean; next?: boolean }
): SyncGenerator.WrapperBuild<I, Y, TN, O, L, C>;
export function Debug<
    //
    I extends z.ZodType,
    Y extends z.ZodType,
    TN extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(
    params: AsyncGenerator.Params<I, Y, TN, O, L, C>,
    behavior?: { maxTimeAllowed?: number; input?: boolean; output?: boolean; yield?: boolean; next?: boolean }
): AsyncGenerator.WrapperBuild<I, Y, TN, O, L, C>;
export function Debug(
    params_: unknown,
    behavior: { maxTimeAllowed?: number; input?: boolean; output?: boolean; yield?: boolean; next?: boolean } = {}
): AsyncFunction.WrapperBuild | SyncFunction.WrapperBuild | AsyncGenerator.WrapperBuild | SyncGenerator.WrapperBuild {
    const params = getParams(params_);
    if (params.type === 'function') {
        return function Debug(context, input, func) {
            const start = Date.now();
            try {
                if (behavior.input) context.logger.debug('input', input);
                const output = func(context, input);
                if (behavior.output) context.logger.debug('output', output);
                return output;
            } finally {
                const timeTaken = Date.now() - start;
                context.logger.debug('⏳ Time', {
                    throttle: behavior.maxTimeAllowed && behavior.maxTimeAllowed > timeTaken ? true : false,
                    time: timeTaken,
                    stack: context.getStack(),
                });
            }
        } satisfies SyncFunction.WrapperBuild;
    }
    if (params.type === 'async function') {
        return async function Debug(context, input, func) {
            const start = Date.now();
            try {
                if (behavior.input) context.logger.debug('input', input);
                const output = await func(context, input);
                if (behavior.output) context.logger.debug('output', output);
                return output;
            } finally {
                const timeTaken = Date.now() - start;
                context.logger.debug('⏳ Time', {
                    throttle: behavior.maxTimeAllowed && behavior.maxTimeAllowed > timeTaken ? true : false,
                    time: timeTaken,
                    stack: context.getStack(),
                });
            }
        } satisfies AsyncFunction.WrapperBuild;
    }
    if (params.type === 'async function*') {
        return async function* Debug(context, input, func) {
            const start = Date.now();
            try {
                if (behavior.input) context.logger.debug('input', input);
                const g = func(context, input);
                let val = await g.next();
                let i = 0;
                while (!val.done) {
                    const timeTaken = Date.now() - start;
                    context.logger.debug('⏳ Time', {
                        yield: i,
                        throttle: behavior.maxTimeAllowed && behavior.maxTimeAllowed > timeTaken ? true : false,
                        time: timeTaken,
                        stack: context.getStack(),
                    });
                    i++;
                    if (behavior.yield) context.logger.debug('yield', val.value);
                    const next = yield val.value;
                    if (behavior.next) context.logger.debug('next', next);
                    val = await g.next(next);
                }
                if (behavior.output) context.logger.debug('output', val.value);
            } finally {
                context.logger.debug('⏳ Time', { time: Date.now() - start, stack: context.getStack() });
            }
        } satisfies AsyncGenerator.WrapperBuild;
    }
    if (params.type === 'function*') {
        return function* Debug(context, input, func) {
            const start = Date.now();
            try {
                if (behavior.input) context.logger.debug('input', input);
                const g = func(context, input);
                let val = g.next();
                let i = 0;
                while (!val.done) {
                    const timeTaken = Date.now() - start;
                    context.logger.debug('⏳ Time', {
                        yield: i,
                        throttle: behavior.maxTimeAllowed && behavior.maxTimeAllowed > timeTaken ? true : false,
                        time: timeTaken,
                        stack: context.getStack(),
                    });
                    i++;
                    if (behavior.yield) context.logger.debug('yield', val.value);
                    const next = yield val.value;
                    if (behavior.next) context.logger.debug('next', next);
                    val = g.next(next);
                }
                if (behavior.output) context.logger.debug('output', val.value);
                return val.value;
            } finally {
                context.logger.debug('⏳ Time', { time: Date.now() - start, stack: context.getStack() });
            }
        } satisfies SyncGenerator.WrapperBuild;
    }
    throw new Error('Unimplemented!');
}
