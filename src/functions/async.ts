import { z } from 'zod';
import { Context } from './context';

export namespace AsyncFunction {
    export type Type = { type: 'async function' };
    export type Return<T> = Promise<T>;
    export type Fn<C, I, O> = (context: C, input: I) => Return<O>;
    export type WFn<C, I, O> = (context: C, input: I, func: Fn<C, I, O>) => Return<O>;

    export type WrapperBuild<
        //
        N extends string = string,
        I extends z.ZodType = z.ZodType,
        O extends z.ZodType = z.ZodType,
        S = unknown,
        C extends Context = Context,
    > = WFn<C & { params: Param<N, I, O, S, C> }, I['_output'], O['_input']>;
    export type Param<
        //
        N extends string = string,
        I extends z.ZodType = z.ZodType,
        O extends z.ZodType = z.ZodType,
        S = unknown,
        C extends Context = Context,
    > = {
        _name: N;
        _input: I;
        _output: O;
        _static: S;
        wrappers?: (params: Type & Param<N, I, O, S, C>) => WrapperBuild<N, I, O, S, C>[];
        func: Fn<C & { params: Param<N, I, O, S, C> }, I['_output'], O['_input']>;
    };
    export type Build<
        //
        N extends string = string,
        I extends z.ZodType = z.ZodType,
        O extends z.ZodType = z.ZodType,
        S = unknown,
        C extends Context = Context,
    > = Type & Param<N, I, O, S, C> & Fn<C, I['_input'], O['_output']>;
}

function wrap<C extends Context, I, O>(func: AsyncFunction.Fn<C, I, O>, wrapper: null | AsyncFunction.WFn<C, I, O>): AsyncFunction.Fn<C, I, O> {
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
>(_params: AsyncFunction.Param<N, I, O, S, C>): AsyncFunction.Build<N, I, O, S, C> {
    const params = Object.freeze(Object.assign(_params, { type: 'async function' } as const));
    const func = [...(params.wrappers?.(params) ?? []), null].reduceRight(wrap, params.func);
    const stackLabel = Object.freeze({ name: params._name, in: 'async function' });
    const f: AsyncFunction.Fn<C, I['_input'], O['_output']> = (context, input) =>
        func(Object.assign({}, context, { params }, { stack: Object.freeze([...context.stack, stackLabel]) }), input);
    Object.defineProperty(f, 'name', { value: params._name, writable: false });
    return Object.assign(f, params);
}
