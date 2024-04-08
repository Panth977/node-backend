import { z } from 'zod';
import { Context } from './context';

export namespace AsyncGenerator {
    export type Type = { type: 'async function*' };
    export type Return<T, TN, R> = AsyncGenerator<T, R, TN>;
    export type Fn<C, I, Y, TN, O> = (context: C, input: I) => Return<Y, TN, O>;
    export type WFn<C, I, Y, TN, O> = (context: C, input: I, func: Fn<C, I, Y, TN, O>) => Return<Y, TN, O>;

    export type WrapperBuild<
        //
        N extends string = string,
        I extends z.ZodType = z.ZodType,
        Y extends z.ZodType = z.ZodType,
        TN extends z.ZodType = z.ZodType,
        O extends z.ZodType = z.ZodType,
        S = unknown,
        C extends Context = Context,
    > = WFn<C & { params: Param<N, I, Y, TN, O, S, C> }, I['_output'], Y['_input'], TN['_output'], O['_input']>;

    export type Param<
        //
        N extends string = string,
        I extends z.ZodType = z.ZodType,
        Y extends z.ZodType = z.ZodType,
        TN extends z.ZodType = z.ZodType,
        O extends z.ZodType = z.ZodType,
        S = unknown,
        C extends Context = Context,
    > = {
        _name: N;
        _input: I;
        _yield: Y;
        _next: TN;
        _output: O;
        _static: S;
        wrappers?: (params: Type & Param<N, I, Y, TN, O, S, C>) => WrapperBuild<N, I, Y, TN, O, S, C>[];
        func: Fn<C & { params: Param<N, I, Y, TN, O, S, C> }, I['_output'], Y['_input'], TN['_output'], O['_input']>;
    };
    export type Build<
        //
        N extends string = string,
        I extends z.ZodType = z.ZodType,
        Y extends z.ZodType = z.ZodType,
        TN extends z.ZodType = z.ZodType,
        O extends z.ZodType = z.ZodType,
        S = unknown,
        C extends Context = Context,
    > = Type & Param<N, I, Y, TN, O, S, C> & Fn<C, I['_input'], Y['_output'], TN['_input'], O['_output']>;
}

function wrap<C extends Context, I, Y, TN, O>(
    func: AsyncGenerator.Fn<C, I, Y, TN, O>,
    wrapper: null | AsyncGenerator.WFn<C, I, Y, TN, O>
): AsyncGenerator.Fn<C, I, Y, TN, O> {
    if (wrapper) {
        const stackLabel = Object.freeze({ name: wrapper.name, in: 'wrapper' });
        return (context, input) => wrapper(Object.assign({}, context, { stack: Object.freeze([...context.stack, stackLabel]) }), input, func);
    }
    const implementationLabel = Object.freeze({ name: 'func', in: 'implementation' });
    return (context, input) => func(Object.assign({}, context, { stack: Object.freeze([...context.stack, implementationLabel]) }), input);
}

export function asyncGenerator<
    //
    N extends string,
    I extends z.ZodType,
    Y extends z.ZodType,
    TN extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
>(_params: AsyncGenerator.Param<N, I, Y, TN, O, S, C>): AsyncGenerator.Build<N, I, Y, TN, O, S, C> {
    const params = Object.freeze(Object.assign(_params, { type: 'async function*' } as const));
    const func = [...(params.wrappers?.(params) ?? []), null].reduceRight(wrap, params.func);
    const stackLabel = Object.freeze({ name: params._name, in: 'async function*' });
    const f: AsyncGenerator.Fn<C, I['_input'], Y['_output'], TN['_input'], O['_output']> = (context, input) =>
        func(Object.assign({}, context, { params }, { stack: Object.freeze([...context.stack, stackLabel]) }), input);
    Object.defineProperty(f, 'name', { value: params._name, writable: false });
    return Object.assign(f, params);
}
