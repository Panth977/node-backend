import { z } from 'zod';
import { AsyncFunction } from '../async';
import { SyncFunction } from '../sync';
import { Context } from '../context';
import { SyncGenerator } from '../sync-generator';
import { AsyncGenerator } from '../async-generator';
import { WrapperBuild, getParams } from '../_helper';
import createHttpError from 'http-errors';

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
    TN extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(
    params: SyncGenerator.Params<I, Y, TN, O, L, C>,
    behavior?: { input?: boolean; output?: boolean; yield?: boolean; next?: boolean }
): SyncGenerator.WrapperBuild<I, Y, TN, O, L, C>;
export function SafeParse<
    //
    I extends z.ZodType,
    Y extends z.ZodType,
    TN extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(
    params: AsyncGenerator.Params<I, Y, TN, O, L, C>,
    behavior?: { input?: boolean; output?: boolean; yield?: boolean; next?: boolean }
): AsyncGenerator.WrapperBuild<I, Y, TN, O, L, C>;
export function SafeParse(params_: unknown, behavior: { input?: boolean; output?: boolean; yield?: boolean; next?: boolean } = {}): WrapperBuild {
    const params = getParams(params_);
    let Wrapper: undefined | WrapperBuild;
    if (params.type === 'function') {
        Wrapper = function (context, input, func) {
            if (behavior.input ?? true) {
                const data = params._input.safeParse(input);
                if (!data.success) {
                    context.logger.error('invalid input', data.error.toString());
                    throw createHttpError.BadRequest('Invalid Data Found');
                }
                input = data.data;
            }
            let output = func(context, input);
            if (behavior.output ?? true) {
                const data = params._output.safeParse(output);
                if (!data.success) {
                    context.logger.error('invalid output', data.error.toString());
                    throw createHttpError.BadRequest('Invalid Data Found');
                }
                output = data.data;
            }
            return output;
        } satisfies SyncFunction.WrapperBuild;
    }
    if (params.type === 'async function') {
        Wrapper = async function (context, input, func) {
            if (behavior.input ?? true) {
                const data = params._input.safeParse(input);
                if (!data.success) {
                    context.logger.error('invalid input', data.error.toString());
                    throw createHttpError.BadRequest('Invalid Data Found');
                }
                input = data.data;
            }
            let output = await func(context, input);
            if (behavior.output ?? true) {
                const data = params._output.safeParse(output);
                if (!data.success) {
                    context.logger.error('invalid output', data.error.toString());
                    throw createHttpError.BadRequest('Invalid Data Found');
                }
                output = data.data;
            }
            return output;
        } satisfies AsyncFunction.WrapperBuild;
    }
    if (params.type === 'async function*') {
        Wrapper = async function* (context, input, func) {
            if (behavior.input ?? true) {
                const data = params._input.safeParse(input);
                if (!data.success) {
                    context.logger.error('invalid input', data.error.toString());
                    throw createHttpError.BadRequest('Invalid Data Found');
                }
                input = data.data;
            }
            const g = func(context, input);
            let val = await g.next();
            while (!val.done) {
                let y = val.value;
                if (behavior.yield ?? true) {
                    const data = params._yield.safeParse(y);
                    if (!data.success) {
                        context.logger.error('invalid y', data.error.toString());
                        throw createHttpError.BadRequest('Invalid Data Found');
                    }
                    y = data.data;
                }
                let next = yield y;
                if (behavior.next ?? true) {
                    const data = params._next.safeParse(next);
                    if (!data.success) {
                        context.logger.error('invalid next', data.error.toString());
                        throw createHttpError.BadRequest('Invalid Data Found');
                    }
                    next = data.data;
                }
                val = await g.next(next);
            }
            let output = val.value;
            if (behavior.output ?? true) {
                const data = params._output.safeParse(output);
                if (!data.success) {
                    context.logger.error('invalid output', data.error.toString());
                    throw createHttpError.BadRequest('Invalid Data Found');
                }
                output = data.data;
            }
            return output;
        } satisfies AsyncGenerator.WrapperBuild;
    }
    if (params.type === 'function*') {
        Wrapper = function* (context, input, func) {
            if (behavior.input ?? true) {
                const data = params._input.safeParse(input);
                if (!data.success) {
                    context.logger.error('invalid input', data.error.toString());
                    throw createHttpError.BadRequest('Invalid Data Found');
                }
                input = data.data;
            }
            const g = func(context, input);
            let val = g.next();
            while (!val.done) {
                let y = val.value;
                if (behavior.yield ?? true) {
                    const data = params._yield.safeParse(y);
                    if (!data.success) {
                        context.logger.error('invalid y', data.error.toString());
                        throw createHttpError.BadRequest('Invalid Data Found');
                    }
                    y = data.data;
                }
                let next = yield y;
                if (behavior.next ?? true) {
                    const data = params._next.safeParse(next);
                    if (!data.success) {
                        context.logger.error('invalid next', data.error.toString());
                        throw createHttpError.BadRequest('Invalid Data Found');
                    }
                    next = data.data;
                }
                val = g.next(next);
            }
            let output = val.value;
            if (behavior.output ?? true) {
                const data = params._output.safeParse(output);
                if (!data.success) {
                    context.logger.error('invalid output', data.error.toString());
                    throw createHttpError.BadRequest('Invalid Data Found');
                }
                output = data.data;
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
