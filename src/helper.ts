type valof<T extends object> = T[keyof T];

export function foldArrayToMap<T extends object, K extends valof<{ [k in keyof T]: T[k] extends string ? k : never }>, O>(
    arr: T[],
    on: K,
    transform: (c: T) => O
) {
    const p: { [k: string]: O } = {};
    for (const c of arr) {
        p[c[on] as string] = transform(c);
    }
    return p;
}

export function mapMapValues<T extends object, O>(rec: Record<string, T>, transform: (c: T) => O) {
    const p: { [k: string]: O } = {};
    for (const k in rec) {
        p[k] = transform(rec[k]);
    }
    return p;
}
