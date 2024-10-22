import { AsyncFunction, Context } from '../functions';
import { CacheController, AbstractCacheClient } from './controller';
import { z } from 'zod';

type zRecord<O extends z.ZodType> = z.ZodRecord<z.ZodString, O>;
type TUpdate<C extends Context, I extends z.ZodType, O extends z.ZodType> = (
    context: C,
    input: I['_output'],
    output?: O['_input'] | null
) => Promise<void>;

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
        useUpdate?(update: TUpdate<C, I, O>): void;
        getCache(input: I['_output']): CacheController<A>;
    }
) {
    const Update: TUpdate<C, I, O> = async function (context, input, output = null) {
        const cache = behavior.getCache(input);
        if (output == null) {
            await cache.remove(context, [{}]);
        } else {
            await cache.write(context, { data: [{ value: output }] });
        }
    };
    behavior.useUpdate?.(Update);
    const Wrapper: AsyncFunction.WrapperBuild<I, O, L, C> = async function (context, input, func) {
        const cache = behavior.getCache(input);
        let result = await cache.read(context, [{}]).then((x) => x[0]);
        if (!result) {
            const res_ = func(context, input);
            cache.write(context, { data: [{ value: res_ }] });
            result = await res_;
        }
        return result;
    };
    return Object.assign(Wrapper, { Update });
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
        useUpdate?(update: TUpdate<C, I, O>): void;
        getCache(input: I['_output']): CacheController<A>;
        getIds(input: I['_output']): string[];
        updateIds(input: I['_output'], info: { reqIds: string[]; ignoreIds: string[] }): I['_output'];
    }
) {
    function getIds(input: I['_output']) {
        const ids = behavior.getIds(input);
        return [...new Set(ids)];
    }
    const Update: TUpdate<C, I, O> = async function (context, input, output = null) {
        const cache = behavior.getCache(input);
        const ids = getIds(input);
        if (output == null) {
            await cache.remove(
                context,
                ids.map((x) => ({ key: x }))
            );
        } else {
            await cache.write(context, { data: ids.map((x) => ({ key: x, value: output[x] })) });
        }
    };
    behavior.useUpdate?.(Update);
    const Wrapper: AsyncFunction.WrapperBuild<I, zRecord<O>, L, C> = async function (context, input, func) {
        const cache = behavior.getCache(input);
        const ids = getIds(input);
        const result = await cache
            .read(
                context,
                ids.map((x) => ({ key: x }))
            )
            .then((res) => bundleCached(ids, res));
        const info = (function () {
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
            cache.write(context, { data: info.reqIds.map((x) => ({ key: x, value: res_.then((r) => r[x]) })) });
            Object.assign(result, await res_);
        }
        return result;
    };
    return Object.assign(Wrapper, { Update });
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
        useUpdate?(update: TUpdate<C, I, O>): void;
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
    const Update: TUpdate<C, I, O> = async function (context, input, output = null) {
        const cache = behavior.getCache(input);
        const fields = getIds(input);
        if (output == null) {
            if (fields === '*') {
                await cache.remove(context, [{}]);
            } else {
                await cache.remove(context, [{ fields: [...fields, '$'] }]);
            }
        } else {
            if (fields === '*') {
                await cache.write(context, { data: [{ hash: { ...output, $: '*' } }] });
            } else {
                await cache.write(context, { data: [{ hash: Object.fromEntries(fields.map((x) => [x, output[x]])) }] });
            }
        }
    };
    behavior.useUpdate?.(Update);
    const Wrapper: AsyncFunction.WrapperBuild<I, zRecord<O>, L, C> = async function (context, input, func) {
        const cache = behavior.getCache(input);
        const fields = getIds(input);
        if (Array.isArray(fields) && fields.includes('$')) throw new Error('id = [$] is reserved, use some other key!');
        const result = await cache.read(context, [{ fields: fields }]).then((x) => (x[0] ?? {}) as Record<string, unknown>);
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
            if (info.reqIds === '*') {
                res_.then((res) => cache.write(context, { data: [{ hash: { ...res, $: '*' } }] }));
            } else {
                cache.write(context, { data: [{ hash: Object.fromEntries(info.reqIds.map((x) => [x, res_.then((r) => r[x])])) }] });
            }
            Object.assign(result, await res_);
        }
        return result;
    };
    return Object.assign(Wrapper, { Update });
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
        useUpdate?(update: TUpdate<C, I, O>): void;
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
    const Update: TUpdate<C, I, O> = async function (context, input, output = null) {
        const cache = behavior.getCache(input);
        const locs = getIds(input);
        if (output == null) {
            cache.remove(context, [
                //
                ...locs.filter((x) => x.subIds === '*').map((x) => ({ key: x.id, fields: '*' }) as const),
                ...locs.filter((x) => x.subIds !== '*').map((x) => ({ key: x.id, fields: x.subIds }) as const),
            ]);
        } else {
            await cache.write(context, {
                data: [
                    ...locs
                        .filter((x) => x.subIds !== '*')
                        .map((x) => ({ key: x.id, hash: Object.fromEntries((x.subIds as string[]).map((id) => [x, output[x.id][id]])) })),
                    ...locs.filter((x) => x.subIds === '*').map((x) => ({ key: x.id, hash: { ...output[x.id], $: '*' } })),
                ],
            });
        }
    };
    behavior.useUpdate?.(Update);
    const Wrapper: AsyncFunction.WrapperBuild<I, zRecord<zRecord<O>>, L, C> = async function (context, input, func) {
        const cache = behavior.getCache(input);
        const locs = getIds(input);
        const result = await cache
            .read(
                context,
                locs.map((x) => ({ key: x.id, fields: x.subIds }))
            )
            .then((res) =>
                bundleCached(
                    locs.map((x) => x.id),
                    res.map((x) => x ?? {}) as Record<string, unknown>[]
                )
            );
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
            cache.write(context, {
                data: info
                    .filter((x) => x.reqSubIds !== '*')
                    .map((x) => ({ key: x.id, hash: Object.fromEntries((x.reqSubIds as string[]).map((id) => [x, res_.then((r) => r[x.id][id])])) })),
            });
            res_.then((res) =>
                cache.write(context, { data: info.filter((x) => x.reqSubIds === '*').map((x) => ({ key: x.id, hash: { ...res[x.id], $: '*' } })) })
            );
            for (const x of info) {
                Object.assign(result[x.id], (await res_)[x.id]);
            }
        }
        return result;
    };
    return Object.assign(Wrapper, { Update });
}
