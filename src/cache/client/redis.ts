import { RedisClientType, RedisDefaultModules, RedisFunctions, RedisModules, RedisScripts } from 'redis';
import { AbstractCacheClient, CacheController } from '../controller';
import { Context } from '../../functions';

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

export class RedisCacheClient<
    M extends RedisModules = RedisDefaultModules,
    F extends RedisFunctions = Record<string, never>,
    S extends RedisScripts = Record<string, never>,
> extends AbstractCacheClient {
    readonly client: RedisClientType<M, F, S>;
    constructor(client: RedisClientType<M, F, S>) {
        super('Redis');
        this.client = client;
    }
    async read(context: Context, params: { key: string; fields?: string[] }[]): Promise<unknown[]> {
        const luaScript = `
        local result = {}
        for i, key in ipairs(KEYS) do
            local fields = cjson.decode(ARGV[i])
            local keyType = redis.call('type', key).ok
            if keyType == 'string' and not fields then
                table.insert(result, redis.call('get', key))
            elseif keyType == 'hash' and fields == "*" then
                table.insert(result, redis.call('hgetall', key))
            elseif keyType == 'hash' and fields and fields ~= "*" then
                local hashResult = {}
                for _, field in ipairs(fields) do
                    table.insert(hashResult, field)
                    table.insert(hashResult, redis.call('hget', key, field))
                end
                table.insert(result, hashResult)
            else
                table.insert(result, nil)
            end
        end
        return result
        `;
        const result = await this.client.eval(luaScript, {
            keys: params.map((p) => p.key),
            arguments: params.map((p) => JSON.stringify(p.fields || null)),
        });
        const values: unknown[] = [];
        for (const item of result as (string | string[])[]) {
            if (typeof item === 'string') {
                values.push(decode(item));
            } else if (Array.isArray(item)) {
                const obj: Record<string, string> = {};
                for (let i = 0; i < item.length; i += 2) {
                    obj[item[i]] = decode(item[i + 1]);
                }
                values.push(obj);
            } else {
                values.push(null);
            }
        }
        return values;
    }
    async write(
        context: Context,
        params: { data: { key: string; value?: unknown; hash?: Record<string, unknown> }[]; expire: number }
    ): Promise<void> {
        const luaScript = `
        for i, key in ipairs(KEYS) do
            local value = cjson.decode(ARGV[i])
            local expire = tonumber(ARGV[#KEYS + 1])
            local keyType = redis.call('type', key).ok

            if type(value) == "string" then
                if keyType ~= 'string' and keyType ~= 'none' then 
                    redis.call('del', key)
                end
                redis.call('set', key, value)
                if expire > 0 then
                    redis.call('expire', key, expire)
                end

            elseif type(value) == "table" then
                if keyType ~= 'hash' and keyType ~= 'none' then 
                    redis.call('del', key)
                end
                for field, fieldValue in pairs(value) do
                    redis.call('hset', key, field, fieldValue)
                end
                if expire > 0 then 
                    redis.call('expire', key, expire)
                end
            end
        end
        `;
        await this.client.eval(luaScript, {
            keys: params.data.map((p) => p.key),
            arguments: (
                await Promise.all(
                    params.data.map(async ({ hash, value }) => {
                        if ((hash !== undefined && value !== undefined) || (value === undefined && hash === undefined)) {
                            throw new Error('exactly one of [value, hash] must be provided');
                        }
                        if (value !== undefined) {
                            return encode(await value);
                        }
                        if (hash !== undefined) {
                            const fields: Record<string, string> = {};
                            for (const field in hash) {
                                fields[field] = encode(await hash[field]);
                            }
                            return JSON.stringify(fields);
                        }
                        throw new Error('Unimplemented!');
                    })
                )
            ).concat(params.expire.toString()),
        });
    }
    async remove(context: Context, params: { key: string; fields?: '*' | string[] }[]): Promise<void> {
        const luaScript = `
        for i, key in ipairs(KEYS) do
            local fields = cjson.decode(ARGV[i])
            local keyType = redis.call('type', key).ok
            if not fields and keyType == 'string' then
                redis.call('del', key)
            elseif fields == "*" and keyType == 'hash' then
                redis.call('del', key)
            elseif fields and keyType == 'hash' and fields ~= "*" then
                for _, field in ipairs(fields) do
                    redis.call('hdel', key, field)
                end
            end
        end
        `;
        await this.client.eval(luaScript, {
            keys: params.map((p) => p.key),
            arguments: params.map((p) => JSON.stringify(p.fields || null)),
        });
    }
    async increment(
        context: Context,
        controller: CacheController | null,
        params: { key: string; incrBy: number; maxLimit?: number; expiry?: number }
    ): Promise<{ allowed: boolean; value: number }> {
        if (controller) {
            if (controller.client !== this) throw new Error('Invalid usage of Controller!');
            params.key = controller.getKey(params.key);
            if (!controller.can('increment')) return { allowed: false, value: 0 };
        }
        if (controller && params.expiry === undefined) params.expiry = controller.defaultExpiry;
        const luaScript = `
        local key = KEYS[1]
        local incrBy = tonumber(ARGV[1])
        local maxLimit = tonumber(ARGV[2])
        local expirySec = tonumber(ARGV[3])
        local currentValue = tonumber(redis.call('GET', key) or '0')
        local allowed = 1
        if maxLimit and maxLimit > 0 and currentValue + incrBy > maxLimit then
            allowed = 0
        end
        if allowed == 1 then
            currentValue = redis.call('INCRBY', key, incrBy)
            if expirySec and expirySec > 0 then
                redis.call('EXPIRE', key, expirySec)
            end
        end
        return {allowed, currentValue}
        `;
        const result = await this.client.eval(luaScript, {
            keys: [params.key],
            arguments: [`${params.incrBy}`, `${params.maxLimit || 0}`, `${params.expiry || 0}`],
        });
        if (!Array.isArray(result) || result.length !== 2) throw new Error('Unexpected response from Redis script!');
        return { allowed: !!result[0], value: +(result[1] as string | number) };
    }
}
