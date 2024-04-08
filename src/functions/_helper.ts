import { Context } from './context';
import { AsyncFunction } from './async';
import { SyncFunction } from './sync';
import { SyncGenerator } from './sync-generator';
import { AsyncGenerator } from './async-generator';

export function wrap<C extends Context, I, R>(
    func: (context: C, input: I) => R,
    wrapper: null | ((context: C, input: I, func: (context: C, input: I) => R) => R)
): (context: C, input: I) => R {
    if (wrapper) {
        const stackLabel = Object.freeze({ name: wrapper.name, in: 'wrapper' });
        return (context, input) => wrapper(Object.assign({}, context, { stack: Object.freeze([...context.stack, stackLabel]) }), input, func);
    }
    const implementationLabel = Object.freeze({ name: 'func', in: 'implementation' });
    return (context, input) => func(Object.assign({}, context, { stack: Object.freeze([...context.stack, implementationLabel]) }), input);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function unimplemented<C extends Context, I, R>(context: C, input: I): R {
    throw new Error('Unimplemented');
}

export function getParams(params: unknown) {
    if (typeof params !== 'object' || !params || 'type' in params === false) throw new Error('Type not found!');
    if (params.type === 'function') return params as SyncFunction.Params;
    if (params.type === 'async function') return params as AsyncFunction.Params;
    if (params.type === 'async function*') return params as AsyncGenerator.Params;
    if (params.type === 'function*') return params as SyncGenerator.Params;
    throw new Error('Unimplemented!');
}
export function getBuild(build: unknown) {
    if (typeof build !== 'function' || 'type' in build === false) throw new Error('Type not found!');
    if (build.type === 'function') return build as SyncFunction.Build;
    if (build.type === 'async function') return build as AsyncFunction.Build;
    if (build.type === 'async function*') return build as AsyncGenerator.Build;
    if (build.type === 'function*') return build as SyncGenerator.Build;
    throw new Error('Unimplemented!');
}
