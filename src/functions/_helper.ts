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
        return (context, input) => wrapper(context, input, func);
    }
    return (context, input) => func(context, input);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function unimplemented<C extends Context, I, R>(context: C, input: I): R {
    throw new Error('Unimplemented');
}

export function getParams(params: unknown) {
    if (typeof params === 'object' && params && 'type' in params && params.type === 'function') return params as SyncFunction.Params;
    if (typeof params === 'object' && params && 'type' in params && params.type === 'async function') return params as AsyncFunction.Params;
    if (typeof params === 'object' && params && 'type' in params && params.type === 'async function*') return params as AsyncGenerator.Params;
    if (typeof params === 'object' && params && 'type' in params && params.type === 'function*') return params as SyncGenerator.Params;
    throw new Error('Unimplemented!');
}
export function getBuild(build: unknown) {
    if (typeof build === 'function' && 'type' in build && build.type === 'function') return build as SyncFunction.Build;
    if (typeof build === 'function' && 'type' in build && build.type === 'async function') return build as AsyncFunction.Build;
    if (typeof build === 'function' && 'type' in build && build.type === 'async function*') return build as AsyncGenerator.Build;
    if (typeof build === 'function' && 'type' in build && build.type === 'function*') return build as SyncGenerator.Build;
    throw new Error('Unimplemented!');
}
