import { z } from 'zod';
import { BuildContext, BuildContextWithParamsBuilder, Context, DefaultBuildContext } from './context';
import { unimplemented, wrap } from './_helper';

export namespace SyncGenerator {
    export type Return<T, TN, R> = Generator<T, R, TN>;
    export type Fn<C, I, Y, TN, O> = (context: C, input: I) => Return<Y, TN, O>;
    export type WFn<C, I, Y, TN, O> = (context: C, input: I, func: Fn<C, I, Y, TN, O>) => Return<Y, TN, O>;

    export type WrapperBuild<
        //
        I extends z.ZodType = z.ZodType,
        Y extends z.ZodType = z.ZodType,
        TN extends z.ZodType = z.ZodType,
        O extends z.ZodType = z.ZodType,
        L = unknown,
        C extends Context = Context,
    > = WFn<C & { params: Params<I, Y, TN, O, L, C> }, I['_output'], Y['_input'], TN['_output'], O['_input']>;

    export type _Params<
        //
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
        buildContext?: BuildContext<C>;
        wrappers?: (params: Params<I, Y, TN, O, L, C>) => WrapperBuild<I, Y, TN, O, L, C>[];
        func?: Fn<C & { params: Params<I, Y, TN, O, L, C> }, I['_output'], Y['_input'], TN['_output'], O['_input']>;
    };

    export type Params<
        //
        I extends z.ZodType = z.ZodType,
        Y extends z.ZodType = z.ZodType,
        TN extends z.ZodType = z.ZodType,
        O extends z.ZodType = z.ZodType,
        L = unknown,
        C extends Context = Context,
    > = {
        _input: I;
        _yield: Y;
        _next: TN;
        _output: O;
        _local: undefined extends L ? undefined : L;
        wrappers: WrapperBuild<I, Y, TN, O, L, C>[];
        type: 'function*';
        buildContext: BuildContext<C extends unknown ? Context : C>;
    };
    export type Build<
        //
        I extends z.ZodType = z.ZodType,
        Y extends z.ZodType = z.ZodType,
        TN extends z.ZodType = z.ZodType,
        O extends z.ZodType = z.ZodType,
        L = unknown,
        C extends Context = Context,
    > = Params<I, Y, TN, O, L, C> & Fn<Context | null, I['_input'], Y['_output'], TN['_input'], O['_output']>;
}

export function syncGenerator<
    //
    I extends z.ZodType,
    Y extends z.ZodType,
    TN extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(_params: SyncGenerator._Params<I, Y, TN, O, L, C>): SyncGenerator.Build<I, Y, TN, O, L, C> {
    const params: SyncGenerator.Params<I, Y, TN, O, L, C> = {
        _input: _params._input,
        _output: _params._output,
        type: 'function*',
        _next: _params._next,
        _yield: _params._yield,
        _local: _params._local as never,
        wrappers: null as never,
        buildContext: (_params.buildContext ?? DefaultBuildContext) as never,
    };
    params.wrappers = _params.wrappers?.(params) ?? [];
    const func = [...params.wrappers, null].reduceRight(wrap, _params.func ?? unimplemented);
    const buildContext = BuildContextWithParamsBuilder(params, params.buildContext as BuildContext<C>);
    const f: SyncGenerator.Fn<Context | null, I['_input'], Y['_output'], TN['_input'], O['_output']> = (context, input) =>
        func(buildContext(context), input);
    return Object.assign(f, params);
}
