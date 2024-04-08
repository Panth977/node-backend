import { z } from 'zod';
import { Context } from './context';

type Return<T> = Promise<T>;

type Fn<C, I, O> = (context: C, input: I) => Return<O>;
type WFn<C, I, O> = (context: C, input: I, func: Fn<C, I, O>) => Return<O>;

export type AsyncFunctionWrapperBuild<
    //
    N extends string,
    I extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
> = WFn<C & { params: AsyncFunctionParam<N, I, O, S, C> }, I['_output'], O['_input']>;

export type AsyncFunctionParam<
    //
    N extends string,
    I extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
> = {
    _name: N;
    _input: I;
    _output: O;
    _static: S;
    wrappers?: (params: AsyncFunctionParam<N, I, O, S, C>) => AsyncFunctionWrapperBuild<N, I, O, S, C>[];
    func: Fn<C & { params: AsyncFunctionParam<N, I, O, S, C> }, I['_output'], O['_input']>;
};
export type AsyncFunctionBuild<
    //
    N extends string,
    I extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
> = { type: 'async function' } & AsyncFunctionParam<N, I, O, S, C> & Fn<C, I['_input'], O['_output']>;

function wrap<C extends Context, I, O>(func: Fn<C, I, O>, wrapper: null | WFn<C, I, O>): Fn<C, I, O> {
    if (wrapper) {
        const stackLabel = Object.freeze({ name: wrapper.name, in: 'wrapper' });
        return (context, input) => wrapper(Object.assign({}, context, { stack: Object.freeze([...context.stack, stackLabel]) }), input, func);
    }
    const implementationLabel = Object.freeze({ name: 'func', in: 'implementation' });
    return (context, input) => func(Object.assign({}, context, { stack: Object.freeze([...context.stack, implementationLabel]) }), input);
}

export function asyncFunction<
    //
    N extends string,
    I extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
>(params: AsyncFunctionParam<N, I, O, S, C>): AsyncFunctionBuild<N, I, O, S, C> {
    params = Object.freeze(params);
    const func = [...(params.wrappers?.(params) ?? []), null].reduceRight(wrap, params.func);
    const stackLabel = Object.freeze({ name: params._name, in: 'async function' });
    const f: Fn<C, I['_input'], O['_output']> = (context, input) =>
        func(Object.assign({}, context, { params }, { stack: Object.freeze([...context.stack, stackLabel]) }), input);
    Object.defineProperty(f, 'name', { value: params._name, writable: false });
    return Object.assign(f, params, { type: 'async function' } as const);
}
