import { z } from 'zod';
import { Context } from './context';
const fNames = new Set(['']);

type Return<T, TN, R> = Generator<T, R, TN>;
type Fn<C, I, Y, TN, O> = (context: C, input: I) => Return<Y, TN, O>;
type WFn<C, I, Y, TN, O> = (context: C, input: I, func: Fn<C, I, Y, TN, O>) => Return<Y, TN, O>;

export type SyncGeneratorWrapperBuild<
    //
    N extends string,
    I extends z.ZodType,
    Y extends z.ZodType,
    TN extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
> = WFn<C & { params: SyncGeneratorParam<N, I, Y, TN, O, S, C> }, I['_output'], Y['_input'], TN['_output'], O['_input']>;

export type SyncGeneratorParam<
    //
    N extends string,
    I extends z.ZodType,
    Y extends z.ZodType,
    TN extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
> = {
    _name: N;
    _input: I;
    _yield: Y;
    _next: TN;
    _output: O;
    _static: S;
    wrappers?: SyncGeneratorWrapperBuild<N, I, Y, TN, O, S, C>[];
    func: Fn<C & { params: SyncGeneratorParam<N, I, Y, TN, O, S, C> }, I['_output'], Y['_input'], TN['_output'], O['_input']>;
};
export type SyncGeneratorBuild<
    //
    N extends string,
    I extends z.ZodType,
    Y extends z.ZodType,
    TN extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
> = { type: 'function*' } & SyncGeneratorParam<N, I, Y, TN, O, S, C> & Fn<C, I['_input'], Y['_output'], TN['_input'], O['_output']>;

function wrap<C extends Context, I, Y, TN, O>(func: Fn<C, I, Y, TN, O>, wrapper: null | WFn<C, I, Y, TN, O>): Fn<C, I, Y, TN, O> {
    if (wrapper) {
        const stackLabel = Object.freeze({ name: wrapper.name, in: 'wrapper' });
        return (context, input) => wrapper(Object.assign({}, context, { stack: Object.freeze([...context.stack, stackLabel]) }), input, func);
    }
    const implementationLabel = Object.freeze({ name: 'func', in: 'implementation' });
    return (context, input) => func(Object.assign({}, context, { stack: Object.freeze([...context.stack, implementationLabel]) }), input);
}

export function syncGenerator<
    //
    N extends string,
    I extends z.ZodType,
    Y extends z.ZodType,
    TN extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
>(params: SyncGeneratorParam<N, I, Y, TN, O, S, C>): SyncGeneratorBuild<N, I, Y, TN, O, S, C> {
    if (fNames.has(params._name)) throw new Error(`[${JSON.stringify(params._name)}] is not available!`);
    params = Object.freeze(params);
    const func = [...(params.wrappers ?? []), null].reduceRight(wrap, params.func);
    fNames.add(params._name);
    const stackLabel = Object.freeze({ name: params._name, in: 'function*' });
    const f: Fn<C, I['_input'], Y['_output'], TN['_input'], O['_output']> = (context, input) =>
        func(Object.assign({}, context, { params }, { stack: Object.freeze([...context.stack, stackLabel]) }), input);
    Object.defineProperty(f, 'name', { value: params._name, writable: false });
    return Object.assign(f, params, { type: 'function*' } as const);
}
