import { RedisClientType } from '@redis/client';
import { AsyncFunction, Context } from '../functions';
import { z } from 'zod';

function separateUncached<I extends string | number, V>(ids: I[], values: V[]): I[] {
    if (!values) return ids;
    const empty = ids.filter((id, index) => {
        const row = values[index];
        // Check for the row being undefined or an empty object
        return !row;
    });
    return empty;
}

function bundleCached<I extends string | number, V>(ids: I[], values: V[]): Record<I, V> {
    const res: Record<I, V> = {} as never;
    for (let i = 0; i < ids.length; i++) {
        if (values[i]) {
            res[ids[i]] = values[i];
        }
    }
    return res;
}

function tryJsonParser<T>(val: unknown): T {
    if (typeof val !== 'string') return (val ?? null) as never;
    try {
        return JSON.parse(val);
    } catch {
        return val as never;
    }
}

export class Cache {
    private getClient: () => Promise<RedisClientType>;
    private separator = ':';
    private prefix: string;
    private log: { read: boolean; write: boolean };
    private allowed: { read: boolean; write: boolean };
    private constructor(
        separator: string,
        getClient: () => Promise<RedisClientType>,
        prefix: string,
        allowed: { read: boolean; write: boolean },
        log: { read: boolean; write: boolean }
    ) {
        this.separator = separator;
        this.getClient = getClient;
        this.prefix = prefix;
        this.allowed = allowed;
        this.log = log;
    }
    static build(separator: string, getClient: () => Promise<RedisClientType>) {
        return new Cache(separator, getClient, '', { read: true, write: true }, { read: false, write: false });
    }
    private getKey(key?: string | number) {
        return `${this.prefix}${this.separator}${key ?? ''}`;
    }

    /* Builds */

    addPrefix(prefix: string) {
        return new Cache(this.separator, this.getClient, this.getKey(prefix), this.allowed, this.log);
    }
    setDebug({ read = this.log.read, write = this.log.write }: { read?: boolean; write?: boolean }) {
        return new Cache(this.separator, this.getClient, this.prefix, this.allowed, { read, write });
    }
    allow({ read = this.allowed.read, write = this.allowed.write }: { read?: boolean; write?: boolean }) {
        return new Cache(this.separator, this.getClient, this.prefix, { read, write }, this.log);
    }

    /* Read */

    async get<T>(context: Context, params: { key?: string | number } = {}): Promise<T | null> {
        if (this.allowed.read) {
            try {
                const key = this.getKey(params.key);
                //
                const client = await this.getClient();
                const result = await client.get(key);
                //
                if (this.log.read) {
                    context.logger.debug('Cache', { keys: { [key]: result ? '✅' : '❌' } });
                }
                return tryJsonParser(result);
            } catch (err) {
                context.logger.error('Redis Error', err);
            }
        }
        return null;
    }

    async getM<T>(context: Context, params: { keys?: (string | number)[] } = {}): Promise<(T | null)[]> {
        if (!params.keys?.length) return [];
        if (this.allowed.read) {
            try {
                const keys = params.keys.map((key) => this.getKey(key));
                //
                const client = await this.getClient();
                const result = await client.mGet(keys);
                //
                if (this.log.read) {
                    context.logger.debug('Cache', { keys: Object.assign({}, ...result.map((_, i) => ({ [keys[i]]: _ ? '✅' : '❌' }))) });
                }
                return result.map((x) => tryJsonParser(x));
            } catch (err) {
                context.logger.error('Redis Error', err);
            }
        }
        return Array(params.keys.length).fill(null);
    }

    async getHash<T extends Record<never, never>>(context: Context, params: { key?: string | number } = {}): Promise<T> {
        if (this.allowed.read) {
            try {
                const key = this.getKey(params.key);
                //
                const client = await this.getClient();
                const result = await client.hGetAll(key);
                //
                if (this.log.read) {
                    context.logger.debug('Cache', { keys: { [key]: result ? '✅' : '❌' } });
                }
                return Object.keys(result).reduce<T>((ret, k) => Object.assign(ret, { [k]: tryJsonParser(result[k]) }), {} as never);
            } catch (err) {
                context.logger.error('Redis Error', err);
            }
        }
        return {} as never;
    }

    async getHashField<T>(context: Context, params: { key?: string | number; field?: string | number } = {}): Promise<T | null> {
        if (this.allowed.read) {
            try {
                const key = this.getKey(params.key);
                const field = `${params.field ?? ''}`;
                //
                const client = await this.getClient();
                const result = await client.hGet(key, field);
                //
                if (this.log.read) {
                    context.logger.debug('Cache', { key, fields: { [field]: result ? '✅' : '❌' } });
                }
                return tryJsonParser(result);
            } catch (err) {
                context.logger.error('Redis Error', err);
            }
        }
        return null;
    }

    async getMHashField<T>(context: Context, params: { key?: string | number; fields?: (string | number)[] } = {}): Promise<(T | null)[]> {
        if (!params.fields?.length) return [];
        if (this.allowed.read) {
            try {
                const key = this.getKey(params.key);
                const fields = params.fields.map((x) => `${x}`);
                //
                const client = await this.getClient();
                const result = await client.hmGet(key, fields);
                //
                if (this.log.read) {
                    context.logger.debug('Cache', { key, fields: Object.assign({}, ...result.map((_, i) => ({ [fields[i]]: _ ? '✅' : '❌' }))) });
                }
                return result.map((x) => tryJsonParser(x));
            } catch (err) {
                context.logger.error('Redis Error', err);
            }
        }
        return Array(params.fields.length).fill(null);
    }

    /* Write */

    async delete(context: Context, params: { key?: string | number } = {}) {
        if (this.allowed.write) {
            try {
                const key = this.getKey(params.key);
                //
                const client = await this.getClient();
                await client.del(key);
                //
                if (this.log.write) {
                    context.logger.debug('Cache 🗑️', { keys: [key] });
                }
            } catch (err) {
                context.logger.error('Redis Error', err);
            }
        }
    }

    async increment(context: Context, params: { key?: string | number } = {}) {
        if (this.allowed.write) {
            try {
                const key = this.getKey(params.key);
                //
                const client = await this.getClient();
                await client.incr(key);
                //
                if (this.log.write) {
                    context.logger.debug('Cache ＋', { keys: [key] });
                }
            } catch (err) {
                context.logger.error('Redis Error', err);
            }
        }
    }

    async set<T>(context: Context, params: { key?: string | number; value: T; expire?: number }) {
        if (params.value === undefined) return;
        if (this.allowed.write) {
            try {
                const key = this.getKey(params.key);
                const value = JSON.stringify(params.value) as never;
                const expire = params.expire ?? 86400;
                //
                const client = await this.getClient();
                await client.set(key, value, expire ? { EX: expire } : undefined);
                //
                if (this.log.write) {
                    context.logger.debug('Cache 🖊️', { keys: [key] });
                }
            } catch (err) {
                context.logger.error('Redis Error', err);
            }
        }
    }

    async setM<T extends Record<never, never>>(context: Context, params: { bulk: T; expire?: number }) {
        if (params.bulk === undefined) return;
        const keys = (Object.keys(params.bulk) as never[]).filter((key) => params.bulk[key] !== undefined);
        if (!keys.length) return;
        if (this.allowed.write) {
            try {
                const bulk = keys.reduce((p, key) => Object.assign(p, { [this.getKey(key)]: JSON.stringify(params.bulk[key]) }), {});
                const expire = params.expire ?? 86400;
                //
                const client = await this.getClient();
                await client.mSet(bulk);
                await Promise.all(Object.keys(bulk).map((key) => client.expire(key, expire)));
                //
                if (this.log.write) {
                    context.logger.debug('Cache 🖊️', { keys: Object.keys(bulk) });
                }
            } catch (err) {
                context.logger.error('Redis Error', err);
            }
        }
    }

    async setHashField<T>(context: Context, params: { key?: string | number; field?: string | number; value: T; expire: number }) {
        if (params.value === undefined) return;
        if (this.allowed.write) {
            try {
                const key = this.getKey(params.key);
                const field = `${params.field ?? ''}`;
                const value = JSON.stringify(params.value);
                const expire = params.expire ?? 86400;
                //
                const client = await this.getClient();
                const exists = await client.exists(key);
                await client.hSet(key, field, value);
                if (!exists) await client.expire(key, expire);
                //
                if (this.log.write) {
                    context.logger.debug('Cache 🖊️', { key: key, fields: [field] });
                }
            } catch (err) {
                context.logger.error('Redis Error', err);
            }
        }
    }

    async setMHashField<T extends Record<never, never>>(context: Context, params: { key?: string | number; bulk: T; expire?: number }) {
        if (params.bulk === undefined) return;
        const fields = (Object.keys(params.bulk) as never[]).filter((key) => params.bulk[key] !== undefined);
        if (!fields.length) return;
        if (this.allowed.write) {
            try {
                const key = this.getKey(params.key);
                const bulk = fields.reduce((p, field) => Object.assign(p, { [field]: JSON.stringify(params.bulk[field]) }), {});
                const expire = params.expire ?? 86400;
                //
                const client = await this.getClient();
                const exists = await client.exists(key);
                await client.hSet(key, bulk);
                if (!exists) await client.expire(key, expire);
                //
                if (this.log.write) {
                    context.logger.debug('Cache 🖊️', { key, fields: Object.keys(bulk) });
                }
            } catch (err) {
                context.logger.error('Redis Error', err);
            }
        }
    }
}

export function CacheObject<
    //
    N extends string,
    I extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
>(
    params: AsyncFunction.Param<N, I, O, S, C>,
    behavior: {
        cache: Cache;
        addOpt(cache: Cache, input: I['_output']): Cache;
        expire: number;
    }
): AsyncFunction.WrapperBuild<N, I, O, S, C> {
    return async function CacheObject(context, input, func) {
        const cache = behavior.addOpt(behavior.cache, input);
        let result = await cache.get(context, {});
        if (!result) {
            const value = await func(context, input);
            cache.set(context, { value, expire: behavior.expire });
            result = value;
        }
        return result;
    };
}

export function CacheMap<
    //
    N extends string,
    I extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
    K extends string | number,
>(
    params: AsyncFunction.Param<N, I, O, S, C>,
    behavior: {
        cache: Cache;
        addOpt(cache: Cache, input: I['_output']): Cache;
        getKeys(input: I['_output']): K[];
        updateKeys(input: I['_output'], keys: K[]): I['_output'];
        expire: number;
    }
): AsyncFunction.WrapperBuild<N, I, O, S, C> {
    return async function CacheMap(context, input, func) {
        const cache = behavior.addOpt(behavior.cache, input);
        const keys = behavior.getKeys(input);
        const cached = await cache.getM(context, { keys });
        const result = bundleCached(keys, cached);
        const uncachedKeys = separateUncached(keys, cached);
        if (uncachedKeys.length) {
            const bulk = await func(context, behavior.updateKeys(input, uncachedKeys));
            cache.setM(context, { bulk, expire: behavior.expire });
            Object.assign(result, bulk);
        }
        return result;
    };
}
export function CacheCollection<
    //
    N extends string,
    I extends z.ZodType,
    O extends z.ZodType,
    S,
    C extends Context,
    K extends string | number,
>(
    params: AsyncFunction.Param<N, I, O, S, C>,
    behavior: {
        cache: Cache;
        addOpt(cache: Cache, input: I['_output']): Cache;
        getFields(input: I['_output']): K[] | '*';
        updateFields(input: I['_output'], reqKeys: K[], ignoreKeys: string[]): I['_output'];
        expire: number;
    }
): AsyncFunction.WrapperBuild<N, I, O, S, C> {
    return async function CacheCollection(context, input, func) {
        const cache = behavior.addOpt(behavior.cache, input);
        const fields = behavior.getFields(input);
        if (fields === '*') {
            const { $, ...result } = await cache.getHash<{ $?: '*' }>(context, {});
            if ($ !== '*') {
                const knownFields = Object.keys(result);
                const bulk = await func(context, behavior.updateFields(input, [], knownFields));
                cache.setMHashField(context, { bulk: { ...bulk, $: '*' }, expire: behavior.expire });
                Object.assign(result, bulk);
            }
            return result;
        }
        if (fields.includes('$' as K)) throw new Error('Field is not allowed to be [$]');
        const cached = await cache.getMHashField(context, { fields: fields });
        const uncachedFields = separateUncached(fields, cached);
        const result = bundleCached(fields, cached);
        if (uncachedFields.length) {
            const bulk = await func(context, behavior.updateFields(input, uncachedFields, []));
            cache.setMHashField(context, { bulk, expire: behavior.expire });
            Object.assign(result, bulk);
        }
        return result;
    };
}
