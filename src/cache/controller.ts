import { functions } from '..';
type Actions = { read: boolean; write: boolean; remove: boolean };

export abstract class AbstractCacheClient {
    abstract readonly name: string;

    abstract readM<T extends Record<never, never>>(context: functions.Context, params: { keys: string[] }): Promise<Partial<T>>;
    abstract readMHashField<T extends Record<never, never>>(
        context: functions.Context,
        params: { key: string; fields: '*' | string[] }
    ): Promise<Partial<T>>;

    abstract writeM<T extends Record<never, never>>(context: functions.Context, params: { keyValues: T; expire: number }): Promise<void>;
    abstract writeMHashField<T extends Record<never, never>>(
        context: functions.Context,
        params: { key: string; fieldValues: T; expire: number }
    ): Promise<void>;

    abstract removeM(context: functions.Context, params: { keys: string[] }): Promise<void>;
    abstract removeMHashField(context: functions.Context, params: { key: string; fields: string[] }): Promise<void>;
}

export class CacheController<T extends AbstractCacheClient> {
    readonly separator;
    readonly defaultExpiry: number;
    readonly client: T;
    readonly prefix: string;
    readonly log: Actions;
    readonly allowed: Actions;
    constructor(client: T, separator: string, defaultExpiry: number, prefix: string, allowed: Actions, log: Actions) {
        this.client = client;
        this.separator = separator;
        this.defaultExpiry = defaultExpiry;
        this.prefix = prefix;
        this.allowed = allowed;
        this.log = log;
    }
    getKey(key?: string | number) {
        return `${this.prefix}${this.separator}${key ?? ''}`;
    }

    /*******************************************/

    /* Builds */
    setDefaultExp(exp: number) {
        return new CacheController(this.client, this.separator, exp, this.prefix, this.allowed, this.log);
    }
    addPrefix(prefix: string) {
        return new CacheController(this.client, this.separator, this.defaultExpiry, this.getKey(prefix), this.allowed, this.log);
    }
    setLogging(opt: Partial<Actions> | boolean) {
        const log: Actions =
            typeof opt === 'boolean'
                ? {
                      read: opt,
                      write: opt,
                      remove: opt,
                  }
                : {
                      read: opt.read ?? this.log.read,
                      write: opt.read ?? this.log.write,
                      remove: opt.remove ?? this.log.remove,
                  };
        return new CacheController(this.client, this.separator, this.defaultExpiry, this.prefix, this.allowed, log);
    }
    setAllowance(opt: Partial<Actions> | boolean) {
        const allowed: Actions =
            typeof opt === 'boolean'
                ? {
                      read: opt,
                      write: opt,
                      remove: opt,
                  }
                : {
                      read: opt.read ?? this.allowed.read,
                      write: opt.read ?? this.allowed.write,
                      remove: opt.remove ?? this.allowed.remove,
                  };
        return new CacheController(this.client, this.separator, this.defaultExpiry, this.prefix, allowed, this.log);
    }

    /* Controllers */
    async readM<T extends Record<never, never>>(
        context: functions.Context,
        _params: { keys: string[]; key?: undefined } | { key: string; fields: string[] | '*' }
    ): Promise<Partial<T>> {
        const params = { ..._params };
        if (params.key !== undefined) {
            params.key = this.getKey(params.key);
            if (params.fields !== '*') {
                params.fields = params.fields.map((x) => `${x}`);
            }
        } else {
            params.keys = params.keys.map((key) => this.getKey(key));
        }
        read: try {
            if (!this.allowed.read) break read;
            let result: Partial<T>;
            if (params.key !== undefined) {
                if (!params.fields.length) break read;
                result = await this.client.readMHashField(context, params);
            } else {
                if (!params.keys.length) break read;
                result = await this.client.readM(context, params);
                const map = Object.fromEntries(params.keys.map((k, i) => [params.keys[i], (_params as { keys: string[] }).keys[i]]));
                result = Object.fromEntries(Object.keys(result).map((k) => [map[k], result[k as keyof T]])) as never;
            }
            if (this.log.read) {
                if (params.key !== undefined) {
                    if (params.fields === '*') {
                        context.log(`📖 ${this.client.name}.read(${params.key}):`, '✅');
                    } else {
                        for (const field of params.fields) {
                            context.log(`📖 ${this.client.name}.read(${params.key}, ${field}):`, result[field as never] ? '✅' : '∅');
                        }
                    }
                } else {
                    for (const key of params.keys) {
                        context.log(`📖 ${this.client.name}.read(${key}):`, result[key as never] ? '✅' : '∅');
                    }
                }
            }
            return result;
        } catch (err) {
            if (params.key !== undefined) {
                if (params.fields === '*') {
                    context.log(`⚠️ ${this.client.name}.read(${params.key}):`, '❌');
                } else {
                    for (const field of params.fields) {
                        context.log(`⚠️ ${this.client.name}.read(${params.key}, ${field}):`, '❌');
                    }
                }
            } else {
                for (const key of params.keys) {
                    context.log(`⚠️ ${this.client.name}.read(${key}):`, '❌');
                }
            }
            context.log('Error:', err);
        }
        return {} as never;
    }
    async writeM<T extends Record<never, never>>(
        context: functions.Context,
        _params: { keyValues: T; key?: undefined; expire?: number } | { key: string; fieldValues: T; expire?: number }
    ): Promise<void> {
        const params = { ..._params, expire: _params.expire ?? this.defaultExpiry };
        if (params.key !== undefined) {
            params.key = this.getKey(params.key);
        } else {
            params.keyValues = Object.fromEntries(
                Object.keys(params.keyValues).map((key) => [
                    //
                    this.getKey(key),
                    params.keyValues[key as keyof T],
                ])
            ) as never;
        }
        write: try {
            if (!this.allowed.write) break write;
            if (params.key !== undefined) {
                if (!Object.keys(params.fieldValues).length) break write;
                await this.client.writeMHashField(context, params);
            } else {
                if (!Object.keys(params.keyValues).length) break write;
                await this.client.writeM(context, params);
            }
            if (this.log.write) {
                if (params.key !== undefined) {
                    for (const field in params.fieldValues) {
                        context.log(`🖊️ ${this.client.name}.write(${params.key}, ${field}):`, '✅');
                    }
                } else {
                    for (const key in params.keyValues) {
                        context.log(`🖊️ ${this.client.name}.write(${key}):`, '✅');
                    }
                }
            }
        } catch (err) {
            if (params.key !== undefined) {
                for (const field in params.fieldValues) {
                    context.log(`⚠️ ${this.client.name}.write(${params.key}, ${field}):`, '❌');
                }
            } else {
                for (const key in params.keyValues) {
                    context.log(`⚠️ ${this.client.name}.write(${key}):`, '❌');
                }
            }
            context.log('Error:', err);
        }
    }
    async removeM(context: functions.Context, _params: { keys: string[]; key?: undefined } | { key: string; fields: string[] }): Promise<void> {
        const params = { ..._params };
        if (params.key !== undefined) {
            params.key = this.getKey(params.key);
            params.fields = params.fields.map((x) => `${x}`);
        } else {
            params.keys = params.keys.map((key) => this.getKey(key));
        }
        remove: try {
            if (!this.allowed.remove) break remove;
            if (params.key !== undefined) {
                if (!params.fields.length) break remove;
                await this.client.removeMHashField(context, params);
            } else {
                if (!params.keys.length) break remove;
                await this.client.removeM(context, params);
            }
            if (this.log.remove) {
                if (params.key !== undefined) {
                    for (const field of params.fields) {
                        context.log(`🗑️ ${this.client.name}.remove(${params.key}, ${field}):`, '✅');
                    }
                } else {
                    for (const key of params.keys) {
                        context.log(`🗑️ ${this.client.name}.remove(${key}):`, '✅');
                    }
                }
            }
        } catch (err) {
            if (params.key !== undefined) {
                for (const field of params.fields) {
                    context.log(`⚠️ ${this.client.name}.remove(${params.key}, ${field}):`, '❌');
                }
            } else {
                for (const key of params.keys) {
                    context.log(`⚠️ ${this.client.name}.remove(${key}):`, '❌');
                }
            }
            context.log('Error:', err);
        }
    }
}
