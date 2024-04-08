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
    if (typeof params === 'object' && params && 'type' in params && params.type === 'function') return params as SyncFunction.Params;
    if (typeof params === 'object' && params && 'type' in params && params.type === 'async function') return params as AsyncFunction.Params;
    if (typeof params === 'object' && params && 'type' in params && params.type === 'async function*') return params as AsyncGenerator.Params;
    if (typeof params === 'object' && params && 'type' in params && params.type === 'function*') return params as SyncGenerator.Params;
    throw new Error('Unimplemented!');
}
