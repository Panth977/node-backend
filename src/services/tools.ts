/* eslint-disable @typescript-eslint/no-explicit-any */
type KeyPath<T> = keyof T | (string & Record<never, never>);
// export function getNestedKey(obj: any, path: string[]) {
//     return path.reduce((acc, part) => acc && acc[part], obj);
// }

// export function setNestedKey(obj: any, path: string[], value: any): void {
//     return (path.slice(0, path.length - 1).reduce((acc, part) => acc && acc[part], obj)[path[path.length - 1]] = value);
// }

export function orderOnKey<R>(ids: string[], rows: (R | undefined)[], key: KeyPath<R>): (R | undefined)[] {
    // Create a map of rows keyed by the value at the specified key path
    const rowsMap = new Map((rows as any[]).filter((x) => x).map((row) => [row[key], row]));

    // Map ids to rows, inserting undefined if the id does not have a corresponding row
    const orderedRows = ids.map((id) => rowsMap.get(id) || undefined);

    return orderedRows;
}

export function separateEmpty<R>(ids: string[], rows: (R | undefined)[]): string[] {
    const empty = ids.filter((id, index) => {
        const row = rows[index];
        // Check for the row being undefined or an empty object
        return !row;
    });
    return empty;
}

export function bundle<R>(ids: string[], rows: (R | undefined)[]): Record<string, R> {
    const res: Record<string, R> = {};
    for (let i = 0; i < ids.length; i++) {
        if (rows[i]) {
            res[ids[i]] = rows[i] as R;
        }
    }
    return res;
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

export function expandList<R>(bundleRows: R[][]): R[] {
    const result = [];

    for (const rows of bundleRows) {
        if (rows) {
            for (const row of rows) {
                if (row) {
                    result.push(row);
                }
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

export function destructureSqlRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
    const newRows = [];
    for (const row of rows) {
        const newRow = {};
        Object.entries(row).forEach(([key, value]) => {
            const parts = key.split('.');
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
