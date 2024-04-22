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
        I extends z.ZodType = z.ZodType,
        O extends z.ZodType = z.ZodType,
        L = unknown,
        C extends Context = Context,
    > = WFn<C & { params: Params<I, O, L, C> }, I['_output'], O['_input']>;
    export type _Params<
        //
        I extends z.ZodType,
        O extends z.ZodType,
        L,
        C extends Context,
    > = {
        _input: I;
        _output: O;
        _local?: L;
        wrappers?: (params: Params<I, O, L, C>) => WrapperBuild<I, O, L, C>[];
        func?: Fn<C & { params: Params<I, O, L, C> }, I['_output'], O['_input']>;
    };
    export type Params<
        //
        I extends z.ZodType = z.ZodType,
        O extends z.ZodType = z.ZodType,
        L = unknown,
        C extends Context = Context,
    > = {
        _input: I;
        _output: O;
        _local: undefined extends L ? undefined : L;
        wrappers: WrapperBuild<I, O, L, C>[];
        type: 'async function';
        [type]: { I: I; O: O; L: L; C: C };
    };
    export type Build<
        //
        I extends z.ZodType = z.ZodType,
        O extends z.ZodType = z.ZodType,
        L = unknown,
        C extends Context = Context,
    > = Params<I, O, L, C> & Fn<C, I['_input'], O['_output']>;
}

export function asyncFunction<
    //
    I extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(_params: AsyncFunction._Params<I, O, L, C>): AsyncFunction.Build<I, O, L, C> {
    const params: AsyncFunction.Params<I, O, L, C> = {
        _input: _params._input,
        _output: _params._output,
        type: 'async function',
        wrappers: null as never,
        _local: _params._local as never,
        [AsyncFunction.type]: undefined as never,
    };
    params.wrappers = _params.wrappers?.(params) ?? [];
    const func = [...params.wrappers, null].reduceRight(wrap, _params.func ?? unimplemented);
    const f: AsyncFunction.Fn<C, I['_input'], O['_output']> = (context, input) => func(Object.assign({}, context, { params }), input);
    return Object.assign(f, params);
}
