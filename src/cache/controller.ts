import { Context } from '../functions';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
type ExtendedFunc<P, R> = (context: Context, controller: CacheController, params: P) => R;
type Actions<T extends AbstractCacheClient> = { '*': boolean } & Partial<Record<keyof T, boolean>>;
export abstract class AbstractCacheClient {
    readonly name: string;
    constructor(name: string) {
        this.name = name;
    }
    abstract read(context: Context, params: { key: string; fields?: '*' | string[] }[]): Promise<unknown[]>;
    abstract write(
        context: Context,
        params: { data: { key: string; value?: unknown; hash?: Record<string, unknown> }[]; expire: number }
    ): Promise<void>;
    abstract remove(context: Context, params: { key: string; fields?: '*' | string[] }[]): Promise<void>;
}

export class CacheController<T extends AbstractCacheClient = AbstractCacheClient> {
    readonly separator;
    readonly defaultExpiry: number;
    readonly client: T;
    readonly prefix: string;
    readonly log: boolean;
    readonly allowed: Actions<T>;
    constructor(client: T, separator: string, defaultExpiry: number, prefix: string, allowed: Actions<T>, log: boolean) {
        this.client = client;
        this.separator = separator;
        this.defaultExpiry = defaultExpiry;
        this.prefix = prefix;
        this.allowed = allowed;
        this.log = log;
    }
    getKey(key: string) {
        return `${this.prefix}${this.separator}${key}`;
    }
    can(key: keyof T): boolean {
        return (this.allowed as never)[key] ?? this.allowed['*'];
    }

    /*******************************************/

    /* Builds */
    setDefaultExp(exp: number) {
        return new CacheController(this.client, this.separator, exp, this.prefix, this.allowed, this.log);
    }
    addPrefix(prefix: string) {
        return new CacheController(this.client, this.separator, this.defaultExpiry, this.getKey(prefix), this.allowed, this.log);
    }
    setLogging(opt: boolean) {
        return new CacheController(this.client, this.separator, this.defaultExpiry, this.prefix, this.allowed, opt);
    }
    setAllowance(opt: Omit<Actions<T>, '*'>) {
        return new CacheController(this.client, this.separator, this.defaultExpiry, this.prefix, Object.assign({}, this.allowed, opt), this.log);
    }

    /* Controllers */
    async read(context: Context, _params: { key?: string | number; fields?: '*' | string[] | number[] }[]): Promise<unknown[]> {
        if (!_params.length || !this.can('read')) return Array(_params.length).fill(null);
        const params = _params.map((x) => ({
            key: this.getKey(`${x.key ?? ''}`),
            fields: Array.isArray(x.fields) ? x.fields.map((x) => `${x}`) : x.fields,
        }));
        let error: unknown;
        const start = Date.now();
        const result = await this.client.read(context, params).catch((err) => {
            error = err;
            return Array(_params.length).fill(null);
        });
        const timeTaken = Date.now() - start;
        log: {
            const isErr = error !== undefined;
            if (!isErr && !this.log) break log;
            let query = `(${timeTaken} ms) 📖 ${this.client.name}.read()`;
            for (let i = 0; i < params.length; i++) {
                const x = params[i];
                if (x.fields === undefined) {
                    query += `\n\t.at(${x.key}): ${isErr ? '❌' : result[i] === null ? '∅' : '✅'}`;
                } else if (x.fields === '*') {
                    query += `\n\t.at(${x.key}, '*'): ${isErr ? '❌' : result[i] === null ? '∅' : '✅'}`;
                } else {
                    for (const field of x.fields) {
                        query += `\n\t.at(${x.key}, ${field}): ${isErr ? '❌' : result[i][field] === null ? '∅' : '✅'}`;
                    }
                }
            }
            context.log(query, ...(isErr ? [error] : []));
        }
        return result;
    }
    async write(
        context: Context,
        _params: { data: { key?: string | number; value?: unknown; hash?: Record<string | number, unknown> }[]; expire?: number }
    ): Promise<void> {
        if (!_params.data.length || !this.can('write')) return;
        const params = {
            data: _params.data.map((x) => ({
                key: this.getKey(`${x.key ?? ''}`),
                value: x.value,
                hash: x.hash as undefined | Record<string, unknown>,
            })),
            expire: _params.expire ?? this.defaultExpiry,
        };
        let error: unknown;
        const start = Date.now();
        await this.client.write(context, params).catch((err) => {
            error = err;
        });
        const timeTaken = Date.now() - start;
        log: {
            const isErr = error !== undefined;
            if (!isErr && !this.log) break log;
            let query = `(${timeTaken} ms) 🖊️ ${this.client.name}.write()`;
            for (let i = 0; i < params.data.length; i++) {
                const x = params.data[i];
                if (x.hash === undefined) {
                    query += `\n\t.at(${x.key}): ${isErr ? '❌' : '✅'}`;
                } else {
                    for (const field in x.hash) {
                        query += `\n\t.at(${x.key}, ${field}): ${isErr ? '❌' : '✅'}`;
                    }
                }
            }
            context.log(query, ...(isErr ? [error] : []));
        }
    }
    async remove(context: Context, _params: { key?: string | number; fields?: '*' | string[] | number[] }[]): Promise<void> {
        if (!_params.length || !this.can('remove')) return;
        const params = _params.map((x) => ({
            key: this.getKey(`${x.key ?? ''}`),
            fields: Array.isArray(x.fields) ? x.fields.map((x) => `${x}`) : x.fields,
        }));
        let error: unknown;
        const start = Date.now();
        await this.client.remove(context, params).catch((err) => {
            error = err;
        });
        const timeTaken = Date.now() - start;
        log: {
            const isErr = error !== undefined;
            if (!isErr && !this.log) break log;
            let query = `(${timeTaken} ms) 🗑️ ${this.client.name}.remove()`;
            for (let i = 0; i < params.length; i++) {
                const x = params[i];
                if (x.fields === undefined) {
                    query += `\n\t.at(${x.key}): ${isErr ? '❌' : '✅'}`;
                } else {
                    for (const field of x.fields) {
                        query += `\n\t.at(${x.key}, ${field}): ${isErr ? '❌' : '✅'}`;
                    }
                }
            }
            context.log(query, ...(isErr ? [error] : []));
        }
    }
    /* Extensions */
    run<K extends { [K in keyof T]: T[K] extends ExtendedFunc<Any, Any> ? K : never }[keyof T]>(
        context: Context,
        method: K,
        params: T[K] extends ExtendedFunc<infer P, Any> ? P : never
    ): T[K] extends ExtendedFunc<Any, infer R> ? R : never {
        return (this.client[method] as ExtendedFunc<unknown, unknown>)(context, this, params) as never;
    }
}
