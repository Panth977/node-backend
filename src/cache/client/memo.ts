import { AbstractCacheClient } from '../controller';
import { Context } from '../../functions';

class HASH {
    readonly fields: Record<string, unknown> = {};
    static isHASH(val: unknown): val is HASH {
        return val instanceof HASH;
    }
}

export class MemoCacheClient extends AbstractCacheClient {
    readonly memo: Record<string, unknown> = {};
    readonly exp: Record<string, ReturnType<typeof setTimeout>> = {};
    readonly name = 'Memo';
    readonly needToAwait = false;
    constructor(memo: Record<string, unknown>) {
        super();
        this.memo = { ...memo };
    }
    async readM<T extends Record<never, never>>(context: Context, params: { keys: string[] }): Promise<Partial<T>> {
        const result = this.memo;
        return Object.fromEntries(params.keys.map((key) => [key, result[key] ?? null]).filter((x) => x[1] != null));
    }
    async readMHashField<T extends Record<never, never>>(context: Context, params: { key: string; fields: string[] | '*' }): Promise<Partial<T>> {
        const result = this.memo;
        const hash = result[params.key];
        if (!HASH.isHASH(hash)) throw new Error('Value not of Hash type');
        const hashResult = hash.fields;
        if (params.fields === '*') {
            return { ...hashResult } as never;
        }
        return Object.fromEntries(params.fields.map((field) => [field, hashResult[field] ?? null]).filter((x) => x[1] != null));
    }
    async writeM<T extends Record<never, never>>(context: Context, params: { keyValues: T; expire: number }): Promise<void> {
        const result = this.memo;
        if (params.expire) {
            for (const key in params.keyValues) {
                this.exp[key] ??= setTimeout(() => {
                    delete result[key];
                    delete this.exp[key];
                }, params.expire * 1000);
            }
        }
        Object.assign(result, params.keyValues);
    }
    async writeMHashField<T extends Record<never, never>>(context: Context, params: { key: string; fieldValues: T; expire: number }): Promise<void> {
        const result = this.memo;
        const hash = (result[params.key] ??= new HASH());
        if (!HASH.isHASH(hash)) throw new Error('Value not of Hash type');
        const hashResult = hash.fields;
        if (params.expire) {
            this.exp[params.key] ??= setTimeout(() => {
                delete result[params.key];
                delete this.exp[params.key];
            }, params.expire * 1000);
        }
        Object.assign(hashResult, params.fieldValues);
    }
    async removeM(context: Context, params: { keys: string[] }): Promise<void> {
        const result = this.memo;
        for (const key of params.keys) {
            delete result[key];
            delete this.exp[key];
        }
    }
    async removeMHashField(context: Context, params: { key: string; fields: string[] }): Promise<void> {
        const result = this.memo;
        const hash = result[params.key] ?? new HASH();
        if (!HASH.isHASH(hash)) throw new Error('Value not of Hash type');
        const hashResult = hash.fields;
        for (const key of params.fields) {
            delete hashResult[key];
        }
    }
}
