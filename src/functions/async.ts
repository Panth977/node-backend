import { z } from 'zod';
import { Context } from './context';
import { unimplemented, wrap } from './_helper';

export namespace AsyncFunction {
    export const type = Symbol();
    export type Return<T> = Promise<T>;
    export type Fn<C, I, O> = (context: C, input: I) => Return<O>;
    export type WFn<C, I, O> = (context: C, input: I, func: Fn<C, I, O>) => Return<O>;

    export type WrapperBuild<
        //
        N extends string = string,
        I extends z.ZodType = z.ZodType,
        O extends z.ZodType = z.ZodType,
        L = unknown,
        C extends Context = Context,
    > = WFn<C & { params: Params<N, I, O, L, C> }, I['_output'], O['_input']>;
    export type _Params<
        //
        N extends string,
        I extends z.ZodType,
        O extends z.ZodType,
        L,
        C extends Context,
    > = {
        _input: I;
        _output: O;
        _local?: L;
        wrappers?: (params: Params<N, I, O, L, C>) => WrapperBuild<N, I, O, L, C>[];
        func?: Fn<C & { params: Params<N, I, O, L, C> }, I['_output'], O['_input']>;
    };
    export type Params<
        //
        N extends string = string,
        I extends z.ZodType = z.ZodType,
        O extends z.ZodType = z.ZodType,
        L = unknown,
        C extends Context = Context,
    > = {
        _name: N;
        _input: I;
        _output: O;
        _local: undefined extends L ? undefined : L;
        type: 'async function';
        [type]: { N: N; I: I; O: O; L: L; C: C };
    };
    export type Build<
        //
        N extends string = string,
        I extends z.ZodType = z.ZodType,
        O extends z.ZodType = z.ZodType,
        L = unknown,
        C extends Context = Context,
    > = Params<N, I, O, L, C> & Fn<C, I['_input'], O['_output']>;
}

export function asyncFunction<
    //
    N extends string,
    I extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(_name: N, _params: AsyncFunction._Params<N, I, O, L, C>): AsyncFunction.Build<N, I, O, L, C> {
    const params: AsyncFunction.Params<N, I, O, L, C> = {
        _input: _params._input,
        _name: _name,
        _output: _params._output,
        type: 'async function',
        _local: _params._local as never,
        [AsyncFunction.type]: undefined as never,
    };
    const func = [...(_params.wrappers?.(params) ?? []), null].reduceRight(wrap, _params.func ?? unimplemented);
    const stackLabel = Object.freeze({ name: params._name, in: 'async function' });
    const f: AsyncFunction.Fn<C, I['_input'], O['_output']> = (context, input) =>
        func(Object.assign({}, context, { params }, { stack: Object.freeze([...context.stack, stackLabel]) }), input);
    Object.defineProperty(f, 'name', { value: params._name, writable: false });
    return Object.assign(f, params);
}
