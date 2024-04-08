import { AsyncFunction } from './async';
import { SyncFunction } from './sync';
import { SyncGenerator } from './sync-generator';
import { AsyncGenerator } from './async-generator';

export function getParams(params: unknown) {
    if (typeof params !== 'object' || !params || 'type' in params === false) throw new Error('Type not found!');
    if (params.type === 'function') {
        return params as SyncFunction.Type & SyncFunction.Param;
    }
    if (params.type === 'async function') {
        return params as AsyncFunction.Type & AsyncFunction.Param;
    }
    if (params.type === 'async function*') {
        return params as AsyncGenerator.Type & AsyncGenerator.Param;
    }
    if (params.type === 'function*') {
        return params as SyncGenerator.Type & SyncGenerator.Param;
    }
    throw new Error('Unimplemented!');
}
export function getBuild(build: unknown) {
    if (typeof build !== 'function' || 'type' in build === false) throw new Error('Type not found!');
    if (build.type === 'function') {
        return build as SyncFunction.Build;
    }
    if (build.type === 'async function') {
        return build as AsyncFunction.Build;
    }
    if (build.type === 'async function*') {
        return build as AsyncGenerator.Build;
    }
    if (build.type === 'function*') {
        return build as SyncGenerator.Build;
    }
    throw new Error('Unimplemented!');
}
