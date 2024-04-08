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

export function AsyncLogTime<
    //
    N extends string,
    I extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
>(params: AsyncFunctionParam<N, I, O, S, C>): AsyncFunctionWrapperBuild<N, I, O, S, C> {
    return async function LogTime(context, input, func) {
        const start = Date.now();
        try {
            const output = await func(context, input);
            return output;
        } finally {
            context.logger.debug('⏳ Time', { time: Date.now() - start, stack: context.getStack() });
        }
    };
}

export function SyncLogTime<
    //
    N extends string,
    I extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
>(params: SyncFunctionParam<N, I, O, S, C>): SyncFunctionWrapperBuild<N, I, O, S, C> {
    return function LogTime(context, input, func) {
        const start = Date.now();
        try {
            const output = func(context, input);
            return output;
        } finally {
            context.logger.debug('⏳ Time', { time: Date.now() - start, stack: context.getStack() });
        }
    };
}

export function SyncGeneratorLogTime<
    //
    N extends string,
    I extends z.ZodType,
    Y extends z.ZodType,
    TN extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
>(params: SyncGeneratorParam<N, I, Y, TN, O, S, C>): SyncGeneratorWrapperBuild<N, I, Y, TN, O, S, C> {
    return function* LogTime(context, input, func) {
        const start = Date.now();
        try {
            const g = func(context, input);
            let val = g.next();
            let i = 0;
            context.logger.debug('⏳ Time', { yield: i, time: Date.now() - start, stack: context.getStack() });
            while (!val.done) {
                i++;
                const next = yield val.value;
                val = g.next(next);
                context.logger.debug('⏳ Time', { yield: i, time: Date.now() - start, stack: context.getStack() });
            }
            return val.value;
        } finally {
            context.logger.debug('⏳ Time', { time: Date.now() - start, stack: context.getStack() });
        }
    };
}
export function AsyncGeneratorLogTime<
    //
    N extends string,
    I extends z.ZodType,
    Y extends z.ZodType,
    TN extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
>(params: AsyncGeneratorParam<N, I, Y, TN, O, S, C>): AsyncGeneratorWrapperBuild<N, I, Y, TN, O, S, C> {
    return async function* LogTime(context, input, func) {
        const start = Date.now();
        try {
            const g = func(context, input);
            let i = 0;
            let val = await g.next();
            context.logger.debug('⏳ Time', { yield: i, time: Date.now() - start, stack: context.getStack() });
            while (!val.done) {
                i++;
                const next = yield val.value;
                val = await g.next(next);
                context.logger.debug('⏳ Time', { yield: i, time: Date.now() - start, stack: context.getStack() });
            }
            return val.value;
        } finally {
            context.logger.debug('⏳ Time', { time: Date.now() - start, stack: context.getStack() });
        }
    };
}
