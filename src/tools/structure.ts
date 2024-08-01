import { DefaultSplitChar, getInnerProps, KeyPath } from './basic';

export function OneToOneRecord<
    //
    T,
    K extends KeyPath<T, S>,
    S extends string = DefaultSplitChar,
>(rows: (T | undefined)[], keyPath: K, split: S = '.' as never) {
    const result: Record<string, T> = {};
    for (const row of rows) {
        if (row) {
            const keyValue = getInnerProps(row as T, keyPath, split) as string | undefined;
            if (keyValue !== undefined) {
                result[keyValue] = row as T;
            }
        }
    }
    return result;
}

export function OneToManyRecord<
    //
    T,
    K extends KeyPath<T, S>,
    S extends string = DefaultSplitChar,
>(rows: (T | undefined)[], keyPath: K, split: S = '.' as never) {
    const result: Record<string, T[]> = {};
    for (const row of rows) {
        if (row) {
            const keyValue = getInnerProps(row as T, keyPath, split) as string | undefined;
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
