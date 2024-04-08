/* eslint-disable @typescript-eslint/no-explicit-any */
export function getNestedKey(obj: any, path: string[]) {
    return path.reduce((acc, part) => acc && acc[part], obj);
}

export function setNestedKey(obj: any, path: string[], value: any): void {
    return (path.slice(0, path.length - 1).reduce((acc, part) => acc && acc[part], obj)[path[path.length - 1]] = value);
}

export function orderOnKey<R>({ ids, rows, key }: { ids: string[]; rows: (R | undefined)[]; key: string }): (R | undefined)[] {
    // Function to access nested object properties using a key path
    const path = key.split('.');

    // Create a map of rows keyed by the value at the specified key path
    const rowsMap = new Map(rows.filter((x) => x).map((row) => [getNestedKey(row, path), row]));

    // Map ids to rows, inserting undefined if the id does not have a corresponding row
    const orderedRows = ids.map((id) => rowsMap.get(id) || undefined);

    return orderedRows;
}

export function separateEmpty<R>({ ids, rows }: { ids: string[]; rows: (R | undefined)[] }): string[] {
    const empty = ids.filter((id, index) => {
        const row = rows[index];
        // Check for the row being undefined or an empty object
        return !row;
    });
    return empty;
}

export function bundle<R>({ ids, rows }: { ids: string[]; rows: (R | undefined)[] }): Record<string, R> {
    const res: Record<string, R> = {};
    for (let i = 0; i < ids.length; i++) {
        if (rows[i]) {
            res[ids[i]] = rows[i] as R;
        }
    }
    return res;
}

export function mapRowOnKey<R>({ rows, key }: { rows: (R | undefined)[]; key: string }): Record<string, R> {
    const result: Record<string, R> = {};
    const path = key.split('.');

    for (const row of rows) {
        if (row) {
            const keyValue = getNestedKey(row, path);
            if (keyValue !== undefined) {
                result[keyValue] = row as R;
            }
        }
    }

    return result;
}

export function bundleOnKey<R>({ rows, key }: { rows: (R | undefined)[]; key: string }): Record<string, R[]> {
    const result: Record<string, R[]> = {};
    const path = key.split('.');

    for (const row of rows) {
        if (row) {
            const keyValue = getNestedKey(row, path);
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

export function expandList<R>({ bundleRows }: { bundleRows: R[][] }): R[] {
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

export function sortOnKey<R>({ rows, key, mode }: { rows: R[]; key: string; mode: 'ASC' | 'DESC' }): R[] {
    if (rows.length < 2) return rows;
    const path = key.split('.');
    if (mode === 'ASC') {
        return rows
            .map((r) => ({ r, v: getNestedKey(r, path) }))
            .sort((a, b) => a.v - b.v)
            .map((x) => x.r);
    }
    if (mode === 'DESC') {
        return rows
            .map((r) => ({ r, v: getNestedKey(r, path) }))
            .sort((a, b) => b.v - a.v)
            .map((x) => x.r);
    }
    throw new Error('unimplemented mode found!');
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
