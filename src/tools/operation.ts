import { DefaultSplitChar, getInnerProps, KeyPath } from './basic';

export function sort<
    //
    T,
    K extends KeyPath<T, S>,
    S extends string = DefaultSplitChar,
>(rows: T[], mode: 'ASC' | 'DESC', keyPath: K, split: S = '.' as never): T[] {
    if (rows.length < 2) return rows;
    if (mode === 'ASC') {
        return rows
            .map((r) => ({ r, v: getInnerProps(r as T, keyPath, split) as number }))
            .sort((a, b) => a.v - b.v)
            .map((x) => x.r);
    }
    if (mode === 'DESC') {
        return rows
            .map((r) => ({ r, v: getInnerProps(r as T, keyPath, split) as number }))
            .sort((a, b) => b.v - a.v)
            .map((x) => x.r);
    }
    throw new Error('unimplemented mode found!');
}

export function destructure(rows: Record<string, unknown>[], split = DefaultSplitChar): Record<string, unknown>[] {
    const newRows = [];
    for (const row of rows) {
        const newRow = {};
        Object.entries(row).forEach(([key, value]) => {
            const parts = key.split(split);
            const lastKey = parts.pop() as string;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
