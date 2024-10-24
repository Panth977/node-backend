import { z } from 'zod';
import { BuildContext, Context, DefaultBuildContext } from './context';
import { unimplemented, wrap, BuildContextWithParamsBuilder } from './_helper';

export namespace SyncGenerator {
    export type Return<T, N, R> = Generator<T, R, N>;
    export type Fn<C, I, Y, N, O> = (context: C, input: I) => Return<Y, N, O>;
    export type WFn<C, I, Y, N, O> = (context: C, input: I, func: Fn<C, I, Y, N, O>) => Return<Y, N, O>;

    export type WrapperBuild<
        //
        I extends z.ZodType = z.ZodType,
        Y extends z.ZodType = z.ZodType,
        N extends z.ZodType = z.ZodType,
        O extends z.ZodType = z.ZodType,
        L = unknown,
        C extends Context = Context,
    > = WFn<C & { params: Params<I, Y, N, O, L, C> }, I['_output'], Y['_input'], N['_output'], O['_input']>;

    export type _Params<
        //
        I extends z.ZodType,
        Y extends z.ZodType,
        N extends z.ZodType,
        O extends z.ZodType,
        L,
        C extends Context,
        W extends [] | [WrapperBuild<I, Y, N, O, L, C>, ...WrapperBuild<I, Y, N, O, L, C>[]],
    > = {
        namespace?: string;
        name?: string;
        _input: I;
        _yield: Y;
        _next: N;
        _output: O;
        _local?: L;
        buildContext?: BuildContext<C>;
        wrappers?: (params: Params<I, Y, N, O, L, C>) => W;
        func?: Fn<C & { params: Params<I, Y, N, O, L, C> }, I['_output'], Y['_input'], N['_output'], O['_input']>;
    };

    export type Params<
        //
        I extends z.ZodType = z.ZodType,
        Y extends z.ZodType = z.ZodType,
        N extends z.ZodType = z.ZodType,
        O extends z.ZodType = z.ZodType,
        L = unknown,
        C extends Context = Context,
    > = {
        getNamespace(): string;
        setNamespace(namespace: string): void;
        getName(): string;
        setName(name: string): void;
        getRef(): string;
        _input: I;
        _yield: Y;
        _next: N;
        _output: O;
        _local: undefined extends L ? undefined : L;
        type: 'function*';
        buildContext: BuildContext<C extends unknown ? Context : C>;
    };
    export type Build<
        //
        I extends z.ZodType = z.ZodType,
        Y extends z.ZodType = z.ZodType,
        N extends z.ZodType = z.ZodType,
        O extends z.ZodType = z.ZodType,
        L = unknown,
        C extends Context = Context,
        W extends [] | [WrapperBuild<I, Y, N, O, L, C>, ...WrapperBuild<I, Y, N, O, L, C>[]] = [],
    > = Params<I, Y, N, O, L, C> & Fn<Context | null, I['_input'], Y['_output'], N['_input'], O['_output']> & { wrappers: W };
}

export function syncGenerator<
    //
    I extends z.ZodType,
    Y extends z.ZodType,
    N extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
    W extends [] | [SyncGenerator.WrapperBuild<I, Y, N, O, L, C>, ...SyncGenerator.WrapperBuild<I, Y, N, O, L, C>[]],
>(_params: SyncGenerator._Params<I, Y, N, O, L, C, W>): SyncGenerator.Build<I, Y, N, O, L, C, W> {
    const params: SyncGenerator.Params<I, Y, N, O, L, C> = {
        getNamespace() {
            return `${_params.namespace}`;
        },
        setNamespace(namespace) {
            _params.namespace = namespace;
        },
        getName() {
            return `${_params.name}`;
        },
        setName(name) {
            _params.name = name;
        },
        getRef() {
            return `${_params.namespace}['${_params.name}']`;
        },
        _input: _params._input,
        _output: _params._output,
        type: 'function*',
        _next: _params._next,
        _yield: _params._yield,
        _local: _params._local as never,
        buildContext: (_params.buildContext ?? DefaultBuildContext) as never,
    };
    const wrappers = _params.wrappers?.(params) ?? ([] as W);
    const build: SyncGenerator.Fn<Context | null, I['_input'], Y['_output'], N['_input'], O['_output']> = (context, input) =>
        [...wrappers, null].reduceRight(wrap, _params.func ?? unimplemented)(
            BuildContextWithParamsBuilder(params, params.buildContext as BuildContext<C>, context),
            input
        );
    return Object.assign(build, params, { wrappers });
}
