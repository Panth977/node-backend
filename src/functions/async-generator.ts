import { z } from 'zod';
import { Context } from './context';
import { unimplemented, wrap } from './_helper';

export namespace AsyncGenerator {
    export const type = Symbol();
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
        L = unknown,
        C extends Context = Context,
    > = WFn<C & { params: Params<N, I, Y, TN, O, L, C> }, I['_output'], Y['_input'], TN['_output'], O['_input']>;

    export type _Params<
        //
        N extends string,
        I extends z.ZodType,
        Y extends z.ZodType,
        TN extends z.ZodType,
        O extends z.ZodType,
        L = unknown,
        C extends Context = Context,
    > = {
        _input: I;
        _yield: Y;
        _next: TN;
        _output: O;
        _local?: L;
        wrappers?: (params: Params<N, I, Y, TN, O, L, C>) => WrapperBuild<N, I, Y, TN, O, L, C>[];
        func?: Fn<C & { params: Params<N, I, Y, TN, O, L, C> }, I['_output'], Y['_input'], TN['_output'], O['_input']>;
    };

    export type Params<
        //
        N extends string = string,
        I extends z.ZodType = z.ZodType,
        Y extends z.ZodType = z.ZodType,
        TN extends z.ZodType = z.ZodType,
        O extends z.ZodType = z.ZodType,
        L = unknown,
        C extends Context = Context,
    > = {
        _name: N;
        _input: I;
        _yield: Y;
        _next: TN;
        _output: O;
        _local: undefined extends L ? undefined : L;
        type: 'async function*';
        [type]: { N: N; I: I; Y: Y; TN: TN; O: O; L: L; C: C };
    };
    export type Build<
        //
        N extends string = string,
        I extends z.ZodType = z.ZodType,
        Y extends z.ZodType = z.ZodType,
        TN extends z.ZodType = z.ZodType,
        O extends z.ZodType = z.ZodType,
        L = unknown,
        C extends Context = Context,
    > = Params<N, I, Y, TN, O, L, C> & Fn<C, I['_input'], Y['_output'], TN['_input'], O['_output']>;
}

export function asyncGenerator<
    //
    N extends string,
    I extends z.ZodType,
    Y extends z.ZodType,
    TN extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(_name: N, _params: AsyncGenerator._Params<N, I, Y, TN, O, L, C>): AsyncGenerator.Build<N, I, Y, TN, O, L, C> {
    const params: AsyncGenerator.Params<N, I, Y, TN, O, L, C> = {
        _input: _params._input,
        _name: _name,
        _output: _params._output,
        type: 'async function*',
        _next: _params._next,
        _yield: _params._yield,
        _local: _params._local as never,
        [AsyncGenerator.type]: undefined as never,
    };
    const func = [...(_params.wrappers?.(params) ?? []), null].reduceRight(wrap, _params.func ?? unimplemented);
    const stackLabel = Object.freeze({ name: params._name, in: 'async function*' });
    const f: AsyncGenerator.Fn<C, I['_input'], Y['_output'], TN['_input'], O['_output']> = (context, input) =>
        func(Object.assign({}, context, { params }, { stack: Object.freeze([...context.stack, stackLabel]) }), input);
    Object.defineProperty(f, 'name', { value: params._name, writable: false });
    return Object.assign(f, params);
}
