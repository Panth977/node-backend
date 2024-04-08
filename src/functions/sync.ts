import { z } from 'zod';
import { Context } from './context';

type Return<T> = T;
type Fn<C, I, O> = (context: C, input: I) => Return<O>;
type WFn<C, I, O> = (context: C, input: I, func: Fn<C, I, O>) => Return<O>;

export type SyncFunctionWrapperBuild<
    //
    N extends string,
    I extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
> = WFn<C & { params: SyncFunctionParam<N, I, O, S, C> }, I['_output'], O['_input']>;

export type SyncFunctionParam<
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
    wrappers?: (params: SyncFunctionParam<N, I, O, S, C>) => SyncFunctionWrapperBuild<N, I, O, S, C>[];
    func: Fn<C & { params: SyncFunctionParam<N, I, O, S, C> }, I['_output'], O['_input']>;
};
export type SyncFunctionBuild<
    //
    N extends string,
    I extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
> = { type: 'function' } & SyncFunctionParam<N, I, O, S, C> & Fn<C, I['_input'], O['_output']>;

function wrap<C extends Context, I, O>(func: Fn<C, I, O>, wrapper: null | WFn<C, I, O>): Fn<C, I, O> {
    if (wrapper) {
        const stackLabel = Object.freeze({ name: wrapper.name, in: 'wrapper' });
        return (context, input) => wrapper(Object.assign({}, context, { stack: Object.freeze([...context.stack, stackLabel]) }), input, func);
    }
    const implementationLabel = Object.freeze({ name: 'func', in: 'implementation' });
    return (context, input) => func(Object.assign({}, context, { stack: Object.freeze([...context.stack, implementationLabel]) }), input);
}

export function syncFunction<
    //
    N extends string,
    I extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
>(params: SyncFunctionParam<N, I, O, S, C>): SyncFunctionBuild<N, I, O, S, C> {
    params = Object.freeze(params);
    const func = [...(params.wrappers?.(params) ?? []), null].reduceRight(wrap, params.func);
    const stackLabel = Object.freeze({ name: params._name, in: 'function' });
    const f: Fn<C, I['_input'], O['_output']> = (context, input) =>
        func(Object.assign({}, context, { params }, { stack: Object.freeze([...context.stack, stackLabel]) }), input);
    Object.defineProperty(f, 'name', { value: params._name, writable: false });
    return Object.assign(f, params, { type: 'function' } as const);
}
