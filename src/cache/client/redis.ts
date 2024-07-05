import { RedisClientType, RedisDefaultModules, RedisFunctions, RedisModules, RedisScripts } from 'redis';
import { Context } from '../../functions';
import { AbstractCacheClient } from '../controller';

function bundleCached<I extends string | number, V>(ids: I[], values: V[]): Record<I, V> {
    const res: Record<I, V> = {} as never;
    for (let i = 0; i < ids.length; i++) {
        if (values[i]) {
            res[ids[i]] = values[i];
        }
    }
    return res;
}

function decode<T>(val: unknown): T {
    if (typeof val !== 'string') return (val ?? null) as never;
    try {
        return JSON.parse(val);
    } catch {
        return val as never;
    }
}
function encode<T>(val: T): string {
    return JSON.stringify(val ?? null);
}
function map<I, O>(obj: Record<string, I>, fn: (input: I) => O) {
    return Object.fromEntries(Object.keys(obj).map((key) => [key, fn(obj[key])]));
}

export class RedisCacheClient<
    M extends RedisModules = RedisDefaultModules,
    F extends RedisFunctions = Record<string, never>,
    S extends RedisScripts = Record<string, never>,
> extends AbstractCacheClient {
    readonly client: RedisClientType<M, F, S>;
    readonly name = 'Redis';
    constructor(client: RedisClientType<M, F, S>) {
        super();
        this.client = client;
    }
    async readM<T extends Record<never, never>>(context: Context, params: { keys: string[] }): Promise<Partial<T>> {
        const result = await this.client.mGet(params.keys);
        return map(bundleCached(params.keys, result), decode) as never;
    }
    async readMHashField<T extends Record<never, never>>(context: Context, params: { key: string; fields: string[] | '*' }): Promise<Partial<T>> {
        if (params.fields === '*') {
            const result = await this.client.hGetAll(params.key);
            return map(result, decode) as never;
        }
        const result = await this.client.hmGet(params.key, params.fields);
        return map(bundleCached(params.fields, result), decode) as never;
    }
    async writeM<T extends Record<never, never>>(context: Context, params: { keyValues: T; expire: number }): Promise<void> {
        if (!params.expire) {
            await this.client.mSet(map(params.keyValues, encode));
            return;
        }
        const multi = this.client.multi();
        multi.mSet(map(params.keyValues, encode));
        for (const key in params.keyValues) {
            multi.expire(key, params.expire);
        }
        await multi.exec();
    }
    async writeMHashField<T extends Record<never, never>>(context: Context, params: { key: string; fieldValues: T; expire: number }): Promise<void> {
        if (!params.expire) {
            await this.client.hSet(params.key, map(params.fieldValues, encode));
            return;
        }
        const exists = await this.client.exists(params.key);
        await this.client.hSet(params.key, map(params.fieldValues, encode));
        if (!exists) this.client.expire(params.key, params.expire);
    }
    async removeM(context: Context, params: { keys: string[] }): Promise<void> {
        await this.client.del(params.keys);
    }
    async removeMHashField(context: Context, params: { key: string; fields: string[] }): Promise<void> {
        const exists = await this.client.exists(params.key);
        if (!exists) {
            return;
        }
        await this.client.hDel(params.key, params.fields);
    }
    async increment(context: Context, params: { key: string; incrBy: number; maxLimit?: number }): Promise<boolean> {
        if (params.maxLimit === undefined) {
            await this.client.incrBy(params.key, params.incrBy);
            return true;
        }
        const luaScript = `
local currentValue = tonumber(redis.call('GET', KEYS[1]) or '0')
if currentValue + tonumber(ARGV[1]) <= tonumber(ARGV[2]) then
    redis.call('INCRBY', KEYS[1], ARGV[1])
    return true
else
    return false
end
        `;
        // Execute the Lua script
        const isAllowed = await this.client.eval(luaScript, {
            keys: [params.key],
            arguments: [`${params.incrBy}`, `${params.maxLimit}`],
        });
        return !!isAllowed;
    }
}
