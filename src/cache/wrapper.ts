import { AsyncFunction, Context } from '../functions';
import { CacheController, AbstractCacheClient } from './controller';
import { z } from 'zod';

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
    behavior.invalidation?.(async function (context, input) {
        const cache = behavior.getCache(input);
        await cache.removeM(context, { keys: [''] });
    });
    return async function CacheObject(context, input, func) {
        const cache = behavior.getCache(input);
        let result = await cache.readM<{ '': O['_output'] }>(context, { keys: [''] }).then((x) => x['']);
        if (!result) {
            if (cache.client.needToAwait) {
                const value = await func(context, input);
                cache.writeM(context, { keyValues: { '': value } });
                result = value;
            } else {
                const value_ = func(context, input);
                cache.writeM(context, { keyValues: { '': value_ } });
                result = await value_;
            }
        }
        return result;
    };
}

export function CacheMap<
    //
    I extends z.ZodType,
    O extends z.ZodType,
    L,
    C extends Context,
    K extends string | number,
    A extends AbstractCacheClient,
>(
    params: AsyncFunction.Params<I, O, L, C>,
    behavior: {
        invalidation?(invalidate: (context: C, input: I['_output']) => Promise<void>): void;
        getCache(input: I['_output']): CacheController<A>;
        getKeys(input: I['_output']): K[];
        updateKeys(input: I['_output'], keys: K[]): I['_output'];
    }
): AsyncFunction.WrapperBuild<I, O, L, C> {
    behavior.invalidation?.(async function (context, input) {
        const cache = behavior.getCache(input);
        const keys = behavior.getKeys(input);
        await cache.removeM(context, { keys: keys as string[] });
    });
    return async function CacheMap(context, input, func) {
        const cache = behavior.getCache(input);
        const keys = behavior.getKeys(input);
        const result = await cache.readM<Record<K, unknown>>(context, { keys: keys as string[] });
        const uncachedKeys = keys.filter((id) => result[id] === undefined);
        if (uncachedKeys.length) {
            if (cache.client.needToAwait) {
                const bulk = await func(context, behavior.updateKeys(input, uncachedKeys));
                cache.writeM(context, { keyValues: bulk });
                Object.assign(result, bulk);
            } else {
                const bulk_ = func(context, behavior.updateKeys(input, uncachedKeys));
                cache.writeM(context, { keyValues: Object.fromEntries(uncachedKeys.map((x) => [x, bulk_.then((r) => r[x])])) });
                Object.assign(result, await bulk_);
            }
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
    K extends string | number,
    A extends AbstractCacheClient,
>(
    params: AsyncFunction.Params<I, O, L, C>,
    behavior: {
        invalidation?(invalidate: (context: C, input: I['_output']) => Promise<void>): void;
        getCache(input: I['_output']): CacheController<A>;
        getFields(input: I['_output']): K[] | '*';
        updateFields(input: I['_output'], reqKeys: K[], ignoreKeys: string[]): I['_output'];
    }
): AsyncFunction.WrapperBuild<I, O, L, C> {
    behavior.invalidation?.(async function (context, input) {
        const cache = behavior.getCache(input);
        const fields = behavior.getFields(input);
        if (fields === '*') {
            await cache.removeM(context, { keys: [''] });
        } else {
            await cache.removeM(context, { key: '', fields: [...(fields as string[]), '$'] });
        }
    });
    return async function CacheCollection(context, input, func) {
        const cache = behavior.getCache(input);
        const fields = behavior.getFields(input);
        if (fields === '*') {
            const { $, ...result } = await cache.readM<{ $?: '*' }>(context, { key: '', fields: '*' });
            if ($ !== '*') {
                const knownFields = Object.keys(result);
                const bulk = await func(context, behavior.updateFields(input, [], knownFields));
                cache.writeM(context, { key: '', fieldValues: { ...bulk, $: '*' } });
                Object.assign(result, bulk);
            }
            return result;
        }
        if (fields.includes('$' as K)) throw new Error('Field is not allowed to be [$]');
        const result = await cache.readM<Record<K, unknown>>(context, { key: '', fields: fields as string[] });
        const uncachedFields = fields.filter((id) => result[id] === undefined);
        if (uncachedFields.length) {
            if (cache.client.needToAwait) {
                const bulk = await func(context, behavior.updateFields(input, uncachedFields, []));
                cache.writeM(context, { key: '', fieldValues: bulk });
                Object.assign(result, bulk);
            } else {
                const bulk_ = func(context, behavior.updateFields(input, uncachedFields, []));
                cache.writeM(context, { key: '', fieldValues: Object.fromEntries(uncachedFields.map((x) => [x, bulk_.then((r) => r[x])])) });
                Object.assign(result, await bulk_);
            }
        }
        return result;
    };
}
