import { AsyncFunction, Context } from '../functions';
import { CacheController, AbstractCacheClient } from './controller';
import { z } from 'zod';

type zRecord<O extends z.ZodType> = z.ZodRecord<z.ZodString, O>;
type zSyncOrAsyncOutput<O extends z.ZodType> = Promise<O['_input']> | O['_input'];
type Hooks<C extends Context, I extends z.ZodType, O extends z.ZodType> = (
    context: C,
    input: I['_output']
) => {
    get(): Promise<O['_input']>;
    set(output: O['_input'] | Promise<O['_input']>, ifExists?: boolean): Promise<void>;
    del(): Promise<void>;
};

function bundleCached<I extends string | number, V>(ids: I[], values: V[]): Record<I, V> {
    const res: Record<I, V> = {} as never;
    for (let i = 0; i < ids.length; i++) {
        if (values[i]) {
            res[ids[i]] = values[i];
        }
    }
    return res;
}

export function CacheObject<
    //
    I extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
    A extends AbstractCacheClient,
>(
    params: AsyncFunction.Params<I, O, L, C>,
    behavior: {
        useHooks?(hooks: Hooks<C, I, O>): void;
        getCache(input: I['_output']): CacheController<A>;
    }
) {
    const Hooks: Hooks<C, I, O> = function (context, input) {
        const cache = behavior.getCache(input);
        return {
            async get() {
                return await cache.read(context, [{}]).then((x) => x[0] as O['_input']);
            },
            async set(output, ifExists) {
                if (ifExists) {
                    const data = await this.get();
                    if (data != null) return;
                }
                await cache.write(context, { data: [{ value: output }] });
            },
            async del() {
                await cache.remove(context, [{}]);
            },
        };
    };
    behavior.useHooks?.(Hooks);
    const Wrapper: AsyncFunction.WrapperBuild<I, O, L, C> = async function (context, input, func) {
        const hooks = Hooks(context, input);
        let result = await hooks.get();
        if (!result) {
            const res_ = func(context, input);
            hooks.set(res_);
            result = await res_;
        }
        return result;
    };
    return Object.assign(Wrapper, { Hooks });
}

export function CacheMObject<
    //
    I extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
    A extends AbstractCacheClient,
>(
    params: AsyncFunction.Params<I, zRecord<O>, L, C>,
    behavior: {
        useHooks?(hooks: Hooks<C, I, zRecord<O>>): void;
        getCache(input: I['_output']): CacheController<A>;
        getIds(input: I['_output']): string[];
        updateIds(input: I['_output'], info: { reqIds: string[]; ignoreIds: string[] }): I['_output'];
    }
) {
    function getIds(input: I['_output']) {
        const ids = behavior.getIds(input);
        return [...new Set(ids)];
    }
    const Hooks: Hooks<C, I, zRecord<O>> = function (context, input) {
        const cache = behavior.getCache(input);
        const ids = getIds(input);
        return {
            async get() {
                const res = await cache.read(
                    context,
                    ids.map((x) => ({ key: x }))
                );
                return bundleCached(ids, res as O['_input']);
            },
            async set(output, ifExists) {
                let recordedOutput: Record<string, zSyncOrAsyncOutput<O>>;
                if (output instanceof Promise) {
                    const promise = output;
                    recordedOutput = Object.fromEntries(ids.map((x) => [x, promise.then((data) => data[x])]));
                } else {
                    recordedOutput = output;
                }
                if (ifExists) {
                    const data = await this.get();
                    for (const x of ids) {
                        if (data[x] == null) {
                            delete recordedOutput[x];
                        }
                    }
                }
                await cache.write(context, { data: Object.keys(recordedOutput).map((x) => ({ key: x, value: recordedOutput[x] })) });
            },
            async del() {
                await cache.remove(
                    context,
                    ids.map((x) => ({ key: x }))
                );
            },
        };
    };
    behavior.useHooks?.(Hooks);
    const Wrapper: AsyncFunction.WrapperBuild<I, zRecord<O>, L, C> = async function (context, input, func) {
        const hooks = Hooks(context, input);
        const result = await hooks.get();
        const info = (function () {
            const ids = getIds(input);
            const found = new Set(Object.keys(result).filter((x) => (result[x] ?? null) !== null));
            const ret = { reqIds: ids.filter((id) => !found.has(id)), ignoreIds: [...found] };
            if (!ret.reqIds.length) return null;
            for (const id of ids) {
                if (!found.has(id)) {
                    delete result[id];
                }
            }
            return ret;
        })();
        if (info) {
            const res_ = func(context, behavior.updateIds(input, info));
            hooks.set(res_);
            Object.assign(result, await res_);
        }
        return result;
    };
    return Object.assign(Wrapper, { Hooks });
}

export function CacheCollection<
    //
    I extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
    A extends AbstractCacheClient,
>(
    params: AsyncFunction.Params<I, zRecord<O>, L, C>,
    behavior: {
        useHooks?(hooks: Hooks<C, I, zRecord<O>>): void;
        getCache(input: I['_output']): CacheController<A>;
        getIds(input: I['_output']): string[] | '*';
        updateIds(input: I['_output'], info: { reqIds: string[] | '*'; ignoreIds: string[] }): I['_output'];
    }
) {
    function getIds(input: I['_output']) {
        const ids = behavior.getIds(input);
        if (ids === '*') return ids;
        return [...new Set(ids)];
    }
    const Hooks: Hooks<C, I, zRecord<O>> = function (context, input) {
        const cache = behavior.getCache(input);
        const fields = getIds(input);
        return {
            async get() {
                const x = await cache.read(context, [{ fields: fields }]);
                return (x[0] ?? {}) as Record<string, unknown>;
            },
            async set(output, ifExists) {
                if (fields === '*') {
                    if (ifExists) {
                        const data = await this.get();
                        if (data.$ !== '*') {
                            await cache.remove(context, [{ fields: '*' }]);
                            return;
                        }
                    }
                    await cache.remove(context, [{ fields: '*' }]);
                    const awaitedOutput = await output;
                    await cache.write(context, { data: [{ hash: { ...awaitedOutput, $: '*' } }] });
                } else {
                    let recordedOutput: Record<string, zSyncOrAsyncOutput<O>>;
                    if (output instanceof Promise) {
                        const promise = output;
                        recordedOutput = Object.fromEntries(fields.map((x) => [x, promise.then((data) => data[x])]));
                    } else {
                        recordedOutput = { ...output };
                    }
                    if (ifExists) {
                        const data = await this.get();
                        for (const x of fields) {
                            if (data[x] == null) {
                                delete recordedOutput[x];
                            }
                        }
                    }
                    await cache.write(context, { data: [{ hash: recordedOutput }] });
                }
            },
            async del() {
                if (fields === '*') {
                    await cache.remove(context, [{ fields: '*' }]);
                } else {
                    await cache.remove(context, [{ fields: [...fields, '$'] }]);
                }
            },
        };
    };
    behavior.useHooks?.(Hooks);
    const Wrapper: AsyncFunction.WrapperBuild<I, zRecord<O>, L, C> = async function (context, input, func) {
        const hooks = Hooks(context, input);
        const fields = getIds(input);
        if (Array.isArray(fields) && fields.includes('$')) throw new Error('id = [$] is reserved, use some other key!');
        const result = await hooks.get();
        const info = (function () {
            const found = new Set(Object.keys(result).filter((id) => (result[id] ?? null) !== null));
            if (fields === '*') {
                if (result.$ === '*') {
                    delete result.$;
                    return null;
                }
                return { reqIds: '*' as const, ignoreIds: [...found] };
            }
            for (const id of fields) {
                if (!found.has(id)) {
                    delete result[id];
                }
            }
            const ret = { reqIds: fields.filter((id) => !found.has(id)), ignoreIds: [...found] };
            if (!ret.reqIds.length) return null;
            return ret;
        })();
        if (info) {
            const res_ = func(context, behavior.updateIds(input, info));
            hooks.set(res_);
            Object.assign(result, await res_);
        }
        return result;
    };
    return Object.assign(Wrapper, { Hooks });
}

export function CacheMCollection<
    //
    I extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
    A extends AbstractCacheClient,
>(
    params: AsyncFunction.Params<I, zRecord<zRecord<O>>, L, C>,
    behavior: {
        useHooks?(hooks: Hooks<C, I, zRecord<zRecord<O>>>): void;
        getCache(input: I['_output']): CacheController<A>;
        getIds(input: I['_output']): { id: string; subIds: string[] | '*' }[];
        updateIds(input: I['_output'], info: { id: string; reqSubIds: string[] | '*'; ignoreSubIds: string[] }[]): I['_output'];
    }
) {
    function getIds(input: I['_output']) {
        const locs = behavior.getIds(input);
        const updatedLocs: Record<string, '*' | Set<string>> = {};
        for (const x of locs) {
            if (x.id in updatedLocs === false) updatedLocs[x.id] = new Set();
            const subIds = updatedLocs[x.id];
            if (x.subIds === '*' && subIds !== '*') {
                updatedLocs[x.id] = '*';
            } else if (x.subIds !== '*' && subIds !== '*') {
                for (const id of x.subIds) {
                    subIds.add(id);
                }
            }
        }
        return Object.keys(updatedLocs).map((id) => {
            const subIds = updatedLocs[id];
            if (subIds === '*') return { id, subIds };
            return { id, subIds: [...subIds] };
        });
    }
    const Hooks: Hooks<C, I, zRecord<zRecord<O>>> = function (context, input) {
        const cache = behavior.getCache(input);
        const locs = getIds(input);
        return {
            async get() {
                const res = await cache.read(
                    context,
                    locs.map((x) => ({ key: x.id, fields: x.subIds }))
                );
                return bundleCached(
                    locs.map((x) => x.id),
                    res.map((x) => x ?? {}) as Record<string, unknown>[]
                );
            },
            async set(output, ifExists) {
                const fullOutput: Record<string, zSyncOrAsyncOutput<zRecord<O>>> = {};
                const partialOutput: Record<string, Record<string, zSyncOrAsyncOutput<O>>> = {};
                if (output instanceof Promise) {
                    for (const loc of locs) {
                        if (loc.subIds === '*') {
                            fullOutput[loc.id] = output.then((data) => data[loc.id]);
                        } else {
                            partialOutput[loc.id] = Object.fromEntries(loc.subIds.map((x) => [x, output.then((data) => data[loc.id][x])]));
                        }
                    }
                } else {
                    for (const loc of locs) {
                        if (loc.subIds === '*') {
                            fullOutput[loc.id] = output[loc.id];
                        } else {
                            partialOutput[loc.id] = Object.fromEntries(loc.subIds.map((x) => [x, output[loc.id][x]]));
                        }
                    }
                }
                if (ifExists) {
                    const data = await this.get();
                    const needToDel: string[] = [];
                    for (const loc of locs) {
                        if (loc.subIds === '*') {
                            if (data[loc.id]?.$ !== '*') {
                                needToDel.push(loc.id);
                                delete fullOutput[loc.id];
                            }
                        } else {
                            for (const x of loc.subIds) {
                                if ((data[loc.id]?.[x] ?? null) == null) {
                                    delete partialOutput[loc.id][x];
                                }
                            }
                        }
                    }
                    await cache.remove(
                        context,
                        needToDel.map((x) => ({ key: x, fields: '*' }))
                    );
                }
                await Promise.all([
                    cache.write(context, {
                        data: locs.filter((x) => x.subIds !== '*').map((x) => ({ key: x.id, hash: partialOutput[x.id] })),
                    }),
                    Promise.all(Object.keys(fullOutput).map(async (x) => [x, await fullOutput[x]] as const))
                        .then((x) => Object.fromEntries(x))
                        .then((res) =>
                            cache.write(context, {
                                data: Object.keys(res).map((x) => ({ key: x, hash: { ...res[x], $: '*' } })),
                            })
                        ),
                ]);
            },
            async del() {
                await cache.remove(context, [
                    //
                    ...locs.filter((x) => x.subIds === '*').map((x) => ({ key: x.id, fields: '*' }) as const),
                    ...locs.filter((x) => x.subIds !== '*').map((x) => ({ key: x.id, fields: x.subIds }) as const),
                ]);
            },
        };
    };
    behavior.useHooks?.(Hooks);
    const Wrapper: AsyncFunction.WrapperBuild<I, zRecord<zRecord<O>>, L, C> = async function (context, input, func) {
        const hooks = Hooks(context, input);
        const locs = getIds(input);
        const result = await hooks.get();
        const info = (function () {
            const info = [];
            for (const x of locs) {
                const res = result[x.id];
                const found = new Set(Object.keys(res).filter((id) => (result[id] ?? null) !== null));
                const fields = x.subIds;
                if (fields === '*') {
                    if (res.$ === '*') {
                        delete res.$;
                        continue;
                    }
                    info.push({ id: x.id, reqSubIds: '*' as const, ignoreSubIds: [...found] });
                    continue;
                }
                for (const subId of fields) {
                    if (!found.has(subId)) {
                        delete result[x.id][subId];
                    }
                }
                const ret = { id: x.id, reqSubIds: fields.filter((id) => !found.has(id)), ignoreSubIds: [...found] };
                if (!ret.reqSubIds.length) continue;
                info.push(ret);
            }
            return info;
        })();
        if (info.length) {
            const res_ = func(context, behavior.updateIds(input, info));
            hooks.set(res_);
            for (const x of info) {
                Object.assign(result[x.id], (await res_)[x.id]);
            }
        }
        return result;
    };
    return Object.assign(Wrapper, { Hooks });
}
