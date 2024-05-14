import { z } from 'zod';
import { BuildContext, BuildContextWithParamsBuilder, Context, DefaultBuildContext } from './context';
import { unimplemented, wrap } from './_helper';

export namespace AsyncFunction {
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
        namespace?: string;
        name?: string;
        _input: I;
        _output: O;
        _local?: L;
        wrappers?: (params: Params<I, O, L, C>) => WrapperBuild<I, O, L, C>[];
        func?: Fn<C & { params: Params<I, O, L, C> }, I['_output'], O['_input']>;
        buildContext?: BuildContext<C>;
    };
    export type Params<
        //
        I extends z.ZodType = z.ZodType,
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
        _output: O;
        _local: undefined extends L ? undefined : L;
        wrappers: WrapperBuild<I, O, L, C>[];
        type: 'async function';
        buildContext: BuildContext<C extends unknown ? Context : C>;
    };
    export type Build<
        //
        I extends z.ZodType = z.ZodType,
        O extends z.ZodType = z.ZodType,
        L = unknown,
        C extends Context = Context,
    > = Params<I, O, L, C> & Fn<Context | null, I['_input'], O['_output']>;
}

export function asyncFunction<
    //
    I extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
>(_params: AsyncFunction._Params<I, O, L, C>): AsyncFunction.Build<I, O, L, C> {
    const params: AsyncFunction.Params<I, O, L, C> = {
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
        type: 'async function',
        wrappers: null as never,
        _local: _params._local as never,
        buildContext: (_params.buildContext ?? DefaultBuildContext) as never,
    };
    params.wrappers = _params.wrappers?.(params) ?? [];
    const func = [...params.wrappers, null].reduceRight(wrap, _params.func ?? unimplemented);
    const buildContext = BuildContextWithParamsBuilder(params, params.buildContext as BuildContext<C>);
    const f: AsyncFunction.Fn<Context | null, I['_input'], O['_output']> = (context, input) => func(buildContext(context), input);
    return Object.assign(f, params);
}
