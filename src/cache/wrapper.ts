import { AsyncFunction, Context } from '../functions';
import { CacheController, AbstractCacheClient } from './controller';
import { z } from 'zod';

type zRecord<O extends z.ZodType> = z.ZodRecord<z.ZodString, O>;

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
        invalidation?(invalidate: (context: C, input: I['_output']) => Promise<void>): void;
        getCache(input: I['_output']): CacheController<A>;
    }
): AsyncFunction.WrapperBuild<I, O, L, C> {
    behavior.invalidation?.(async function invalidate(context, input) {
        const cache = behavior.getCache(input);
        await cache.remove(context, [{}]);
    });
    return async function CacheObject(context, input, func) {
        const cache = behavior.getCache(input);
        let result = await cache.read(context, [{}]).then((x) => x[0]);
        if (!result) {
            const res_ = func(context, input);
            cache.write(context, { data: [{ value: res_ }] });
            result = await res_;
        }
        return result;
    };
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
        invalidation?(invalidate: (context: C, input: I['_output']) => Promise<void>): void;
        getCache(input: I['_output']): CacheController<A>;
        getIds(input: I['_output']): string[];
        updateIds(input: I['_output'], info: { reqIds: string[]; ignoreIds: string[] }): I['_output'];
    }
): AsyncFunction.WrapperBuild<I, zRecord<O>, L, C> {
    function getIds(input: I['_output']) {
        const ids = behavior.getIds(input);
        return [...new Set(ids)];
    }
    behavior.invalidation?.(async function invalidate(context, input) {
        const cache = behavior.getCache(input);
        const ids = getIds(input);
        await cache.remove(
            context,
            ids.map((x) => ({ key: x }))
        );
    });
    return async function CacheMap(context, input, func) {
        const cache = behavior.getCache(input);
        const ids = getIds(input);
        const result = await cache
            .read(
                context,
                ids.map((x) => ({ key: x }))
            )
            .then((res) => bundleCached(ids, res));
        const info = (function () {
            const ret = { reqIds: ids.filter((id) => result[id] === null), ignoreIds: Object.keys(result) };
            if (!ret.reqIds.length) return null;
            return ret;
        })();
        if (info) {
            const res_ = func(context, behavior.updateIds(input, info));
            cache.write(context, { data: info.reqIds.map((x) => ({ key: x, value: res_.then((r) => r[x]) })) });
            Object.assign(result, await res_);
        }
        return result;
    };
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
        invalidation?(invalidate: (context: C, input: I['_output']) => Promise<void>): void;
        getCache(input: I['_output']): CacheController<A>;
        getIds(input: I['_output']): string[] | '*';
        updateIds(input: I['_output'], info: { reqIds: string[] | '*'; ignoreIds: string[] }): I['_output'];
    }
): AsyncFunction.WrapperBuild<I, zRecord<O>, L, C> {
    function getIds(input: I['_output']) {
        const ids = behavior.getIds(input);
        if (ids === '*') return ids;
        return [...new Set(ids)];
    }
    behavior.invalidation?.(async function invalidate(context, input) {
        const cache = behavior.getCache(input);
        const fields = getIds(input);
        if (fields === '*') {
            await cache.remove(context, [{}]);
        } else {
            await cache.remove(context, [{ fields: [...fields, '$'] }]);
        }
    });
    return async function CacheCollection(context, input, func) {
        const cache = behavior.getCache(input);
        const fields = getIds(input);
        if (Array.isArray(fields) && fields.includes('$')) throw new Error('id = [$] is reserved, use some other key!');
        const result = await cache.read(context, [{ fields: fields }]).then((x) => (x[0] ?? {}) as Record<string, unknown>);
        const info = (function () {
            if (fields === '*') {
                if (result.$ === '*') {
                    delete result.$;
                    return null;
                }
                return { reqIds: '*', ignoreIds: Object.keys(result) } as const;
            }
            const ret = { reqIds: fields.filter((id) => result[id] === undefined), ignoreIds: Object.keys(result) } as const;
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
        invalidation?(invalidate: (context: C, input: I['_output']) => Promise<void>): void;
        getCache(input: I['_output']): CacheController<A>;
        getIds(input: I['_output']): { id: string; subIds: string[] | '*' }[];
        updateIds(input: I['_output'], info: { id: string; reqSubIds: string[] | '*'; ignoreSubIds: string[] }[]): I['_output'];
    }
): AsyncFunction.WrapperBuild<I, zRecord<zRecord<O>>, L, C> {
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
    behavior.invalidation?.(async function invalidate(context, input) {
        const cache = behavior.getCache(input);
        const locs = getIds(input);
        cache.remove(context, [
            //
            ...locs.filter((x) => x.subIds === '*').map((x) => ({ key: x.id, fields: '*' }) as const),
            ...locs.filter((x) => x.subIds !== '*').map((x) => ({ key: x.id, fields: x.subIds }) as const),
        ]);
    });
    return async function CacheCollection(context, input, func) {
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
                const fields = x.subIds;
                if (fields === '*') {
                    if (res.$ === '*') {
                        delete res.$;
                        continue;
                    }
                    info.push({ id: x.id, reqSubIds: '*', ignoreSubIds: Object.keys(res) } as const);
                    continue;
                }
                const ret = { id: x.id, reqSubIds: fields.filter((id) => res[id] === undefined), ignoreSubIds: Object.keys(res) } as const;
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
}
