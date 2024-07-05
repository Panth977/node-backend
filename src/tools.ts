/* eslint-disable @typescript-eslint/no-explicit-any */
type KeyPath<T> = keyof T | (string & Record<never, never>);

export function orderOnKey<R>(ids: string[], rows: (R | undefined)[], key: KeyPath<R>): (R | undefined)[] {
    // Create a map of rows keyed by the value at the specified key path
    const rowsMap = new Map((rows as any[]).filter((x) => x).map((row) => [row[key], row]));

    // Map ids to rows, inserting undefined if the id does not have a corresponding row
    const orderedRows = ids.map((id) => rowsMap.get(id) || undefined);

    return orderedRows;
}

export function mapRowOnKey<R>(rows: (R | undefined)[], key: KeyPath<R>): Record<string, R> {
    const result: Record<string, R> = {};
    for (const row of rows) {
        if (row) {
            const keyValue = (row as any)[key];
            if (keyValue !== undefined) {
                result[keyValue] = row as R;
            }
        }
    }

    return result;
}

export function bundleOnKey<R>(rows: (R | undefined)[], key: KeyPath<R>): Record<string, R[]> {
    const result: Record<string, R[]> = {};

    for (const row of rows) {
        if (row) {
            const keyValue = (row as any)[key];
            if (keyValue !== undefined) {
                if (!result[keyValue]) {
                    result[keyValue] = [];
                }
                result[keyValue].push(row);
            }
        }
    }

    return result;
}

export function sortOnKey<R>(rows: R[], key: KeyPath<R>, mode: 'ASC' | 'DESC'): R[] {
    if (rows.length < 2) return rows;
    if (mode === 'ASC') {
        return rows
            .map((r) => ({ r, v: (r as any)[key] }))
            .sort((a, b) => a.v - b.v)
            .map((x) => x.r);
    }
    if (mode === 'DESC') {
        return rows
            .map((r) => ({ r, v: (r as any)[key] }))
            .sort((a, b) => b.v - a.v)
            .map((x) => x.r);
    }
    throw new Error('unimplemented mode found!');
}

export function undefinedKeysInRecord<R>(rows: Record<string, R>, keys: string[]): string[] {
    const notFoundKeys = [];
    for (const key of keys) {
        if (!rows[key]) {
            notFoundKeys.push(key);
        }
    }
    return notFoundKeys;
}

export function destructureSqlRows(rows: Record<string, unknown>[], split = '.'): Record<string, unknown>[] {
    const newRows = [];
    for (const row of rows) {
        const newRow = {};
        Object.entries(row).forEach(([key, value]) => {
            const parts = key.split(split);
            const lastKey = parts.pop() as string;
            let current: any = newRow;
            for (const key of parts) {
                current = current[key] ??= {};
            }
            current[lastKey] = value;
        });
        newRows.push(newRow);
    }
    return newRows;
}

type Prop<T, K> = K extends [infer K1 extends string, ...infer Ks extends string[]] ? (T extends { [k in K1]: infer V } ? Prop<V, Ks> : never) : T;
type KeyOf<T> = keyof T;
type ValueOf<T> = T[KeyOf<T>];
type Primitive = null | symbol | undefined | number | string | boolean | ((...arg: any[]) => any);
type KeyTree<T> = ValueOf<{ [k in KeyOf<T>]: T[k] extends Primitive ? [k] : [k] | [k, ...KeyTree<T[k]>] }>;
type _Join<A, S extends string> = A extends [infer E1 extends string | number, ...infer Es] ? `${E1}${S}${_Join<Es, S>}` : ``;
type Join<A, S extends string> = _Join<A, S> extends `${infer E}${S}` ? E : never;
type _Split<A, S extends string> = A extends `${infer E1}${S}${infer Es}` ? [E1, ..._Split<Es, S>] : [];
type Split<A, S extends string> = A extends string ? _Split<`${A}${S}`, S> : never;

export function getInnerProps<T, K extends Join<KeyTree<T>, '.'>>(obj: T, keyPath: K): Prop<T, Split<K, '.'>>;
export function getInnerProps<S extends string, T, K extends Join<KeyTree<T>, S>>(obj: T, keyPath: K, split: S): Prop<T, Split<K, S>>;
export function getInnerProps(obj: any, keyPath: string, split = '.') {
    const path = keyPath.split(split);
    return path.reduce<any>((acc, part) => acc && acc[part], obj);
}
export function setInnerProps<T, K extends Join<KeyTree<T>, '.'>>(obj: T, keyPath: K, value: Prop<T, Split<K, '.'>>): void;
export function setInnerProps<S extends string, T, K extends Join<KeyTree<T>, S>>(obj: T, keyPath: K, value: Prop<T, Split<K, S>>, split: S): void;
export function setInnerProps(obj: any, keyPath: string, value: any, split = '.') {
    const path = keyPath.split(split);
    path.slice(0, path.length - 1).reduce<any>((acc, part) => acc && acc[part], obj)[path[path.length - 1]] = value;
}
