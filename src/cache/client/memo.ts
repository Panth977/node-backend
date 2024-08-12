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
        const ret: Record<string, unknown> = {};
        for (const key of params.keys) {
            if ((result[key] ?? null) !== null) {
                try {
                    ret[key] = await result[key];
                } catch {
                    delete result[key];
                    delete this.exp[key];
                }
            }
        }
        return ret as never;
    }
    async readMHashField<T extends Record<never, never>>(context: Context, params: { key: string; fields: string[] | '*' }): Promise<Partial<T>> {
        const result = this.memo;
        const hash = result[params.key];
        if (!HASH.isHASH(hash)) throw new Error('Value not of Hash type');
        const hashResult = hash.fields;
        if (params.fields === '*') params.fields = Object.keys(hashResult);
        const ret: Record<string, unknown> = {};
        for (const field of params.fields) {
            if ((hashResult[field] ?? null) !== null) {
                try {
                    ret[field] = await hashResult[field];
                } catch {
                    delete hashResult[field];
                }
            }
        }
        return ret as never;
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
