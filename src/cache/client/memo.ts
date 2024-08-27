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
    constructor(memo: Record<string, unknown>) {
        super('Memo');
        this.memo = { ...memo };
    }
    async read(context: Context, params: { key: string; fields?: '*' | string[] }[]): Promise<unknown[]> {
        const result = this.memo;
        const ret = [];
        const errParams: typeof params = [];
        for (const x of params) {
            const val = result[x.key];
            if (x.fields === undefined && val instanceof HASH === false) {
                try {
                    ret.push(await val);
                } catch {
                    ret.push(null);
                    errParams.push(x);
                }
            } else if (x.fields && val instanceof HASH) {
                const fields: Record<string, unknown> = {};
                const errFields = [];
                for (const field of x.fields === '*' ? Object.keys(x.fields) : x.fields) {
                    try {
                        fields[field] = await val.fields[field];
                    } catch {
                        errFields.push(field);
                    }
                }
                if (errFields.length) errParams.push({ key: x.key, fields: errFields });
                ret.push(fields);
            } else {
                ret.push(null);
            }
        }
        if (errParams.length) this.remove(context, params);
        return ret;
    }
    async write(
        context: Context,
        params: { data: { key: string; value?: unknown; hash?: Record<string, unknown> }[]; expire: number }
    ): Promise<void> {
        const result = this.memo;
        for (const x of params.data) {
            if ((x.hash !== undefined && x.value !== undefined) || (x.value === undefined && x.hash === undefined)) {
                throw new Error('exactly one of [value, hash] must be provided');
            }
            if (x.value !== undefined) {
                if (this.exp[x.key]) clearTimeout(this.exp[x.key]);
                if (params.expire) {
                    this.exp[x.key] = setTimeout(() => {
                        delete result[x.key];
                        delete this.exp[x.key];
                    }, params.expire * 1000);
                }
                result[x.key] = x.value;
            } else if (x.hash) {
                if (result[x.key] instanceof HASH === false) {
                    result[x.key] = new HASH();
                    if (this.exp[x.key]) clearTimeout(this.exp[x.key]);
                    if (params.expire) {
                        this.exp[x.key] = setTimeout(() => {
                            delete result[x.key];
                            delete this.exp[x.key];
                        }, params.expire * 1000);
                    }
                }
                const val = result[x.key] as HASH;
                for (const field in x.hash) {
                    val.fields[field] = x.hash[field];
                }
            }
        }
    }
    async remove(context: Context, params: { key: string; fields?: '*' | string[] }[]): Promise<void> {
        const result = this.memo;
        for (const x of params) {
            const val = result[x.key];
            if (x.fields === undefined && val instanceof HASH === false) {
                delete result[x.key];
                if (this.exp[x.key]) clearTimeout(this.exp[x.key]);
                delete this.exp[x.key];
            } else if (x.fields === '*' && val instanceof HASH) {
                delete result[x.key];
                if (this.exp[x.key]) clearTimeout(this.exp[x.key]);
                delete this.exp[x.key];
            } else if (Array.isArray(x.fields) && val instanceof HASH) {
                for (const field of x.fields) {
                    delete val.fields[field];
                }
            }
        }
    }
}
